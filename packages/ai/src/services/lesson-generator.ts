/**
 * Enhanced Lesson Generator Service
 * Uses RAG (Retrieval Augmented Generation) for generating lesson content from documents
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { AI_MODELS } from '@eduator/config'
import { generateLessonImagesWithUsage, type LessonImage } from '../image-generator'
import {
  getParsedDocumentText,
  getRelevantChunks,
  getRelevantContentFromDocuments
} from './document-rag'

// Types for generated lesson content
export interface GeneratedLesson {
  title: string
  content: string  // Markdown formatted content
  learning_objectives: string[]  // 3-5 learning objectives
  duration_minutes: number  // Estimated reading time
  examples: Array<{
    title: string
    description: string
    code?: string
  }>
  mini_test: Array<{
    question: string
    options: string[]
    correct_answer: number
    explanation: string
  }>
  images: LessonImage[]
  usage?: {
    input_tokens: number
    output_tokens: number
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    model_used: string
    image_prompt_tokens?: number
    image_completion_tokens?: number
    image_total_tokens?: number
    image_model_used?: string
  }
}

export interface GenerateLessonParams {
  documentId?: string | null
  topic: string
  userId: string
  /** Language: 2-letter code (en, az, ru, tr, de, fr, es, ar) — same as exam generation. Prompts use full name. */
  language?: string
  includeImages?: boolean
  /** Teacher-provided learning objectives (free-text); when set, the AI uses these instead of generating its own. */
  objectives?: string
  /** Target grade level (e.g. 'grade_9', 'undergraduate'). The AI tailors complexity, vocabulary, and examples. */
  gradeLevel?: string
  /** Optional free-text core prompt that defines lesson focus, constraints, or style. */
  corePrompt?: string
}

/** Optional content and format options for lesson generation (UI, API, course generation). */
export interface LessonGenerationContentOptions {
  /** Include comparison/structured tables in content (default true). */
  includeTables?: boolean
  /** Include 1–2 key figures/diagrams (described or as image prompts) (default false). */
  includeFigures?: boolean
  /** Include chart-like data (e.g. trends in table form or chart descriptions) (default false). */
  includeCharts?: boolean
  /** Target length: short ≈ 1 page, medium ≈ 2–3 pages, full = comprehensive (default medium). */
  contentLength?: 'short' | 'medium' | 'full'
}

/** Same as exam-generator: map 2-letter codes to full language names for AI prompts. */
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  az: 'Azerbaijani',
  ru: 'Russian',
  tr: 'Turkish',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  ar: 'Arabic',
}

/** Normalize language input: accept 2-letter code (preferred) or full name; return display name for prompts. */
function languageCodeToName(language?: string): string {
  if (!language || typeof language !== 'string') return 'English'
  const trimmed = language.trim()
  const code = trimmed.length === 2 ? trimmed.toLowerCase() : null
  if (code && LANGUAGE_NAMES[code]) return LANGUAGE_NAMES[code]
  return trimmed
}

/** Fallback phrases in target language when AI output is missing or invalid (avoids saving user's topic language). */
const FALLBACK_PHRASES: Record<string, { title: string; question: string; explanation: string }> = {
  en: { title: 'Lesson', question: 'What is the main concept of this lesson?', explanation: 'This option is correct because it matches the key concept explained in the lesson.' },
  az: { title: 'Dərs', question: 'Bu dərsin əsas mövzusu nədir?', explanation: 'Bu cavab doğrudur, çünki dərsdə izah edilən əsas anlayışa uyğundur.' },
  ru: { title: 'Урок', question: 'Какова основная тема этого урока?', explanation: 'Этот вариант верный, потому что он соответствует ключевому понятию, объяснённому в уроке.' },
  tr: { title: 'Ders', question: 'Bu dersin ana konusu nedir?', explanation: 'Bu seçenek doğrudur çünkü derste açıklanan temel kavramla uyumludur.' },
  de: { title: 'Lektion', question: 'Was ist das Hauptthema dieser Lektion?', explanation: 'Diese Option ist korrekt, weil sie zum zentralen in der Lektion erklärten Konzept passt.' },
  fr: { title: 'Leçon', question: "Quel est le sujet principal de cette leçon ?", explanation: "Cette réponse est correcte, car elle correspond au concept clé expliqué dans la leçon." },
  es: { title: 'Lección', question: '¿Cuál es el tema principal de esta lección?', explanation: 'Esta opción es correcta porque coincide con el concepto clave explicado en la lección.' },
  ar: { title: 'الدرس', question: 'ما الموضوع الرئيسي لهذا الدرس؟', explanation: 'هذا الخيار صحيح لأنه يطابق الفكرة الأساسية المشروحة في الدرس.' },
}
function getFallbackPhrases(languageCode?: string): { title: string; question: string; explanation: string } {
  const code = languageCode?.toLowerCase()
  return FALLBACK_PHRASES[code ?? 'en'] ?? FALLBACK_PHRASES.en
}

