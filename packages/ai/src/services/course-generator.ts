/**
 * Course Generator Service
 * Generates multi-lesson courses from documents using RAG and Agentic AI
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { AI_MODELS, normalizeLanguageCode, getLanguageNameForPrompt } from '@eduator/config'
import { generateLesson } from './lesson-generator'
import { generateLessonImagesWithUsage } from '../image-generator'
import { generateLessonAudioWithUsage } from '../tts-generator'
import {
  getParsedDocumentText
} from './document-rag'
import { questionGenerator } from './question-generator'
import { generateJSON } from '../gemini'
import type { 
  CourseGenerationRequest, 
  CourseGenerationResponse,
  CourseDifficultyLevel,
  CourseStyle,
  VisualGap,
  GenerationLogEntry
} from '@eduator/core/types/course'
import { lessonRepository } from '@eduator/db/repositories/lessons'
import { courseRepository } from '@eduator/db/repositories/courses'
import { examRepository } from '@eduator/db/repositories/exams'

// Utility to get API key
function getApiKey(): string {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_KEY || process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Missing GOOGLE_GENERATIVE_AI_KEY or GOOGLE_GEMINI_API_KEY environment variable')
  }
  return apiKey
}

// Get Gemini model
function getGeminiModel(modelName: string = AI_MODELS.LESSON) {
  const apiKey = getApiKey()
  const client = new GoogleGenerativeAI(apiKey)
  return client.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 8192,
    },
  })
}

/**
 * Truncate a string to a maximum length, adding ellipsis if truncated
 * Used to prevent database column overflow errors
 * Handles non-string inputs (objects, etc.) by converting them to string first
 */
function truncateString(input: unknown, maxLength: number): string {
  // Handle null/undefined
  if (input === null || input === undefined) return ''
  
  // Convert to string if not already a string (handles objects, numbers, etc.)
  let str: string
  if (typeof input === 'string') {
    str = input
  } else if (typeof input === 'object') {
    // If it's an object, try to extract a meaningful string
    // Check for common string-like properties
    const obj = input as Record<string, unknown>
    if (obj.title && typeof obj.title === 'string') {
      str = obj.title
    } else if (obj.name && typeof obj.name === 'string') {
      str = obj.name
    } else if (obj.text && typeof obj.text === 'string') {
      str = obj.text
    } else {
      // Last resort: stringify the object
      try {
        str = JSON.stringify(input)
      } catch {
        str = String(input)
      }
    }
  } else {
    str = String(input)
  }
  
  if (!str) return ''
  if (str.length <= maxLength) return str
  // Leave room for ellipsis
  return str.substring(0, maxLength - 3) + '...'
}

/**
 * Ensure a value is a string (for topics that may come as objects from AI)
 */
function ensureString(input: unknown): string {
  if (typeof input === 'string') return input
  if (input === null || input === undefined) return ''
  if (typeof input === 'object') {
    const obj = input as Record<string, unknown>
    // Try to extract meaningful text from object
    if (obj.title && typeof obj.title === 'string') return obj.title
    if (obj.name && typeof obj.name === 'string') return obj.name
    if (obj.topic && typeof obj.topic === 'string') return obj.topic
    if (obj.description && typeof obj.description === 'string') return obj.description
    // If it has multiple fields, join them
    const values = Object.values(obj).filter(v => typeof v === 'string')
    if (values.length > 0) return (values as string[]).join(' - ')
    try {
      return JSON.stringify(input)
    } catch {
      return String(input)
    }
  }
  return String(input)
}

