import { z } from 'zod'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { generateText } from '../ai/gemini.js'
import { DocumentRagService } from './document-rag.service.js'
import type { FastifyInstance } from 'fastify'
import { generateLessonAudioWithUsage, generateLessonImagesWithUsage } from './lesson-media.service.js'

const lessonSchema = z.object({
  documentId: z.uuid().optional(),
  documentIds: z.array(z.uuid()).optional(),
  topic: z.string().min(1),
  language: z.string().default('en'),
  gradeLevel: z.string().optional(),
  subject: z.string().optional(),
  objectives: z.string().optional(),
  corePrompt: z.string().optional(),
  options: z
    .object({
      includeImages: z.boolean().optional(),
      includeAudio: z.boolean().optional(),
      centerText: z.boolean().optional(),
      includeTables: z.boolean().optional(),
      includeFigures: z.boolean().optional(),
      includeCharts: z.boolean().optional(),
      contentLength: z.enum(['short', 'medium', 'full']).optional(),
    })
    .optional(),
})

const generatedLessonSchema = z.object({
  title: z.string().min(1).catch('Generated Lesson'),
  description: z.string().catch(''),
  duration_minutes: z.number().int().min(1).max(240).catch(45),
  learning_objectives: z.array(z.string()).catch([]),
  content: z.string().min(1).catch(''),
  examples: z
    .array(
      z.object({
        title: z.string().catch('Example'),
        description: z.string().catch(''),
        code: z.string().optional(),
      })
    )
    .catch([]),
  mini_test: z
    .array(
      z.object({
        question: z.string().catch('What is the key concept of this lesson?'),
        options: z.array(z.string()).catch(['Option A', 'Option B', 'Option C', 'Option D']),
        correct_answer: z.number().int().min(0).max(3).catch(0),
        explanation: z.string().catch('This answer matches the lesson content.'),
      })
    )
    .catch([]),
})

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

const FALLBACK_PHRASES: Record<string, { title: string; question: string; explanation: string }> = {
  en: {
    title: 'Lesson',
    question: 'What is the main concept of this lesson?',
    explanation: 'This option is correct because it matches the key concept explained in the lesson.',
  },
  az: {
    title: 'Ders',
    question: 'Bu dersin esas movzusu nedir?',
    explanation: 'Bu cavab dogrudur, cunki dersde izah edilen esas anlayisa uygundur.',
  },
  ru: {
    title: 'Urok',
    question: 'Kakova osnovnaya tema etogo uroka?',
    explanation: 'Etot variant vernyy, potomu chto on sootvetstvuet klyuchevomu ponyatiyu uroka.',
  },
  tr: {
    title: 'Ders',
    question: 'Bu dersin ana konusu nedir?',
    explanation: 'Bu secenek dogrudur cunku derste aciklanan temel kavramla uyumludur.',
  },
  de: {
    title: 'Lektion',
    question: 'Was ist das Hauptthema dieser Lektion?',
    explanation: 'Diese Option ist korrekt, weil sie zum zentralen Konzept der Lektion passt.',
  },
  fr: {
    title: 'Lecon',
    question: 'Quel est le sujet principal de cette lecon ?',
    explanation: 'Cette reponse est correcte, car elle correspond au concept cle de la lecon.',
  },
  es: {
    title: 'Leccion',
    question: 'Cual es el tema principal de esta leccion?',
    explanation: 'Esta opcion es correcta porque coincide con el concepto clave de la leccion.',
  },
  ar: {
    title: 'Lesson',
    question: 'What is the main concept of this lesson?',
    explanation: 'This option is correct because it matches the key concept explained in the lesson.',
  },
}

const languageCodeToName = (language?: string) => {
  if (!language) return 'English'
  const code = language.trim().toLowerCase()
  return LANGUAGE_NAMES[code] ?? language
}

const defaultObjectivesForTopic = (topic: string): string[] => [
  `Understand the core ideas of ${topic}.`,
  `Explain key terms and concepts related to ${topic}.`,
  `Apply ${topic} in practical classroom examples.`,
  `Compare common cases and variations of ${topic}.`,
  `Evaluate understanding through short assessment tasks.`,
]

const getFallbackPhrases = (languageCode?: string) => {
  const code = languageCode?.toLowerCase() || 'en'
  return FALLBACK_PHRASES[code] ?? FALLBACK_PHRASES.en
}