function sanitizeExplanation(explanation: unknown): string {
  const raw = typeof explanation === 'string' ? explanation.trim() : ''
  if (!raw) return ''

  const patterns = [
    /^according to (the )?(text|document|source)[,:]?\s*/i,
    /^the (text|document|source) (states|says|mentions|indicates|explains)\s+(that\s*)?/i,
    /^based on (the )?(text|document|source)[,:]?\s*/i,
    /^mətndə .*?(qeyd olunur ki|deyilir ki)[,:]?\s*/i,
    /^в тексте (сказано|указано|говорится|отмечено)(,?\s*что)?\s*/i,
    /^metinde .*?(belirtilir|ifade edilir|denir)(\s*ki)?[,:]?\s*/i,
  ]

  let cleaned = raw
  patterns.forEach((re) => {
    cleaned = cleaned.replace(re, '')
  })
  cleaned = cleaned.trim().replace(/^[\s,.:;-]+/, '')
  return cleaned || raw
}

// Utility to get API key
function getApiKey(): string {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_KEY || process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Missing GOOGLE_GENERATIVE_AI_KEY or GOOGLE_GEMINI_API_KEY environment variable')
  }
  return apiKey
}

// Get Gemini model with custom system instruction
function getGeminiModelWithSystemInstruction(systemInstruction: string, modelName: string = AI_MODELS.LESSON) {
  const apiKey = getApiKey()
  const client = new GoogleGenerativeAI(apiKey)
  return client.getGenerativeModel({
    model: modelName,
    systemInstruction: {
      role: 'system',
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 65536,
    },
  })
}


/**
 * Normalize lesson content: strip disclaimers, fix markdown, remove meta-commentary,
 * strip leaked JSON blocks, and normalize HTML sub/sup so they don't break display.
 */
function normalizeLessonContent(content: string): string {
  if (!content || typeof content !== 'string') return content
  let out = content.trim()

  // Strip disclaimer / meta-commentary paragraphs (common when topic and document mismatch)
  const disclaimerPatterns = [
    /\n?\s*Therefore,?\s*it\s+is\s+impossible\s+to\s+create[^.]*\.\s*/gi,
    /\n?\s*The\s+content\s+below\s+will\s+(briefly\s+)?summarize[^.]*\.\s*/gi,
    /\n?\s*as\s+per\s+the\s+instructions[^.]*\.\s*/gi,
    /\n?\s*based\s+ONLY\s+on\s+the\s+provided\s+material[^.]*\.\s*/gi,
    /\n?\s*but\s+it\s+will\s+not\s+pertain\s+to[^.]*\.\s*/gi,
  ]
  for (const p of disclaimerPatterns) {
    out = out.replace(p, '\n\n')
  }

  // Remove "(from provided PDF)" or similar from headings and text
  out = out.replace(/\s*\(from\s+provided\s+PDF\)\s*/gi, ' ')
  out = out.replace(/\s*\(provided\s+PDF\)\s*/gi, ' ')

  // Strip leaked JSON blocks: ```json ... ``` or stray JSON key-value lines at paragraph start
  out = out.replace(/```json\s*[\s\S]*?```/gi, '\n\n')
  out = out.replace(/```\s*\{[\s\S]*?\}\s*```/g, '\n\n')
  // Remove lines that look like stray JSON (e.g. "title": "..." or "key": value) at start of a line
  out = out.replace(/\n\s*"[^"]+"\s*:\s*(?:"[^"]*"|\d+|true|false|null)\s*,?\s*/g, '\n')

  // Normalize ***label:** to **label:** (bold only)
  out = out.replace(/\*\*\*([^*]+)\*\*\*:/g, '**$1**:')

  // Collapse multiple blank lines
  out = out.replace(/\n{3,}/g, '\n\n')

  return out.trim()
}

