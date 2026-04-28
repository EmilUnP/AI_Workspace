import { z } from 'zod'
import { generateJson } from '../ai/gemini.js'
import { DocumentRagService } from './document-rag.service.js'
import type { FastifyInstance } from 'fastify'

const examSchema = z.object({
  documentId: z.uuid(),
  subject: z.string().optional(),
  gradeLevel: z.string().optional(),
  language: z.string().default('en'),
  questionCount: z.number().int().min(1).max(50).default(10)
})

export class ExamAiService {
  private readonly rag: DocumentRagService
  constructor(private readonly app: FastifyInstance) {
    this.rag = new DocumentRagService(app)
  }

  async generate(userId: string, input: unknown) {
    const data = examSchema.parse(input)
    const retrieved = await this.rag.retrieve(userId, {
      documentId: data.documentId,
      query: `Generate exam questions for ${data.subject || 'subject'}`,
      topK: 8
    })

    const exam = await generateJson<{
      title: string
      description: string
      questions: Array<Record<string, unknown>>
    }>(
      `Generate ${data.questionCount} exam questions in ${data.language}. Subject: ${data.subject || 'General'}. Grade: ${data.gradeLevel || 'N/A'}.\nContext:\n${retrieved.chunks.join('\n\n')}`
    )

    const { rows } = await this.app.db.query<{ id: string }>(
      `INSERT INTO exams (user_id, title, description, subject, grade_level, questions, language)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7) RETURNING id`,
      [userId, exam.title, exam.description, data.subject || null, data.gradeLevel || null, JSON.stringify(exam.questions || []), data.language]
    )

    return { id: rows[0].id, ...exam }
  }
}