// Safe JSON parse with enhanced error recovery
function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    if (!text || text.trim().length === 0) {
      console.error('[Course Generator] ❌ Empty response from AI')
      return fallback
    }
    
    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    let cleanText = jsonMatch ? jsonMatch[1].trim() : text.trim()
    
    // Remove markdown code block markers if still present
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7)
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3)
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3)
    }
    cleanText = cleanText.trim()
    
    // Try to find JSON object/array if not at start
    if (!cleanText.startsWith('{') && !cleanText.startsWith('[')) {
      const jsonObjectMatch = cleanText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
      if (jsonObjectMatch) {
        cleanText = jsonObjectMatch[1]
      }
    }
    
    // First attempt: direct parse
    try {
      return JSON.parse(cleanText) as T
    } catch (firstError) {
      // Try to fix common JSON issues
      let fixedText = cleanText
      
      // Fix trailing commas before closing braces/brackets
      fixedText = fixedText.replace(/,(\s*[}\]])/g, '$1')
      
      // Try to fix unterminated strings by finding the error position
      const errorMsg = firstError instanceof Error ? firstError.message : String(firstError)
      if (errorMsg.includes('Unterminated string')) {
        const positionMatch = errorMsg.match(/position (\d+)/)
        if (positionMatch) {
          const errorPos = parseInt(positionMatch[1])
          console.log(`[Course Generator] Attempting to fix unterminated string at position ${errorPos}`)
          
          // Try to find the opening quote before the error position
          let quotePos = -1
          for (let i = errorPos - 1; i >= Math.max(0, errorPos - 500); i--) {
            if (fixedText[i] === '"' && (i === 0 || fixedText[i - 1] !== '\\')) {
              quotePos = i
              break
            }
          }
          
          if (quotePos >= 0) {
            // Find the next structural character after error position
            const nextStructural = fixedText.substring(errorPos).search(/[,\[\]{}:]/)
            if (nextStructural > 0) {
              const insertPos = errorPos + nextStructural
              // Insert closing quote before the structural character
              fixedText = fixedText.slice(0, insertPos) + '"' + fixedText.slice(insertPos)
              console.log(`[Course Generator] Inserted closing quote at position ${insertPos}`)
            }
          }
        }
      }
      
      // Try parsing fixed version
      try {
        return JSON.parse(fixedText) as T
      } catch (secondError) {
        // Try to extract JSON-like content more aggressively
        console.error('[Course Generator] ❌ Failed to parse JSON after fixes:', secondError)
        console.error('[Course Generator] Response preview (first 1000 chars):', text.substring(0, 1000))
        console.error('[Course Generator] Response around error position (if available):', 
          errorMsg.includes('position') 
            ? text.substring(Math.max(0, parseInt(errorMsg.match(/position (\d+)/)?.[1] || '0') - 200), parseInt(errorMsg.match(/position (\d+)/)?.[1] || '1000') + 200)
            : 'N/A')
        console.error('[Course Generator] Full response length:', text.length)
        
        // Try to find and extract any JSON-like structure (more lenient)
        const jsonLikeMatch = text.match(/(\{[\s\S]{0,100000}\}|\[[\s\S]{0,100000}\])/)
        if (jsonLikeMatch) {
          try {
            console.log('[Course Generator] Attempting to parse extracted JSON-like content...')
            const extracted = jsonLikeMatch[1]
            // Try to fix the extracted JSON more aggressively
            let fixedExtracted = extracted
              .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
              .replace(/\n/g, '\\n') // Replace newlines with escaped newlines (heuristic)
            
            return JSON.parse(fixedExtracted) as T
          } catch (thirdError) {
            console.error('[Course Generator] ❌ All JSON parsing attempts failed')
            console.error('[Course Generator] Last error:', thirdError)
          }
        }
        
        return fallback
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[Course Generator] ❌ Unexpected error in safeJsonParse:', errorMsg)
    return fallback
  }
}

/**
 * Analyze documents and generate course structure (syllabus)
 */
