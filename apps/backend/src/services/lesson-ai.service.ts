import { z } from 'zod'
import { generateJson } from '../ai/gemini.js'
import { DocumentRagService } from './document-rag.service.js'
import type { FastifyInstance } from 'fastify'

const lessonSchema = z.object({
  documentId: z.uuid(),
  topic: z.string().min(1),
  language: z.string().default('en'),
  gradeLevel: z.string().optional(),
  subject: z.string().optional()
})

export class LessonAiService {
  private readonly rag: DocumentRagService
  constructor(private readonly app: FastifyInstance) {
    this.rag = new DocumentRagService(app)
  }

  async generate(userId: string, input: unknown) {
    const data = lessonSchema.parse(input)
    const retrieved = await this.rag.retrieve(userId, {
      documentId: data.documentId,
      query: `Create lesson about ${data.topic}`,
      topK: 6
    })

    const lesson = await generateJson<{
      title: string
      description: string
      duration_minutes: number
      learning_objectives: string[]
      content: string
      mini_test: unknown
    }>(
      `Generate a lesson in ${data.language}.\nTopic: ${data.topic}\nGrade: ${data.gradeLevel || 'N/A'}\nSubject: ${data.subject || 'N/A'}\nContext:\n${retrieved.chunks.join('\n\n')}`
    )

    const { rows } = await this.app.db.query<{ id: string }>(
      `INSERT INTO lessons (user_id, document_id, title, description, subject, grade_level, topic, duration_minutes, content, learning_objectives, mini_test, language)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, $12)
       RETURNING id`,
      [
        userId,
        data.documentId,
        lesson.title,
        lesson.description,
        data.subject || null,
        data.gradeLevel || null,
        data.topic,
        lesson.duration_minutes || 45,
        JSON.stringify({ text: lesson.content }),
        JSON.stringify(lesson.learning_objectives || []),
        JSON.stringify(lesson.mini_test || {}),
        data.language
      ]
    )

    return { id: rows[0].id, ...lesson }
  }
}
