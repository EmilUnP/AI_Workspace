import { z } from 'zod'
import { generateJson, generateText } from '../ai/gemini.js'
import { DocumentRagService } from './document-rag.service.js'
import type { FastifyInstance } from 'fastify'

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
      const raw = await generateText(generationPrompt)
      rawModelText = raw
      const extracted = extractFirstJsonObject(raw)
      const generated = extracted ? JSON.parse(extracted) : await generateJson<unknown>(generationPrompt)
      const parsed = generatedLessonSchema.safeParse(generated)
      if (!parsed.success) throw new Error('Invalid lesson JSON shape')
      lesson = {
        ...parsed.data,
        content: normalizeLessonContent(parsed.data.content),
      }
    } catch {
      // Fallback keeps endpoint resilient if model returns non-JSON text.
      try {
        const text = await generateText(`${generationPrompt}\n\nReturn lesson content as plain text.`)
        lesson = {
          title: data.topic.trim().slice(0, 120) || fallback.title,
          description: `Lesson about ${data.topic}`,
          duration_minutes: 45,
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
      } catch {
        // Final fallback when AI provider is unavailable or key/model is invalid.
        lesson = {
          title: data.topic.trim().slice(0, 120) || fallback.title,
          description: `Lesson about ${data.topic}`,
          duration_minutes: 45,
          learning_objectives: data.objectives
            ? data.objectives
                .split(/\n|,|;/)
                .map((x) => x.trim())
                .filter(Boolean)
                .slice(0, 8)
            : [],
          content: [
            `# ${data.topic}`,
            '',
            `Language: ${data.language}`,
            `Grade level: ${data.gradeLevel || 'N/A'}`,
            '',
            data.corePrompt?.trim() ? `Teacher prompt: ${data.corePrompt.trim()}` : '',
            '',
            '## Introduction',
            `This lesson introduces "${data.topic}" with clear explanations and classroom-ready structure.`,
            '',
            '## Key Concepts',
            '- Define the topic and core terminology.',
            '- Explain practical examples.',
            '- Connect the concept to real-world contexts.',
            '',
            '## Classroom Activity',
            '1. Warm-up discussion (5 min)',
            '2. Guided explanation (20 min)',
            '3. Practice task (15 min)',
            '4. Reflection and recap (5 min)',
            '',
            '## Quick Check',
            '- What is the main idea of this lesson?',
            '- Give one real-world example.',
            '- What question do you still have?',
          ]
            .filter(Boolean)
            .join('\n'),
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
    if (lesson.examples.length === 0) {
      lesson.examples = [
        {
          title: targetLanguage === 'English' ? 'Example' : fallback.title,
          description: targetLanguage === 'English' ? 'Example related to the topic' : fallback.question,
        },
      ]
    }
    while (lesson.mini_test.length < 3) {
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

    const wordCount = lesson.content.split(/\s+/).filter(Boolean).length
    const estimatedMinutes = Math.max(5, Math.ceil(wordCount / 200) + lesson.examples.length + Math.ceil(lesson.mini_test.length * 0.5))
    lesson.duration_minutes = lesson.duration_minutes || estimatedMinutes

    const { rows } = await this.app.db.query<{ id: string }>(
      `INSERT INTO lessons (user_id, document_id, title, description, subject, grade_level, topic, duration_minutes, content, learning_objectives, mini_test, language)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, $12)
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
        data.language
      ]
    )

    return { id: rows[0].id, ...lesson }
  }
}