/**
 * Extract learning_objectives array from raw API response text.
 * Use when JSON parse fails (e.g. truncated response) or when parsed result has empty objectives,
 * so we still recover objectives that appear in the response (e.g. before a long "content" field).
 */
function extractLearningObjectivesFromRawResponse(rawText: string): string[] {
  if (!rawText || typeof rawText !== 'string') return []
  const key = '"learning_objectives"'
  const idx = rawText.indexOf(key)
  if (idx === -1) return []
  const afterKey = rawText.slice(idx + key.length)
  const openBracket = afterKey.indexOf('[')
  if (openBracket === -1) return []
  let depth = 1
  let pos = openBracket + 1
  const chunk = afterKey.slice(openBracket)
  while (pos < chunk.length && depth > 0) {
    const c = chunk[pos]
    if (c === '[') depth++
    else if (c === ']') depth--
    pos++
  }
  if (depth !== 0) return []
  try {
    const arrStr = chunk.slice(0, pos)
    const arr = JSON.parse(arrStr) as unknown
    if (!Array.isArray(arr)) return []
    return arr.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map(s => s.trim())
  } catch {
    return []
  }
}

/**
 * Extract learning objectives from markdown content when the AI puts them in
 * a "Learning Objectives" section but omits or empties the JSON learning_objectives field.
 * Matches: ## Learning Objectives (or ###) followed by numbered (1. 2.) or bullet (- *) list.
 */
function extractLearningObjectivesFromContent(content: string): string[] {
  if (!content || typeof content !== 'string') return []
  const objectives: string[] = []
  // Match section heading (## or ###) with "Learning Objectives" (case-insensitive, optional colon)
  const sectionRegex = /^#{2,3}\s*Learning\s+Objectives\s*:?\s*$/im
  const idx = content.search(sectionRegex)
  if (idx === -1) return []
  const afterHeading = content.slice(idx)
  // Find next ## or ### heading (start of next section) to bound the list
  const nextSectionMatch = afterHeading.slice(1).match(/\n\s*#{2,3}\s+/)
  const listBlock = nextSectionMatch
    ? afterHeading.slice(0, afterHeading.indexOf(nextSectionMatch[0]) + 1)
    : afterHeading
  // Match lines that are numbered (1. 2. 3.) or bullets (- or *)
  const lineRegex = /^\s*(?:\d+\.|\*|-)\s+(.+)$/gm
  let match: RegExpExecArray | null
  while ((match = lineRegex.exec(listBlock)) !== null) {
    const text = match[1].trim()
    if (text.length > 2) objectives.push(text)
  }
  return objectives
}

/**
 * Extract the first complete JSON object from text (brace-matched, skips content inside strings).
 * Handles LLM responses that include trailing text or extra markdown after the JSON.
 */
function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (escape) {
      escape = false
      continue
    }
    if (c === '\\' && inString) {
      escape = true
      continue
    }
    if (!inString) {
      if (c === '"') {
        inString = true
        continue
      }
      if (c === '{') {
        depth++
        continue
      }
      if (c === '}') {
        depth--
        if (depth === 0) return text.slice(start, i + 1)
        continue
      }
      continue
    }
    if (c === '"') inString = false
  }
  return null
}

/**
 * When JSON parse fails, try to salvage "content" and "title" from the raw response.
 * The AI often returns valid content but with unescaped newlines/quotes in the content field.
 */