async function generateCourseStructure(
  documentIds: string[],
  userId: string,
  numLessons: number,
  difficultyLevel: CourseDifficultyLevel,
  language: string,
  courseStyle: CourseStyle,
  topic?: string,
  lessonTopics?: string[]
): Promise<{
  title: string
  description: string
  topics: Array<{ title: string; order: number; topic: string }>
  visualGaps: VisualGap[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}> {
  // Get all document texts
  const documentTexts: Array<{ id: string; text: string }> = []
  
  for (const docId of documentIds) {
    try {
      const text = await getParsedDocumentText(docId, userId, false)
      if (text) {
        documentTexts.push({ id: docId, text })
      }
    } catch (error) {
      console.error(`Failed to get text for document ${docId}:`, error)
    }
  }
  
  if (documentTexts.length === 0) {
    throw new Error('No document text could be extracted')
  }

  // Include content from ALL documents so the course structure covers every subject (e.g. Math, Biology, Physics, Chemistry)
  const charsPerDoc = Math.max(3000, Math.floor(15000 / documentTexts.length))
  const sampleChunks = documentTexts
    .map((doc, i) => `=== DOCUMENT ${i + 1} (id: ${doc.id}) ===\n${doc.text.substring(0, charsPerDoc).trim()}\n`)
    .join('\n')
  
  // Map difficulty level to description
  const difficultyMap: Record<CourseDifficultyLevel, string> = {
    grade_1: 'Grade 1 (Elementary, ages 6-7)',
    grade_2: 'Grade 2 (Elementary, ages 7-8)',
    grade_3: 'Grade 3 (Elementary, ages 8-9)',
    grade_4: 'Grade 4 (Elementary, ages 9-10)',
    grade_5: 'Grade 5 (Elementary, ages 10-11)',
    grade_6: 'Grade 6 (Middle School, ages 11-12)',
    grade_7: 'Grade 7 (Middle School, ages 12-13)',
    grade_8: 'Grade 8 (Middle School, ages 13-14)',
    grade_9: 'Grade 9 (High School, ages 14-15)',
    grade_10: 'Grade 10 (High School, ages 15-16)',
    grade_11: 'Grade 11 (High School, ages 16-17)',
    grade_12: 'Grade 12 (High School, ages 17-18)',
    undergraduate: 'Undergraduate (College/University)',
    graduate: 'Graduate (Master\'s level)',
    phd: 'PhD (Doctoral level)',
  }
  
  const styleMap: Record<CourseStyle, string> = {
    serious_academic: 'Serious and Academic - formal tone, structured, traditional pedagogy',
    fun_gamified: 'Fun and Gamified - engaging, interactive, game-like elements, rewards',
  }
  
  const model = getGeminiModel()
  
  const topicInstruction = topic 
    ? `\n\nIMPORTANT: Focus the course specifically on the topic "${topic}". Extract and organize content related to this topic only. Ignore unrelated information from the documents.`
    : ''
  
  const lessonTopicsInstruction = lessonTopics && lessonTopics.length > 0 && lessonTopics.some(t => t.trim())
    ? `\n\nLESSON TOPICS PROVIDED BY USER:\n${lessonTopics.map((t, i) => `Lesson ${i + 1}: ${t.trim() || '(Auto-generate)'}`).join('\n')}\n\nIMPORTANT: Use these exact lesson topics/names when generating the course structure. Generate content for each lesson based on the provided topic name. If a topic is empty, generate an appropriate topic based on the document content.`
    : ''
  
  const prompt = `As an Agentic AI Architect, analyze ALL ${documentTexts.length} uploaded documents below and construct a comprehensive course structure consisting of ${numLessons} lessons.

CRITICAL: You must use content from ALL documents. Each document may be a different subject (e.g. Mathematics, Biology, Physics, Chemistry). Generate exactly ${numLessons} lessons so that each lesson is primarily based on a DIFFERENT document when possible (lesson 1 from document 1, lesson 2 from document 2, etc.). Do not base all lessons on only the first document.

DOCUMENTS CONTENT (one block per document):
${sampleChunks}${topicInstruction}${lessonTopicsInstruction}

SPECIFIC REQUIREMENTS:

1. Adaptive Leveling: Tailor the complexity for ${difficultyMap[difficultyLevel]}. Adjust vocabulary, depth, and examples accordingly.

2. Automatic Pedagogy: Include a mix of:
   - Core theory and concepts
   - Real-world applications
   - Critical thinking exercises
   - Practical examples

3. Localization: Generate the entire course structure in ${language}, ensuring cultural and technical accuracy.

4. Course Style: ${styleMap[courseStyle]}

5. Lesson Structure: Each lesson should:
   - Build on previous lessons (progressive learning)
   - Have clear learning objectives
   - Include assessment opportunities
   - Be self-contained but connected

6. Visual Gap Detection: Identify lessons that would benefit from:
   - Video explanations (complex processes, demonstrations)
   - Interactive images (diagrams, visualizations)
   - Visual aids (charts, graphs, illustrations)

7. Writing Quality (STRICT):
   - Use professional, educator-grade language suitable for real classrooms.
   - Keep titles/descriptions concise and meaningful; avoid generic filler.
   - Do NOT use source-referencing filler text in output fields (e.g., "according to the text", "the document states", "Mətndə ... qeyd olunur ki", "в тексте сказано").
   - Do NOT add meta-commentary about generation limits or document limitations in title/description/topics.

Return ONLY a JSON object with this exact structure:
{
  "title": "Course title in ${language}",
  "description": "Course description in ${language}",
  "topics": [
    {
      "title": "Lesson 1 title in ${language}",
      "order": 1,
      "topic": "Specific topic/subject for this lesson"
    }
  ],
  "visual_gaps": [
    {
      "lesson_order": 3,
      "reason": "This lesson covers complex mathematical concepts that would benefit from visual diagrams",
      "suggested_content_type": "image",
      "priority": "high"
    }
  ]
}

Generate the course structure now. 

CRITICAL: Return ONLY valid JSON. The response must:
- Start with { and end with }
- Have all strings properly escaped (use \\n for newlines, \\" for quotes)
- No trailing commas
- No comments
- All special characters in strings must be escaped
- Return ONLY the JSON object, no markdown, no code blocks, no explanatory text.`

  try {
    // Use generateJSON for better JSON handling, with fallback to manual parsing
    let result: {
      title: string
      description: string
      topics: Array<{ title: string; order: number; topic: string }>
      visual_gaps?: Array<{
        lesson_order: number
        reason: string
        suggested_content_type: 'video' | 'image' | 'interactive'
        priority: 'high' | 'medium' | 'low'
      }>
    }
    
    let structureUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    try {
      // Try using generateJSON first (better structured output)
      const jsonResult = await generateJSON<{
        title: string
        description: string
        topics: Array<{ title: string; order: number; topic: string }>
        visual_gaps?: Array<{
          lesson_order: number
          reason: string
          suggested_content_type: 'video' | 'image' | 'interactive'
          priority: 'high' | 'medium' | 'low'
        }>
      }>(prompt, { model: 'pro' })
      result = jsonResult.data
      structureUsage = {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: jsonResult.tokensUsed ?? 0,
      }
    } catch (jsonError) {
      // Fallback to manual generation with enhanced error recovery
      console.warn('[Course Generator] generateJSON failed, falling back to generateContent:', jsonError)
      const response = await model.generateContent(prompt)
      const text = response.response?.text() || '{}'
      const usage = (response.response as unknown as {
        usageMetadata?: {
          promptTokenCount?: number
          candidatesTokenCount?: number
          totalTokenCount?: number
        }
      }).usageMetadata
      structureUsage = {
        prompt_tokens: usage?.promptTokenCount ?? 0,
        completion_tokens: usage?.candidatesTokenCount ?? 0,
        total_tokens:
          usage?.totalTokenCount ??
          (usage?.promptTokenCount ?? 0) + (usage?.candidatesTokenCount ?? 0),
      }
      
      result = safeJsonParse<{
        title: string
        description: string
        topics: Array<{ title: string; order: number; topic: string }>
        visual_gaps?: Array<{
          lesson_order: number
          reason: string
          suggested_content_type: 'video' | 'image' | 'interactive'
          priority: 'high' | 'medium' | 'low'
        }>
      }>(text, {
        title: 'Generated Course',
        description: 'A comprehensive course generated from documents',
        topics: [],
        visual_gaps: [],
      })
    }
    
    // Use provided lesson topics if available, otherwise use AI-generated or fill in
    if (lessonTopics && lessonTopics.length > 0 && lessonTopics.some(t => t.trim())) {
      // Override topics with user-provided lesson topics
      // Use AI-generated structure but replace titles/topics with user-provided ones
      result.topics = lessonTopics.map((userTopic, index) => {
        const aiTopic = result.topics[index] || { title: '', topic: '' }
        return {
          title: userTopic.trim() || aiTopic.title || `Lesson ${index + 1}`,
          order: index + 1,
          topic: userTopic.trim() || aiTopic.topic || `Topic ${index + 1}`,
        }
      })
      // Ensure we have exactly numLessons topics
      while (result.topics.length < numLessons) {
        const index = result.topics.length
        result.topics.push({
          title: `Lesson ${index + 1}`,
          order: index + 1,
          topic: `Topic ${index + 1}`,
        })
      }
      result.topics = result.topics.slice(0, numLessons)
    } else {
      // Ensure we have the right number of topics
      if (result.topics.length < numLessons) {
        // Generate additional topics
        for (let i = result.topics.length + 1; i <= numLessons; i++) {
          result.topics.push({
            title: `Lesson ${i}`,
            order: i,
            topic: `Topic ${i}`,
          })
        }
      } else if (result.topics.length > numLessons) {
        result.topics = result.topics.slice(0, numLessons)
      }
    }
    
    // Convert visual gaps to proper format
    const visualGaps: VisualGap[] = (result.visual_gaps || []).map((gap) => {
      const lesson = result.topics.find(t => t.order === gap.lesson_order)
      return {
        lesson_id: '', // Will be filled after lesson creation
        lesson_title: lesson?.title || `Lesson ${gap.lesson_order}`,
        reason: gap.reason,
        suggested_content_type: gap.suggested_content_type,
        priority: gap.priority,
      }
    })
    
    return {
      title: result.title,
      description: result.description,
      topics: result.topics,
      visualGaps,
      usage: structureUsage,
    }
  } catch (error) {
    console.error('Error generating course structure:', error)
    throw new Error(
      error instanceof Error
        ? `Failed to generate course structure: ${error.message}`
        : 'Failed to generate course structure'
    )
  }
}

/**
 * Generate a complete course with multiple lessons
 */
export async function generateCourse(
  request: CourseGenerationRequest,
  userId: string,
  organizationId: string
): Promise<CourseGenerationResponse> {
  const startTime = Date.now()
  const generationLog: GenerationLogEntry[] = []
  const usageTotals = {
    input_tokens: 0,
    output_tokens: 0,
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    course_structure_tokens: 0,
    lesson_text_tokens: 0,
    lesson_image_tokens: 0,
    lesson_tts_tokens: 0,
    exam_tokens: 0,
  }

  function logStep(entry: Omit<GenerationLogEntry, 'ts'>) {
    generationLog.push({ ...entry, ts: Date.now() })
  }

  // Universal: store and pass 2-letter code everywhere; use full name only for AI prompts
  const languageCode = normalizeLanguageCode(request.language) || 'en'
  const languageName = getLanguageNameForPrompt(languageCode)

  try {
    // Step 1: Generate course structure (prompt needs full language name)
    const structureStart = Date.now()
    console.log('[Course Generator] Generating course structure...')
    const structure = await generateCourseStructure(
      request.document_ids,
      userId,
      request.num_lessons,
      request.difficulty_level,
      languageName,
      request.course_style,
      request.topic,
      request.lesson_topics
    )
    usageTotals.input_tokens += structure.usage.prompt_tokens
    usageTotals.output_tokens += structure.usage.completion_tokens
    usageTotals.prompt_tokens += structure.usage.prompt_tokens
    usageTotals.completion_tokens += structure.usage.completion_tokens
    usageTotals.total_tokens += structure.usage.total_tokens
    usageTotals.course_structure_tokens += structure.usage.total_tokens
    logStep({ step: 'course_structure', duration_ms: Date.now() - structureStart, success: true, message: `Generated ${structure.topics.length} topics` })

    // Step 2: Create course record (store 2-letter code)
    const courseRecordStart = Date.now()
    console.log('[Course Generator] Creating course record...')
    const course = await courseRepository.create({
      organization_id: organizationId,
      created_by: userId,
      title: structure.title,
      description: structure.description,
      subject: request.subject,
      grade_level: request.grade_level,
      difficulty_level: request.difficulty_level,
      language: languageCode,
      course_style: request.course_style,
      lesson_ids: [],
      metadata: {
        source_documents: request.document_ids,
        ai_model_used: AI_MODELS.LESSON,
      },
    })
    logStep({ step: 'course_record', duration_ms: Date.now() - courseRecordStart, success: true, message: course.id })

    // Use the course's stored language for all lessons so flag and filters stay correct (never use a different default)
    const lessonLanguage = normalizeLanguageCode(course.language || languageCode) || 'en'
    const lessonLanguageName = getLanguageNameForPrompt(lessonLanguage)

    // Step 3: Generate each lesson
    console.log('[Course Generator] Generating lessons...')
    const lessonIds: string[] = []
    const generatedLessons: Array<{ id: string; title: string; order: number; topic: string }> = []
    const audioPromises: Array<{ order: number; lessonId: string; p: Promise<string | null> }> = []
    const imagePromises: Array<{ order: number; lessonId: string; p: Promise<unknown> }> = []

    for (const topicInfo of structure.topics) {
      const lessonLoopStart = Date.now()
      try {
        // Ensure topic is a string (AI sometimes returns objects)
        const topicString = ensureString(topicInfo.topic)
        const titleString = ensureString(topicInfo.title)

        // Map lesson order to document: lesson 1 → doc 1, lesson 2 → doc 2, etc. (round-robin if more lessons than docs)
        const docIndex = (topicInfo.order - 1) % request.document_ids.length
        const documentId = request.document_ids[docIndex]
        console.log(`[Course Generator] Generating lesson ${topicInfo.order}: ${titleString} (using document ${docIndex + 1}/${request.document_ids.length}, id: ${documentId})`)

        // Generate lesson without images in request path to avoid timeout; images are generated in background when requested
        const lessonOpts = request.lesson_generation_options ?? {}
        const includeImages = lessonOpts.includeImages !== false
        const contentOptions = {
          includeTables: lessonOpts.includeTables !== false,
          includeFigures: lessonOpts.includeFigures === true,
          includeCharts: lessonOpts.includeCharts === true,
          contentLength: lessonOpts.contentLength ?? 'medium',
        }
        const generatedLesson = await generateLesson(
          documentId,
          topicString || titleString, // Use topic string, fallback to title
          userId,
          lessonLanguage, // use course's language so content and DB stay in sync
          false, // never wait for images during course generation
          undefined, // lessonId - will be set when creating record
          contentOptions
        )
        if (generatedLesson.usage) {
          usageTotals.input_tokens += generatedLesson.usage.input_tokens ?? 0
          usageTotals.output_tokens += generatedLesson.usage.output_tokens ?? 0
          usageTotals.prompt_tokens += generatedLesson.usage.prompt_tokens ?? 0
          usageTotals.completion_tokens += generatedLesson.usage.completion_tokens ?? 0
          usageTotals.total_tokens += generatedLesson.usage.total_tokens ?? 0
          usageTotals.lesson_text_tokens += generatedLesson.usage.total_tokens ?? 0
        }
        
        // Create lesson record
        // Truncate title and description to fit database column limits (varchar(200) and varchar(500))
        const lessonId = typeof crypto !== 'undefined' && crypto.randomUUID 
          ? crypto.randomUUID() 
          : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const truncatedTitle = truncateString(generatedLesson.title || titleString, 200)
        const truncatedDescription = truncateString(`Lesson ${topicInfo.order} of the course`, 500)
        const truncatedTopic = truncateString(topicString || titleString, 200)
        
        const lesson = await lessonRepository.create({
          id: lessonId,
          organization_id: organizationId,
          created_by: userId,
          document_id: documentId,
          title: truncatedTitle,
          description: truncatedDescription,
          subject: request.subject,
          grade_level: request.grade_level,
          topic: truncatedTopic,
          duration_minutes: generatedLesson.duration_minutes,
          content: { text: generatedLesson.content },
          learning_objectives: Array.isArray(generatedLesson.learning_objectives) ? generatedLesson.learning_objectives : [],
          prerequisites: topicInfo.order > 1 ? [generatedLessons[generatedLessons.length - 1]?.id].filter(Boolean) : [],
          materials: [],
          images: [],
          mini_test: generatedLesson.mini_test,
          is_published: false,
          language: lessonLanguage,
          course_generated: 1,
          metadata: {
            from_course_id: course.id,
            course_title: structure.title,
            language: lessonLanguage,
            generation_options: {
              includeImages,
              includeAudio: lessonOpts.includeAudio !== false,
              centerText: lessonOpts.centerText !== false,
              includeTables: contentOptions.includeTables,
              includeFigures: contentOptions.includeFigures,
              includeCharts: contentOptions.includeCharts,
              contentLength: contentOptions.contentLength,
            },
          },
        })
        
        lessonIds.push(lesson.id)
        generatedLessons.push({
          id: lesson.id,
          title: lesson.title,
          order: topicInfo.order,
          topic: topicInfo.topic,
        })

        // Generate TTS audio when includeAudio is enabled (promise collected for logging)
        const includeAudio = request.lesson_generation_options?.includeAudio !== false
        if (includeAudio) {
          try {
            const lessonContent = typeof lesson.content === 'object' && lesson.content && 'text' in lesson.content
              ? (lesson.content as { text: string }).text
              : typeof lesson.content === 'string'
                ? lesson.content
                : ''

            if (lessonContent) {
              const audioPromise = generateLessonAudioWithUsage(lesson.id, lesson.title, lessonContent, lessonLanguage)
                .then(async ({ audioUrl, usage }) => {
                  if (usage) {
                    usageTotals.input_tokens += usage.prompt_tokens ?? 0
                    usageTotals.output_tokens += usage.completion_tokens ?? 0
                    usageTotals.prompt_tokens += usage.prompt_tokens ?? 0
                    usageTotals.completion_tokens += usage.completion_tokens ?? 0
                    usageTotals.total_tokens += usage.total_tokens ?? 0
                    usageTotals.lesson_tts_tokens += usage.total_tokens ?? 0
                  }
                  if (audioUrl) {
                    await lessonRepository.updateAudioUrl(lesson.id, audioUrl)
                    console.log(`[Course Generator] ✅ Audio generated for lesson ${topicInfo.order}`)
                  }
                  return audioUrl
                })
              audioPromises.push({ order: topicInfo.order, lessonId: lesson.id, p: audioPromise })
            }
          } catch (audioError) {
            console.error(`[Course Generator] Failed to import/start audio generation for lesson ${topicInfo.order}:`, audioError)
            logStep({ step: 'lesson_audio', lesson_index: topicInfo.order, lesson_id: lesson.id, success: false, error: String(audioError) })
          }
        }

        // Generate lesson images when requested (promise collected for logging)
        if (includeImages && generatedLesson.content) {
          const imagePromise = generateLessonImagesWithUsage(
            topicString || titleString,
            generatedLesson.content,
            3,
            lessonLanguageName,
            lesson.id
          ).then(async ({ images, usage }) => {
            if (usage) {
              usageTotals.input_tokens += usage.prompt_tokens ?? 0
              usageTotals.output_tokens += usage.completion_tokens ?? 0
              usageTotals.prompt_tokens += usage.prompt_tokens ?? 0
              usageTotals.completion_tokens += usage.completion_tokens ?? 0
              usageTotals.total_tokens += usage.total_tokens ?? 0
              usageTotals.lesson_image_tokens += usage.total_tokens ?? 0
            }
            if (images.length > 0) {
              await lessonRepository.update(lesson.id, userId, { images })
              console.log(`[Course Generator] ✅ Images generated for lesson ${topicInfo.order}`)
            }
            return images
          })
          imagePromises.push({ order: topicInfo.order, lessonId: lesson.id, p: imagePromise })
        }

        logStep({ step: 'lesson_content', lesson_index: topicInfo.order, lesson_id: lesson.id, duration_ms: Date.now() - lessonLoopStart, success: true, message: titleString })
      } catch (error) {
        console.error(`[Course Generator] Failed to generate lesson ${topicInfo.order}:`, error)
        logStep({ step: 'lesson_content', lesson_index: topicInfo.order, duration_ms: Date.now() - lessonLoopStart, success: false, error: error instanceof Error ? error.message : String(error) })
      }
    }

    // Await all audio and image tasks and log outcomes
    const audioResults = await Promise.allSettled(audioPromises.map(({ p }) => p))
    audioPromises.forEach(({ order, lessonId }, i) => {
      const result = audioResults[i]
      if (result?.status === 'fulfilled') {
        logStep({ step: 'lesson_audio', lesson_index: order, lesson_id: lessonId, success: !!result.value, message: result.value ? 'Audio URL saved' : 'No audio returned' })
      } else {
        logStep({ step: 'lesson_audio', lesson_index: order, lesson_id: lessonId, success: false, error: result?.status === 'rejected' ? String(result.reason) : 'Unknown' })
      }
    })
    const imageResults = await Promise.allSettled(imagePromises.map(({ p }) => p))
    imagePromises.forEach(({ order, lessonId }, i) => {
      const result = imageResults[i]
      if (result?.status === 'fulfilled') {
        const count = Array.isArray(result.value) ? result.value.length : 0
        logStep({ step: 'lesson_images', lesson_index: order, lesson_id: lessonId, success: true, message: `${count} image(s)` })
      } else {
        logStep({ step: 'lesson_images', lesson_index: order, lesson_id: lessonId, success: false, error: result?.status === 'rejected' ? String(result.reason) : 'Unknown' })
      }
    })
    
    // Step 4: Generate final exam for the course
    const examStart = Date.now()
    console.log('[Course Generator] Generating final exam...')
    let finalExamId: string | undefined

    try {
      // Combine all lesson content for exam generation
      const allLessonTexts: string[] = []
      for (const lessonId of lessonIds) {
        const lesson = await lessonRepository.getById(lessonId, userId)
        if (lesson) {
          const lessonText = typeof lesson.content === 'object' && lesson.content && 'text' in lesson.content
            ? (lesson.content as { text: string }).text
            : typeof lesson.content === 'string'
              ? lesson.content
              : ''
          if (lessonText) {
            allLessonTexts.push(lessonText.substring(0, 5000)) // Limit each lesson to 5000 chars
          }
        }
      }
      
      // If no lessons have content, try to use the original document text as fallback
      let examSourceText: string
      if (allLessonTexts.length > 0) {
        examSourceText = allLessonTexts.join('\n\n---\n\n').substring(0, 20000) // Max 20k chars
        console.log(`[Course Generator] Using ${allLessonTexts.length} lesson(s) content for exam generation`)
      } else {
        // Fallback: combine content from ALL documents when no lessons were created
        console.warn('[Course Generator] ⚠️ No lesson content available, using all documents for exam')
        const parts: string[] = []
        for (let i = 0; i < request.document_ids.length; i++) {
          const docId = request.document_ids[i]
          const text = await getParsedDocumentText(docId, userId, false)
          if (text) {
            parts.push(`--- Document ${i + 1} ---\n${text.substring(0, 5000)}`)
          }
        }
        if (parts.length === 0) {
          console.error('[Course Generator] ❌ Cannot generate exam: no lesson or document content available')
          throw new Error('No content available for exam generation')
        }
        examSourceText = parts.join('\n\n').substring(0, 20000)
      }
      
      if (examSourceText) {
        // Determine question count - use provided value or calculate based on lessons
        const questionCount = request.exam_settings?.question_count 
          || Math.min(15, Math.max(5, Math.ceil(request.num_lessons * 1.5)))
        
        console.log(`[Course Generator] Generating ${questionCount} exam questions from ${examSourceText.length} chars of content`)
        
        // Use provided exam settings or defaults
        const examSettings = request.exam_settings || {}
        const questionTypes = examSettings.question_types || ['multiple_choice', 'multiple_select', 'true_false']
        const difficultyDistribution = examSettings.difficulty_distribution || {
          easy: 30,
          medium: 50,
          hard: 20,
        }
        
        // Generate exam questions
        const examResult = await questionGenerator.generateFromDocument({
          documentText: examSourceText,
          settings: {
            question_count: questionCount,
            difficulty_distribution: difficultyDistribution,
            question_types: questionTypes,
            include_explanations: true,
            include_hints: false,
          },
          subject: request.subject,
          gradeLevel: request.grade_level,
          language: languageCode,
          customInstructions: `This is a final exam for the course "${structure.title}". The course was built from ${request.document_ids.length} document(s). Generate comprehensive questions that test understanding of ALL course material from every lesson (and every subject). Questions should reflect the difficulty level: ${request.difficulty_level}.`,
        })
        const examTokensUsed = examResult.tokensUsed ?? 0
        // question-generator currently returns only total tokens for this call,
        // so map it to input/prompt for visibility in real-token analytics.
        usageTotals.input_tokens += examTokensUsed
        usageTotals.prompt_tokens += examTokensUsed
        usageTotals.total_tokens += examTokensUsed
        usageTotals.exam_tokens += examTokensUsed
        
        // Create exam record
        // Truncate exam title and description to fit database column limits
        const durationMinutes = request.exam_settings?.duration_minutes ?? Math.ceil(questionCount * 2)
        const examTitle = truncateString(`${structure.title} - Final Exam`, 200)
        const examDescription = truncateString(
          `Final exam for ${structure.title}. Passing this exam (70% or higher) indicates successful completion of the course.`,
          500
        )
        const exam = await examRepository.create(organizationId, userId, {
          title: examTitle,
          description: examDescription,
          subject: request.subject,
          grade_level: request.grade_level,
          course_generated: 1,
          settings: {
            question_count: questionCount,
            difficulty_distribution: difficultyDistribution,
            question_types: questionTypes,
            time_limit_minutes: durationMinutes,
            shuffle_questions: true,
            shuffle_options: true,
            show_results_immediately: true,
            show_correct_answers: true,
            allow_review: true,
            passing_score: 70,
            max_attempts: 3,
            require_webcam: false,
            require_lockdown: false,
          } as any, // Partial<ExamSettings> allows all settings
          duration_minutes: durationMinutes,
        })
        
        // Update exam with metadata if exam was created
        // Note: We'll update metadata directly via Supabase since UpdateExamInput doesn't include it
        if (exam) {
          const { getDbClient } = await import('@eduator/db/client')
          const supabase = getDbClient()
          await supabase
            .from('exams')
            .update({
              metadata: {
                ai_model_used: AI_MODELS.LESSON,
                model_used: AI_MODELS.LESSON,
                source_documents: request.document_ids,
                generation_time_ms: examResult.generationTimeMs,
                custom_instructions: `Final exam for course: ${structure.title}`,
                from_course_id: course.id,
                course_title: structure.title,
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', exam.id)
        }
        
        if (exam) {
          // Update exam with questions
          await examRepository.updateQuestions(exam.id, examResult.questions)
          finalExamId = exam.id
          console.log('[Course Generator] ✅ Final exam created:', exam.id)
          logStep({ step: 'final_exam', duration_ms: Date.now() - examStart, success: true, message: exam.id })
        }
      }
    } catch (error) {
      console.error('[Course Generator] Failed to generate final exam:', error)
      logStep({ step: 'final_exam', duration_ms: Date.now() - examStart, success: false, error: error instanceof Error ? error.message : String(error) })
    }
    
    // Step 5: Update course with lesson IDs and exam ID
    // Note: total_lessons is automatically calculated by the repository when lesson_ids is updated
    await courseRepository.update(course.id, userId, {
      lesson_ids: lessonIds,
      metadata: {
        ...course.metadata,
        visual_gaps: structure.visualGaps.map((gap, idx) => {
          const lesson = generatedLessons[idx]
          return lesson ? { ...gap, lesson_id: lesson.id } : gap
        }),
        final_exam_id: finalExamId,
      },
    })
    
    const generationTime = Date.now() - startTime
    logStep({ step: 'complete', duration_ms: generationTime, success: true, message: `Course ${course.id} with ${generatedLessons.length} lessons` })

    return {
      success: true,
      course_id: course.id,
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        access_code: course.access_code,
      },
      lessons: generatedLessons,
      generation_time_ms: generationTime,
      tokens_used: usageTotals.total_tokens,
      usage: {
        input_tokens: usageTotals.input_tokens,
        output_tokens: usageTotals.output_tokens,
        prompt_tokens: usageTotals.prompt_tokens,
        completion_tokens: usageTotals.completion_tokens,
        total_tokens: usageTotals.total_tokens,
        model_used: AI_MODELS.LESSON,
        course_structure_tokens: usageTotals.course_structure_tokens,
        lesson_text_tokens: usageTotals.lesson_text_tokens,
        lesson_image_tokens: usageTotals.lesson_image_tokens,
        lesson_tts_tokens: usageTotals.lesson_tts_tokens,
        exam_tokens: usageTotals.exam_tokens,
      },
      visual_gaps: structure.visualGaps,
      final_exam_id: finalExamId,
      generation_log: generationLog,
    }
  } catch (error) {
    console.error('[Course Generator] Error generating course:', error)
    throw new Error(
      error instanceof Error
        ? `Failed to generate course: ${error.message}`
        : 'Failed to generate course'
    )
  }
}
