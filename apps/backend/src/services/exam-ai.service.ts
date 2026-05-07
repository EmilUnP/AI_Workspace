import { z } from 'zod'
import { generateJson } from '../ai/gemini.js'
import { DocumentRagService } from './document-rag.service.js'
import type { FastifyInstance } from 'fastify'

const questionTypeEnum = z.enum(['multiple_choice', 'true_false', 'multiple_select', 'fill_blank'])

const examSchema = z.object({
  documentId: z.uuid().optional(),
  documentIds: z.array(z.uuid()).default([]),
  documentText: z.string().optional(),
  title: z.string().optional(),
  subject: z.string().optional(),
  gradeLevel: z.string().optional(),
  language: z.string().default('en'),
  durationMinutes: z.number().int().min(1).max(300).default(60),
  questionCount: z.number().int().min(1).max(50).default(10),
  topics: z.array(z.string().min(1)).optional(),
  customPrompt: z.string().optional(),
  questionTypes: z.array(questionTypeEnum).min(1).optional(),
  difficultyDistribution: z
    .object({
      easy: z.number().int().min(0),
      medium: z.number().int().min(0),
      hard: z.number().int().min(0)
    })
    .optional()
})

const translateSchema = z.object({
  questions: z.array(z.record(z.string(), z.any())).min(1),
  targetLanguage: z.string().min(2)
})

export class ExamAiService {
  private readonly rag: DocumentRagService
  constructor(private readonly app: FastifyInstance) {
    this.rag = new DocumentRagService(app)
  }

  async generate(userId: string, input: unknown) {
    const data = examSchema.parse(input)
    const docsFromSingle = data.documentId ? [data.documentId] : []
    const mergedDocumentIds = Array.from(new Set([...docsFromSingle, ...(data.documentIds || [])]))

    let contextText = data.documentText?.trim() || ''
    if (!contextText && mergedDocumentIds.length > 0) {
      const query = this.buildRetrievalQuery(data)
      const retrievedChunks: string[] = []
      for (const id of mergedDocumentIds) {
        const retrieved = await this.rag.retrieve(userId, { documentId: id, query, topK: 5 })
        retrievedChunks.push(...retrieved.chunks)
      }
      contextText = retrievedChunks.join('\n\n').trim()
    }

    if (contextText.length < 50) {
      const err = new Error('Provide usable exam source content (documentText or ready documentIds).') as Error & { statusCode?: number }
      err.statusCode = 400
      throw err
    }

    const prompt = this.buildGenerationPrompt(data, contextText)

    const exam = await generateJson<{
      title: string
      description: string
      questions: Array<Record<string, unknown>>
    }>(prompt)

    const normalizedQuestions = this.normalizeGeneratedQuestions(exam.questions || [])

    const { rows } = await this.app.db.query<{ id: string }>(
      `INSERT INTO exams (user_id, title, description, subject, grade_level, questions, language, duration_minutes)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8) RETURNING id`,
      [
        userId,
        exam.title || data.title || 'Generated Exam',
        exam.description || null,
        data.subject || null,
        data.gradeLevel || null,
        JSON.stringify(normalizedQuestions),
        data.language,
        data.durationMinutes
      ]
    )

    return { id: rows[0].id, ...exam, questions: normalizedQuestions }
  }

  async translate(input: unknown) {
    const data = translateSchema.parse(input)
    const translated = await generateJson<{ questions: Array<Record<string, unknown>> }>(
      [
        `Translate all exam questions to language: ${data.targetLanguage}.`,
        'Preserve structure and question ids if present.',
        'Output JSON object: {"questions":[...]}',
        `Questions JSON:\n${JSON.stringify(data.questions)}`
      ].join('\n\n')
    )
    return translated
  }

  private buildRetrievalQuery(data: z.infer<typeof examSchema>) {
    const topicText = data.topics?.length ? ` Topics: ${data.topics.join(', ')}.` : ''
    return `Generate exam questions for ${data.subject || 'general subject'}.${topicText}`
  }

  private buildGenerationPrompt(data: z.infer<typeof examSchema>, contextText: string) {
    const questionTypes = (data.questionTypes || ['multiple_choice', 'true_false', 'multiple_select', 'fill_blank']).join(', ')
    const dd = data.difficultyDistribution
      ? `Difficulty distribution (counts): easy=${data.difficultyDistribution.easy}, medium=${data.difficultyDistribution.medium}, hard=${data.difficultyDistribution.hard}.`
      : 'Use balanced difficulty across easy, medium, hard.'
    const topics = data.topics?.length ? `Topics: ${data.topics.join(', ')}.` : 'Topics: infer from context.'
    const custom = data.customPrompt?.trim() ? `Additional instructions: ${data.customPrompt.trim()}` : ''

    return [
      `Generate ${data.questionCount} exam questions in ${data.language}.`,
      `Subject: ${data.subject || 'General'}.`,
      `Grade: ${data.gradeLevel || 'N/A'}.`,
      `Allowed question types: ${questionTypes}.`,
      'For multiple_choice and multiple_select questions, ALWAYS return exactly 4 options.',
      'For multiple_select, return max 4 options and ensure correct_answer values are selected from those options.',
      dd,
      topics,
      custom,
      'Return JSON object with shape:',
      '{"title":"...","description":"...","questions":[{"id":"q1","type":"multiple_choice|true_false|multiple_select|fill_blank","question":"...","options":["..."],"correct_answer":"...","explanation":"..."}]}',
      `Context:\n${contextText}`
    ]
      .filter(Boolean)
      .join('\n\n')
  }

  private normalizeGeneratedQuestions(questions: Array<Record<string, unknown>>) {
    return questions.map((rawQuestion, index) => {
      const question = { ...rawQuestion }
      const type = String(question.type || '').trim().toLowerCase()
      const rawOptions = Array.isArray(question.options) ? question.options : []
      const options = rawOptions.map((item) => String(item ?? '')).filter(Boolean)

      if (type === 'multiple_select' || type === 'multiple_choice') {
        const limitedOptions = options.slice(0, 4)
        question.options = limitedOptions

        const rawCorrect = question.correct_answer
        if (type === 'multiple_select') {
          const asArray = Array.isArray(rawCorrect) ? rawCorrect : [rawCorrect]
          const normalizedCorrect = asArray
            .map((item) => String(item ?? '').trim())
            .filter((item) => limitedOptions.includes(item))
          question.correct_answer = normalizedCorrect
        } else if (type === 'multiple_choice') {
          const correct = String(rawCorrect ?? '').trim()
          question.correct_answer = limitedOptions.includes(correct)
            ? correct
            : (limitedOptions[0] || '')
        }
      }

      if (!question.id) {
        question.id = `q${index + 1}`
      }

      return question
    })
  }
}