function recoverLessonFromRawResponse(
  raw: string,
  fallbackTitle: string
): { content: string; title: string } | null {
  const clean = raw.trim().replace(/^```json?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  let content: string | null = null
  let title: string | null = null

  // Extract "title": "..." (usually one line)
  const titleMatch = clean.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  if (titleMatch) {
    title = titleMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim()
  }

  // Extract "content": " ... " by finding the key and then reading until closing " followed by , or }
  const contentKey = '"content"'
  const keyIdx = clean.indexOf(contentKey)
  if (keyIdx === -1) return null

  const afterKey = clean.slice(keyIdx + contentKey.length)
  const valueMatch = afterKey.match(/\s*:\s*"/)
  if (!valueMatch || valueMatch.index === undefined) return null

  const start = keyIdx + contentKey.length + valueMatch.index + valueMatch[0].length // first char after opening "
  let out = ''
  let i = start
  while (i < clean.length) {
    const c = clean[i]
    if (c === '\\') {
      if (i + 1 < clean.length) {
        const next = clean[i + 1]
        if (next === 'n') out += '\n'
        else if (next === 't') out += '\t'
        else if (next === '"') out += '"'
        else out += next
        i++
      }
      i++
      continue
    }
    if (c === '"') {
      const rest = clean.slice(i + 1).trimStart()
      if (rest.startsWith(',') || rest.startsWith('}')) {
        content = out.trim()
        break
      }
      out += c
      i++
      continue
    }
    out += c
    i++
  }

  if (!content || content.length < 20) return null
  return { content, title: title ?? fallbackTitle }
}

// Safe JSON parse with fallback; when parse fails, try to recover content from raw response
function safeJsonParse<T extends GeneratedLesson>(text: string, fallback: T): T {
  try {
    let cleanText = text.trim()
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7)
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3)
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3)
    }
    cleanText = cleanText.trim()

    // Prefer first complete JSON object (avoids "Unexpected non-whitespace after JSON" from trailing text)
    const extracted = extractFirstJsonObject(cleanText)
    if (extracted) {
      return JSON.parse(extracted) as T
    }

    // Fallback: find JSON object/array by regex if not already pure JSON
    if (!cleanText.startsWith('{') && !cleanText.startsWith('[')) {
      const jsonMatch = cleanText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
      if (jsonMatch) {
        cleanText = jsonMatch[1]
      }
    }

    return JSON.parse(cleanText) as T
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[Lesson Generator] Failed to parse JSON response:', errorMsg)
    console.error('[Lesson Generator] Response preview (first 500 chars):', text.substring(0, 500))

    const recovered = recoverLessonFromRawResponse(text, fallback.title)
    if (recovered && recovered.content.length > 0) {
      console.warn('[Lesson Generator] Recovered content from raw response (' + recovered.content.length + ' chars)')
      return {
        ...fallback,
        title: recovered.title,
        content: recovered.content,
      } as T
    }

    console.warn('[Lesson Generator] Using fallback lesson structure')
    return fallback
  }
}

// Default system instruction for lesson generation (used for both course and API/in-app; keep output style universal)
const LESSON_SYSTEM_INSTRUCTION = `You are an expert educational content creator. Your lessons should be:
- Clear and easy to understand
- Well-organized with proper sections
- Include practical examples
- Include a mini test to reinforce learning
- Professional and educational in tone
- Based on the provided PDF content

Never add disclaimers or meta-commentary in the lesson content (e.g. "impossible to create", "based ONLY on the provided material", "content below will summarize"). Output only the lesson itself. Use consistent markdown: ## and ### for headings, **bold** for emphasis, simple bullet or numbered lists. Your task is to create comprehensive, engaging lessons that help students learn effectively.
For mini-test explanations, write directly and professionally. Do NOT use source-referencing filler like "According to the text...", "The text states...", "Mətndə ... qeyd olunur ki", or similar intros in any language.

Important: Write the "content" field in plain markdown only. Do not include raw HTML (e.g. no <sub>, <sup>, <div>). For subscripts use a_n or a_{n} in text; for superscripts use x^2 or x^{2}. Do not paste JSON objects or code blocks inside the lesson content.`


/** Map grade_level values (e.g. 'grade_9', 'undergraduate') to human-readable descriptions for AI prompts. */
function gradeValueToLabel(grade?: string): string | null {
  if (!grade) return null
  const map: Record<string, string> = {
    grade_1: 'Grade 1 (ages 6-7)', grade_2: 'Grade 2 (ages 7-8)', grade_3: 'Grade 3 (ages 8-9)',
    grade_4: 'Grade 4 (ages 9-10)', grade_5: 'Grade 5 (ages 10-11)', grade_6: 'Grade 6 (ages 11-12)',
    grade_7: 'Grade 7 (ages 12-13)', grade_8: 'Grade 8 (ages 13-14)', grade_9: 'Grade 9 (ages 14-15)',
    grade_10: 'Grade 10 (ages 15-16)', grade_11: 'Grade 11 (ages 16-17)', grade_12: 'Grade 12 (ages 17-18)',
    undergraduate: 'Undergraduate (university)', graduate: 'Graduate (master\'s level)', phd: 'PhD (doctoral level)',
  }
  return map[grade] ?? grade
}

/**
 * Generate a comprehensive lesson using RAG
 * @param documentId - The primary source document ID (used for DB and when documentIds not provided)
 * @param topic - The lesson topic
 * @param userId - The user ID
 * @param language - Target language for the lesson
 * @param includeImages - Whether to generate images
 * @param lessonId - Optional lesson ID for saving images to storage
 * @param contentOptions - Optional: tables, figures, charts, content length (for UI/API/course)
 * @param documentIds - Optional: when provided, RAG uses all these documents; primary document_id in DB is documentIds[0] or documentId
 * @param objectives - Optional: teacher-provided learning objectives to guide the lesson
 * @param gradeLevel - Optional: target grade level (e.g. 'grade_9', 'undergraduate')
 * @param corePrompt - Optional: teacher-provided core instruction for scope/style/focus
 */
export async function generateLesson(
  documentId: string | null,
  topic: string,
  userId: string,
  language?: string,
  includeImages: boolean = true,
  lessonId?: string,
  contentOptions?: LessonGenerationContentOptions,
  documentIds?: string[],
  objectives?: string,
  gradeLevel?: string,
  corePrompt?: string
): Promise<GeneratedLesson> {
  // Ensure topic is a string (it may come as an object from AI-generated course structure)
  let topicString: string
  if (typeof topic === 'string') {
    topicString = topic
  } else if (topic && typeof topic === 'object') {
    const obj = topic as Record<string, unknown>
    topicString = (obj.title as string) || (obj.name as string) || (obj.topic as string) || JSON.stringify(topic)
  } else {
    topicString = String(topic || 'General topic')
  }

  let context: string
  const idsForRag = documentIds && documentIds.length > 0
    ? documentIds
    : documentId
      ? [documentId]
      : []

  if (idsForRag.length > 1) {
    // Multi-document: use RAG across all documents
    context = await getRelevantContentFromDocuments(idsForRag, userId, topicString, 7)
    if (!context || context.trim().length === 0) {
      throw new Error('No relevant content found from the selected documents for this topic')
    }
    context = context
      .split(/\n\n---\n\n/)
      .map((chunk, idx) => `[Section ${idx + 1}]\n${chunk}`)
      .join('\n\n---\n\n')
  } else if (idsForRag.length === 1) {
    // Single document: existing behavior
    const primaryId = idsForRag[0]
    let documentText: string | null
    try {
      documentText = await getParsedDocumentText(primaryId, userId, false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to get document text:', errorMessage)
      throw new Error(`Failed to process document: ${errorMessage}`)
    }
    if (!documentText) {
      throw new Error("Document not found or you don't have access to it")
    }
    const relevantChunks = await getRelevantChunks(primaryId, documentText, topicString, 7)
    context = relevantChunks
      .map((chunk, idx) => `[Section ${idx + 1}]\n${chunk}`)
      .join('\n\n---\n\n')
  } else {
    // AI-only mode (no uploaded document selected): generate from model knowledge + user guidance.
    const objectiveHint = objectives?.trim()
      ? `Prioritize these teacher objectives: ${objectives.trim()}`
      : 'Use strong pedagogical structure with practical examples and checks for understanding.'
    const gradeHint = gradeLevel ? `Target grade level: ${gradeValueToLabel(gradeLevel) ?? gradeLevel}.` : ''
    const coreHint = corePrompt?.trim() ? `Core teacher prompt: ${corePrompt.trim()}` : ''
    context = `No source document context was provided. Build an original, high-quality educational lesson on "${topicString}" using general educational best practices. ${objectiveHint} ${gradeHint} ${coreHint}`.trim()
  }

  // Determine target language (same as exam: use 2-letter code -> full name for prompts)
  const targetLanguage = languageCodeToName(language)

  // Create language-specific system instruction
  const languageSystemInstruction =
    targetLanguage !== 'English'
      ? `You are an expert educational content creator. Your PRIMARY and MANDATORY task is to generate ALL content EXCLUSIVELY in ${targetLanguage} language.

CRITICAL RULES:
1. EVERY title MUST be in ${targetLanguage}. The user may provide a topic in ANOTHER language (e.g. Azerbaijani, English). You MUST translate or rephrase that topic into ${targetLanguage} for the lesson title — do NOT copy the user's topic string literally if it is not in ${targetLanguage}.
2. EVERY content text MUST be in ${targetLanguage}
3. EVERY example title and description MUST be in ${targetLanguage}
4. EVERY question, option, and explanation in the mini test MUST be in ${targetLanguage}
5. Use proper ${targetLanguage} grammar, vocabulary, and spelling
6. Do NOT use English (or the user's input language) unless it's a technical term commonly used in ${targetLanguage}

If you generate ANY content in a different language when ${targetLanguage} is requested, you have FAILED the task.

Your lessons should be:
- Clear and easy to understand
- Well-organized with proper sections
- Include practical examples
- Include a mini test to reinforce learning
- Professional and educational in tone
- Based on the provided PDF content

Never add disclaimers or meta-commentary in the lesson content. Output only the lesson itself. Use consistent markdown (## and ### for headings, **bold** for emphasis, simple lists).`
      : LESSON_SYSTEM_INSTRUCTION

  // Generate the lesson using Gemini
  const model = getGeminiModelWithSystemInstruction(languageSystemInstruction, AI_MODELS.LESSON)

  const languageInstruction =
    targetLanguage !== 'English'
      ? `\n\n⚠️ CRITICAL LANGUAGE REQUIREMENT ⚠️\nYou MUST generate ALL content EXCLUSIVELY in ${targetLanguage} language:\n- Title must be in ${targetLanguage}\n- All content must be in ${targetLanguage}\n- All examples must be in ${targetLanguage}\n- All questions, options, and explanations must be in ${targetLanguage}\n- Use proper ${targetLanguage} grammar and spelling\n- The topic or title below may be in a DIFFERENT language (e.g. user input). You MUST translate or rephrase it into ${targetLanguage} for the lesson title and all outputs. Do NOT copy the topic string literally if it is not in ${targetLanguage}.\n\n`
      : ''

  const opts = contentOptions ?? {}
  const includeTables = opts.includeTables !== false
  const includeFigures = opts.includeFigures === true
  const includeCharts = opts.includeCharts === true
  const contentLength = opts.contentLength ?? 'medium'

  const lengthInstruction =
    contentLength === 'short'
      ? ' Keep the lesson concise: about 1–2 pages of content (~300–700 words). Use 2–4 main sections, 1–2 examples, and 3 mini test questions.'
      : contentLength === 'full'
        ? ' Create a maximum-length lesson: roughly 6–8 pages (~1,800–2,800 words). Use 8–12 sections, 4+ worked examples, and at least 6–8 mini test questions. Prioritize depth and coverage over brevity.'
        : ' Aim for 3–4 pages (~900–1,400 words). Use 5–7 sections, 2–3 examples, and at least 5 mini test questions.'

  const tablesRule = includeTables
    ? '  - For comparisons or structured data (e.g. definitions, properties, before/after), use markdown tables: one header row with | Column A | Column B |, then a separator row | --- | --- |, then data rows. Tables render clearly in the lesson and in the AI tutor chat.'
    : '  - Prefer short paragraphs and lists over tables; use tables only if essential.'

  const figuresRule = includeFigures
    ? '\n- Include 1–2 key figures or diagrams in the content: describe them clearly (e.g. "Figure 1: Diagram showing...") so they can be illustrated. Place each figure description after the relevant section.'
    : ''

  const chartsRule = includeCharts
    ? '\n- Where helpful, include chart-like data: use markdown tables for trends or comparisons, or a short description of what a chart would show (e.g. "A bar chart of X would show...").'
    : ''

  const gradeLevelLabel = gradeValueToLabel(gradeLevel)
  const gradeInstruction = gradeLevelLabel
    ? `\n\n🎓 TARGET GRADE LEVEL: ${gradeLevelLabel}\nYou MUST tailor the lesson for this grade level:\n- Use vocabulary, sentence complexity, and examples appropriate for ${gradeLevelLabel} students\n- Adjust the depth of explanation: simpler for lower grades, more analytical for higher levels\n- Choose relatable examples and analogies suitable for this age group\n- The mini test difficulty must match this grade level\n`
    : ''

  const objectivesInstruction = objectives
    ? `\n\n🎯 TEACHER-PROVIDED LEARNING OBJECTIVES (use these exactly):\n${objectives}\nYou MUST structure the lesson content to cover ALL of the above objectives. Use them as the "learning_objectives" array in your response (you may rephrase slightly for clarity but preserve the intent). The lesson content, examples, and mini test questions should directly support these objectives.\n`
    : ''
  const corePromptInstruction = corePrompt?.trim()
    ? `\n\n🧭 CORE TEACHER PROMPT (high priority):\n${corePrompt.trim()}\nUse this as a strict guidance layer for scope, tone, depth, style, and constraints.`
    : ''

  const prompt = `${languageInstruction}Create a comprehensive lesson about "${topicString}" based on the following PDF content.${lengthInstruction}${gradeInstruction}${objectivesInstruction}${corePromptInstruction}

FORMATTING RULES (universal style – must follow):
- Output ONLY the lesson. Do NOT add disclaimers, meta-commentary, or phrases like "impossible to create", "based ONLY on the provided material", "content below will summarize the PDF", or "(from provided PDF)" in headings or text.
- If the document does not fully cover the topic, still produce a clear, self-contained lesson using the available material; do not explain limitations to the user in the content.
- Mini-test explanations must be direct and student-facing. Do NOT start with source-referencing filler like "According to the text...", "The text states...", "Mətndə ... qeyd olunur ki", "В тексте сказано...", etc.
- Use clean, consistent markdown in the "content" field:
  - Use ## for main section headings and ### for subsections. No extra labels like "(from provided PDF)" in headings.
  - Use **text** for bold (never ***text:** or similar). Use *text* for italic.
  - Use simple bullet lists with * or - at the start of each line. Do not duplicate the same bullet as a sub-bullet; keep a single-level list unless you have real sub-items.
  - Use numbered lists (1. 2. 3.) for steps or ordered points.
${tablesRule}${figuresRule}${chartsRule}
- The "content" field must look like a clean, professional lesson suitable for in-app display: clear headings, short paragraphs, well-structured lists${includeTables ? ', and tables when they aid understanding' : ''}.

The lesson should be well-structured, educational, and include:
1. A clear title
2. ${objectives ? 'The learning objectives provided above (3-5 items)' : '3-5 specific learning objectives (what students will learn)'}
3. Main content explaining the topic in detail (using the markdown rules above)
4. Practical examples (at least 2-3 examples, or 1-2 for short length)
5. A mini test with 5 questions (multiple choice; 3 questions for short length)

Return ONLY a valid JSON object with this exact structure. You MUST include all fields; learning_objectives is REQUIRED and must be a non-empty array of 3-5 strings. Output "title" and "learning_objectives" first (before "content") so they are never omitted.
CRITICAL for valid JSON: In the "content" field use \\n for line breaks (do not use literal newlines inside the string). Escape any double-quote inside content as \\".
{
  "title": "Lesson title here",
  "learning_objectives": [
    "Students will understand...",
    "Students will be able to...",
    "Students will learn..."
  ],
  "content": "Main lesson content in markdown. Use ## and ### for headings, **bold** for emphasis, simple * bullets or 1. 2. numbered lists, and markdown tables (| col | col |, then | --- | --- |, then rows) for comparisons. No disclaimers or meta-commentary.",
  "examples": [
    {
      "title": "Example 1 title",
      "description": "Explanation of the example",
      "code": "Code example if applicable (optional field)"
    }
  ],
  "mini_test": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}

PDF Content:
${context}

Topic: ${topicString}

Generate the lesson now. Return ONLY the JSON object, no other text.`

  const fallback = getFallbackPhrases(language)
  try {
    const response = await model.generateContent(prompt)
    const text = response.response?.text() || '{}'
    const usage = (response.response as unknown as {
      usageMetadata?: {
        promptTokenCount?: number
        candidatesTokenCount?: number
        totalTokenCount?: number
      }
    }).usageMetadata
    const usageTelemetry: NonNullable<GeneratedLesson['usage']> = {
      input_tokens: usage?.promptTokenCount ?? 0,
      output_tokens: usage?.candidatesTokenCount ?? 0,
      prompt_tokens: usage?.promptTokenCount ?? 0,
      completion_tokens: usage?.candidatesTokenCount ?? 0,
      total_tokens:
        usage?.totalTokenCount ??
        (usage?.promptTokenCount ?? 0) + (usage?.candidatesTokenCount ?? 0),
      model_used: AI_MODELS.LESSON,
    }

    const lesson = safeJsonParse<GeneratedLesson>(text, {
      title: fallback.title,
      content: `# ${fallback.title}\n\nContent is being prepared.`,
      learning_objectives: [],
      duration_minutes: 5,
      examples: [],
      mini_test: [],
      images: [],
    })
    
    // Ensure learning_objectives is an array
    if (!Array.isArray(lesson.learning_objectives)) {
      lesson.learning_objectives = []
    }
    // If missing (e.g. first lesson truncated, or AI skipped): recover from raw response then from content
    if (lesson.learning_objectives.length === 0) {
      const fromRaw = extractLearningObjectivesFromRawResponse(text)
      if (fromRaw.length > 0) {
        lesson.learning_objectives = fromRaw
      } else if (lesson.content) {
        const fromContent = extractLearningObjectivesFromContent(lesson.content)
        if (fromContent.length > 0) {
          lesson.learning_objectives = fromContent
        }
      }
    }

    // Normalize content to universal style (strip disclaimers, fix markdown) for consistent display in app and API
    lesson.content = normalizeLessonContent(lesson.content)

    // Calculate estimated duration based on content length (avg 200 words per minute reading)
    const wordCount = lesson.content.split(/\s+/).length
    const readingMinutes = Math.ceil(wordCount / 200)
    // Add time for examples and mini test (1 min per example, 0.5 min per question)
    const examplesTime = (lesson.examples?.length || 0) * 1
    const testTime = Math.ceil((lesson.mini_test?.length || 0) * 0.5)
    lesson.duration_minutes = Math.max(5, readingMinutes + examplesTime + testTime)

    // Validate and ensure minimum requirements
    if (!lesson.examples || lesson.examples.length === 0) {
      lesson.examples = [
        {
          title: targetLanguage === 'English' ? 'Example' : fallback.title,
          description: targetLanguage === 'English' ? 'Example related to the topic' : fallback.question,
        },
      ]
    }

    if (!lesson.mini_test || lesson.mini_test.length === 0) {
      lesson.mini_test = [
        {
          question: fallback.question,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correct_answer: 0,
          explanation: fallback.explanation,
        },
      ]
    }

    // Ensure we have 5 mini test questions (use target-language fallback, not topicString)
    while (lesson.mini_test.length < 5) {
      lesson.mini_test.push({
        question: fallback.question,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct_answer: 0,
        explanation: fallback.explanation,
      })
    }

    // Post-process mini-test explanations to remove low-value source-referencing intros.
    lesson.mini_test = lesson.mini_test.map((item) => ({
      ...item,
      explanation: sanitizeExplanation(item.explanation) || fallback.explanation,
    }))

    // Generate images for the lesson (2-3 images) with language context
    // If lessonId is provided, images will be saved to Supabase Storage
    if (includeImages) {
      try {
        const imageResult = await generateLessonImagesWithUsage(
          topicString,
          lesson.content,
          3,
          targetLanguage /* full name for image prompts */,
          lessonId
        )
        lesson.images = imageResult.images
        usageTelemetry.image_prompt_tokens = imageResult.usage.prompt_tokens
        usageTelemetry.image_completion_tokens = imageResult.usage.completion_tokens
        usageTelemetry.image_total_tokens = imageResult.usage.total_tokens
        usageTelemetry.image_model_used = imageResult.usage.model_used
      } catch (error) {
        console.error('Error generating images for lesson:', error)
        // Continue without images if generation fails
        lesson.images = []
      }
    } else {
      lesson.images = []
    }

    lesson.usage = usageTelemetry

    return lesson
  } catch (error) {
    console.error('Error generating lesson:', error)
    throw new Error(
      error instanceof Error
        ? `Failed to generate lesson: ${error.message}`
        : 'Failed to generate lesson. Please try again.'
    )
  }
}

// Export the original lessonGenerator for backward compatibility
export const lessonGenerator = {
  generateLesson,
  createLesson: async (_params: {
    topic: string
    subject?: string
    gradeLevel: string
    durationMinutes: number
    learningObjectives?: string[]
    teachingStyle?: 'traditional' | 'inquiry_based' | 'project_based' | 'flipped'
    includeActivities?: boolean
    includeAssessment?: boolean
    language?: string
    customInstructions?: string
  }) => {
    // This is a simplified version for backward compatibility
    // In production, this would need a document to work with
    throw new Error('Please use generateLesson with a document ID for RAG-based generation')
  },
}

export type { GeneratedLesson as GenerateLessonResult }