const extractFirstJsonObject = (text: string): string | null => {
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
    if (inString && c === '\\') {
      escape = true
      continue
    }
    if (c === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (c === '{') depth++
    if (c === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

const normalizeLessonContent = (content: string) =>
  content
    .replace(/\n?\s*Therefore,?\s*it\s+is\s+impossible\s+to\s+create[^.]*\.\s*/gi, '\n\n')
    .replace(/\n?\s*The\s+content\s+below\s+will\s+(briefly\s+)?summarize[^.]*\.\s*/gi, '\n\n')
    .replace(/\n?\s*based\s+ONLY\s+on\s+the\s+provided\s+material[^.]*\.\s*/gi, '\n\n')
    .replace(/\s*\(from\s+provided\s+PDF\)\s*/gi, ' ')
    .replace(/```json\s*[\s\S]*?```/gi, '\n\n')
    .replace(/\*\*\*([^*]+)\*\*\*:/g, '**$1**:')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const extractLearningObjectivesFromRawResponse = (rawText: string): string[] => {
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
    return arr.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim())
  } catch {
    return []
  }
}

const extractLearningObjectivesFromContent = (content: string): string[] => {
  if (!content || typeof content !== 'string') return []
  const objectives: string[] = []
  const sectionRegex = /^#{2,3}\s*Learning\s+Objectives\s*:?\s*$/im
  const idx = content.search(sectionRegex)
  if (idx === -1) return []
  const afterHeading = content.slice(idx)
  const nextSectionMatch = afterHeading.slice(1).match(/\n\s*#{2,3}\s+/)
  const listBlock = nextSectionMatch
    ? afterHeading.slice(0, afterHeading.indexOf(nextSectionMatch[0]) + 1)
    : afterHeading
  const lineRegex = /^\s*(?:\d+\.|\*|-)\s+(.+)$/gm
  let match: RegExpExecArray | null
  while ((match = lineRegex.exec(listBlock)) !== null) {
    const text = match[1].trim()
    if (text.length > 2) objectives.push(text)
  }
  return objectives
}

const sanitizeExplanation = (explanation: unknown): string => {
  const raw = typeof explanation === 'string' ? explanation.trim() : ''
  if (!raw) return ''
  const patterns = [
    /^according to (the )?(text|document|source)[,:]?\s*/i,
    /^the (text|document|source) (states|says|mentions|indicates|explains)\s+(that\s*)?/i,
    /^based on (the )?(text|document|source)[,:]?\s*/i,
  ]
  let cleaned = raw
  patterns.forEach((re) => {
    cleaned = cleaned.replace(re, '')
  })
  cleaned = cleaned.trim().replace(/^[\s,.:;-]+/, '')
  return cleaned || raw
}

const looksMostlyEnglish = (text: string) => {
  const lower = text.toLowerCase()
  const markers = [' the ', ' and ', ' of ', ' is ', ' are ', ' this ', ' lesson ', ' introduction ']
  const hits = markers.reduce((acc, m) => acc + (lower.includes(m) ? 1 : 0), 0)
  return hits >= 3
}

const estimateLessonDuration = (content: string, examplesCount: number, questionsCount: number) => {
  const words = content.split(/\s+/).filter(Boolean).length
  const readingMinutes = Math.ceil(words / 190)
  const examplesMinutes = examplesCount * 2
  const testMinutes = Math.ceil(questionsCount * 0.8)
  return Math.max(10, Math.min(180, readingMinutes + examplesMinutes + testMinutes))
}

const LESSON_SYSTEM_INSTRUCTION = `You are an expert educational content creator.
Generate comprehensive, practical, structured lessons.
Rules:
- Output only lesson content and educational structure; no disclaimers/meta-commentary.
- Keep markdown clean and readable (##/### headings, bullets, numbered lists, tables where useful).
- Ensure mini test is high quality and directly tied to lesson content.
- Keep explanations direct; avoid filler like "According to the text".`

const getApiKey = () => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_KEY || process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('Missing GOOGLE_GENERATIVE_AI_KEY or GOOGLE_GEMINI_API_KEY')
  return apiKey
}

const getLessonModel = (systemInstruction: string, modelName = 'gemini-2.0-flash') => {
  const client = new GoogleGenerativeAI(getApiKey())
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

const recoverLessonFromRawResponse = (raw: string, fallbackTitle: string): { content: string; title: string } | null => {
  const clean = raw.trim().replace(/^```json?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  let content: string | null = null
  let title: string | null = null
  const titleMatch = clean.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  if (titleMatch) {
    title = titleMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim()
  }
  const contentKey = '"content"'
  const keyIdx = clean.indexOf(contentKey)
  if (keyIdx === -1) return null
  const afterKey = clean.slice(keyIdx + contentKey.length)
  const valueMatch = afterKey.match(/\s*:\s*"/)
  if (!valueMatch || valueMatch.index === undefined) return null
  const start = keyIdx + contentKey.length + valueMatch.index + valueMatch[0].length
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

const safeJsonParse = <T extends { title: string; content: string }>(text: string, fallback: T): T => {
  try {
    let cleanText = text.trim()
    if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7)
    else if (cleanText.startsWith('```')) cleanText = cleanText.slice(3)
    if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3)
    cleanText = cleanText.trim()
    const extracted = extractFirstJsonObject(cleanText)
    if (extracted) return JSON.parse(extracted) as T
    return JSON.parse(cleanText) as T
  } catch {
    const recovered = recoverLessonFromRawResponse(text, fallback.title)
    if (recovered && recovered.content.length > 0) {
      return {
        ...fallback,
        title: recovered.title,
        content: recovered.content,
      } as T
    }
    return fallback
  }
}

export class LessonAiService {
  private readonly rag: DocumentRagService
  constructor(private readonly app: FastifyInstance) {
    this.rag = new DocumentRagService(app)
  }

  async generate(userId: string, input: unknown) {
    const data = lessonSchema.parse(input)
    const targetLanguage = languageCodeToName(data.language)
    const fallback = getFallbackPhrases(data.language)
    const options = data.options || {}
    const includeImages = options.includeImages !== false
    const includeAudio = options.includeAudio !== false

    const allSelectedDocIds = Array.from(
      new Set([...(data.documentIds || []), ...(data.documentId ? [data.documentId] : [])])
    )
    const primaryDocumentId = allSelectedDocIds[0] ?? null
    let contextFromDocs = ''
    if (allSelectedDocIds.length > 1) {
      contextFromDocs = await this.rag.getRelevantContentFromDocuments(
        allSelectedDocIds,
        userId,
        data.topic,
        6
      )
    } else if (allSelectedDocIds.length === 1) {
      const parsed = await this.rag.getParsedDocumentText(allSelectedDocIds[0], userId)
      const chunks = await this.rag.getRelevantChunks(allSelectedDocIds[0], userId, data.topic, 7)
      contextFromDocs = chunks.join('\n\n---\n\n') || parsed || ''
    }

    const generationMode = allSelectedDocIds.length > 0 ? 'RAG' : 'AI-only'
    const lengthHint =
      options.contentLength === 'short'
        ? 'Keep content concise (300-700 words) and 3 mini test questions.'
        : options.contentLength === 'full'
          ? 'Provide deep content (1800-2800 words) and 6-8 mini test questions.'
          : 'Provide medium content (900-1400 words) and 5 mini test questions.'

    const generationPrompt = `Generate a lesson in ${targetLanguage}.
Topic: ${data.topic}
Grade: ${data.gradeLevel || 'N/A'}
Subject: ${data.subject || 'N/A'}
Learning objectives: ${data.objectives || 'N/A'}
Core prompt: ${data.corePrompt || 'N/A'}
Mode: ${generationMode}
Length hint: ${lengthHint}
Formatting options: includeTables=${options.includeTables !== false}, includeFigures=${options.includeFigures === true}, includeCharts=${options.includeCharts === true}
Context:
${contextFromDocs || 'No source documents selected. Use general knowledge and the provided topic/prompt.'}
Output rules:
- Return ONLY valid JSON object.
- No disclaimers/meta text like "impossible to create".
- Use clean markdown in content with headings and lists.
- STRICT LANGUAGE RULE: ALL output fields must be in ${targetLanguage}. Do not output English unless target language is English.
Return ONLY valid JSON with exact keys:
{
  "title": "string",
  "description": "string",
  "duration_minutes": number,
  "learning_objectives": ["string"],
  "content": "markdown string",
  "examples": [{ "title": "string", "description": "string", "code": "string (optional)" }],
  "mini_test": [{ "question": "string", "options": ["A","B","C","D"], "correct_answer": 0, "explanation": "string" }]
}`

    let lesson: z.infer<typeof generatedLessonSchema>
    let rawModelText = ''
    try {
      const languageSystemInstruction =
        targetLanguage !== 'English'
          ? `${LESSON_SYSTEM_INSTRUCTION}\nCRITICAL: Generate ALL fields EXCLUSIVELY in ${targetLanguage}.`
          : LESSON_SYSTEM_INSTRUCTION
      const model = getLessonModel(languageSystemInstruction)
      const response = await model.generateContent(generationPrompt)
      const text = response.response?.text() || '{}'
      rawModelText = text
      const parsedJson = safeJsonParse(
        text,
        {
          title: fallback.title,
          description: `Lesson about ${data.topic}`,
          duration_minutes: 0,
          learning_objectives: [],
          content: `# ${fallback.title}\n\nContent is being prepared.`,
          examples: [],
          mini_test: [],
        }
      )
      const parsed = generatedLessonSchema.safeParse(parsedJson)
      if (!parsed.success) throw new Error('Invalid lesson JSON shape')
      lesson = {
        ...parsed.data,
        content: normalizeLessonContent(parsed.data.content),
      }
    } catch {
      // Fallback keeps endpoint resilient if model returns non-JSON text.
      try {
        const raw = await generateText(generationPrompt)
        rawModelText = raw
        const extracted = extractFirstJsonObject(raw)
        if (extracted) {
          const parsed = generatedLessonSchema.safeParse(JSON.parse(extracted))
          if (parsed.success) {
            lesson = {
              ...parsed.data,
              content: normalizeLessonContent(parsed.data.content),
            }
          } else {
            throw new Error('Invalid extracted JSON shape')
          }
        } else {
          const text = await generateText(`${generationPrompt}\n\nReturn lesson content as plain text.`)
          lesson = {
            title: data.topic.trim().slice(0, 120) || fallback.title,
            description: `Lesson about ${data.topic}`,
            duration_minutes: 0,
            learning_objectives: data.objectives
              ? data.objectives
                  .split(/\n|,|;/)
                  .map((x) => x.trim())
                  .filter(Boolean)
                  .slice(0, 8)
              : [],
            content: normalizeLessonContent(text.trim() || `Generated lesson content for: ${data.topic}`),
            examples: [
              {
                title: targetLanguage === 'English' ? 'Example' : fallback.title,
                description: targetLanguage === 'English' ? 'Example related to the topic' : fallback.question,
              },
            ],
            mini_test: [
              {
                question: fallback.question,
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                correct_answer: 0,
                explanation: fallback.explanation,
              },
            ],
          }
        }
      } catch {
        // Final fallback when AI provider is unavailable or key/model is invalid.
        lesson = {
          title: data.topic.trim().slice(0, 120) || fallback.title,
          description: `Lesson about ${data.topic}`,
          duration_minutes: 0,
          learning_objectives: data.objectives
            ? data.objectives
                .split(/\n|,|;/)
                .map((x) => x.trim())
                .filter(Boolean)
                .slice(0, 8)
            : [],
          content: normalizeLessonContent([
            `# ${data.topic}`,
            '',
            `Language: ${targetLanguage}`,
            '',
            '## Introduction',
            `Core overview of ${data.topic}.`,
            '',
            '## Key Concepts',
            '- Main concept 1',
            '- Main concept 2',
            '- Main concept 3',
          ].join('\n')),
          examples: [
            {
              title: targetLanguage === 'English' ? 'Example' : fallback.title,
              description: targetLanguage === 'English' ? 'Example related to the topic' : fallback.question,
            },
          ],
          mini_test: [
            {
              question: fallback.question,
              options: ['Option A', 'Option B', 'Option C', 'Option D'],
              correct_answer: 0,
              explanation: fallback.explanation,
            },
          ],
        }
      }
    }

    if (!Array.isArray(lesson.learning_objectives)) lesson.learning_objectives = []
    if (lesson.learning_objectives.length === 0) {
      const fromRaw = extractLearningObjectivesFromRawResponse(rawModelText)
      if (fromRaw.length > 0) {
        lesson.learning_objectives = fromRaw
      } else {
        const fromContent = extractLearningObjectivesFromContent(lesson.content)
        if (fromContent.length > 0) lesson.learning_objectives = fromContent
      }
    }
    if (!Array.isArray(lesson.examples)) lesson.examples = []
    if (!Array.isArray(lesson.mini_test)) lesson.mini_test = []
    if (lesson.learning_objectives.length === 0) {
      lesson.learning_objectives = defaultObjectivesForTopic(data.topic)
    }
    if (lesson.examples.length === 0) {
      lesson.examples = [
        {
          title: targetLanguage === 'English' ? 'Example' : fallback.title,
          description: targetLanguage === 'English' ? 'Example related to the topic' : fallback.question,
        },
      ]
    }
    while (lesson.mini_test.length < 5) {
      lesson.mini_test.push({
        question: fallback.question,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct_answer: 0,
        explanation: fallback.explanation,
      })
    }
    lesson.mini_test = lesson.mini_test.map((item) => ({
      ...item,
      explanation: sanitizeExplanation(item.explanation) || fallback.explanation,
    }))

    if (data.language?.toLowerCase() === 'tr' && looksMostlyEnglish(lesson.content)) {
      try {
        const translated = await generateText(
          `Translate the following lesson content into Turkish. Keep markdown structure unchanged.\n\n${lesson.content}`
        )
        if (translated.trim().length > 50) {
          lesson.content = normalizeLessonContent(translated)
        }
      } catch {
        // keep original if translation fails
      }
    }

    lesson.duration_minutes = estimateLessonDuration(lesson.content, lesson.examples.length, lesson.mini_test.length)

    let generatedImages: Array<{ url: string; alt: string; description: string; position: 'top' | 'middle' | 'bottom' }> = []
    let imageUsage: { prompt_tokens: number; completion_tokens: number; total_tokens: number; model_used?: string } | null = null

    const { rows } = await this.app.db.query<{ id: string }>(
      `INSERT INTO lessons (user_id, document_id, title, description, subject, grade_level, topic, duration_minutes, content, learning_objectives, mini_test, images, metadata, language)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14)
       RETURNING id`,
      [
        userId,
        primaryDocumentId,
        lesson.title,
        lesson.description,
        data.subject || null,
        data.gradeLevel || null,
        data.topic,
        lesson.duration_minutes || 45,
        JSON.stringify({ text: lesson.content }),
        JSON.stringify(lesson.learning_objectives || []),
        JSON.stringify(lesson.mini_test || []),
        JSON.stringify(generatedImages),
        JSON.stringify({
          generation_mode: generationMode,
          rag_document_count: allSelectedDocIds.length,
          source_documents: allSelectedDocIds,
          generation_options: options,
          image_generation: imageUsage,
          examples: lesson.examples || [],
          core_prompt: data.corePrompt || null,
          custom_objectives: data.objectives || null,
        }),
        data.language
      ]
    )

    const lessonId = rows[0].id

    if (includeImages) {
      try {
        const imageResult = await generateLessonImagesWithUsage(lessonId, lesson.title || data.topic, lesson.content, 3)
        if (imageResult.images.length > 0) {
          await this.app.db.query('UPDATE lessons SET images = $2::jsonb, updated_at = now() WHERE id = $1', [
            lessonId,
            JSON.stringify(imageResult.images),
          ])
          generatedImages = imageResult.images
          imageUsage = imageResult.usage
          await this.app.db.query(
            `UPDATE lessons
             SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
                 updated_at = now()
             WHERE id = $1`,
            [lessonId, JSON.stringify({ image_generation: imageUsage })]
          )
        }
      } catch {
        // image generation is optional, do not fail lesson
      }
    }

    let audioUrl: string | null = null
    if (includeAudio) {
      void (async () => {
        try {
          const tts = await generateLessonAudioWithUsage(lessonId, lesson.title, lesson.content)
          if (!tts.audioUrl) return
          audioUrl = tts.audioUrl
          try {
            await this.app.db.query('UPDATE lessons SET audio_url = $2, updated_at = now() WHERE id = $1', [lessonId, tts.audioUrl])
          } catch {
            await this.app.db.query(
              `UPDATE lessons
               SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
                   updated_at = now()
               WHERE id = $1`,
              [
                lessonId,
                JSON.stringify({
                  audio_url: tts.audioUrl,
                  tts_usage: tts.usage,
                }),
              ]
            )
          }
        } catch {
          // tts is optional
        }
      })()
    }

    return { id: lessonId, ...lesson, images: generatedImages, audio_url: audioUrl }
  }
}
