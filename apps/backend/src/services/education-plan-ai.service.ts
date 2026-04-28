import { z } from 'zod'
import { generateJson } from '../ai/gemini.js'
import { DocumentRagService } from './document-rag.service.js'
import type { FastifyInstance } from 'fastify'

const planSchema = z.object({
  documentId: z.uuid(),
  name: z.string().min(1),
  language: z.string().default('en'),
  periodMonths: z.number().int().min(1).max(24).default(3),
  sessionsPerWeek: z.number().int().min(1).max(14).default(3),
  hoursPerSession: z.number().int().min(1).max(8).default(1)
})

export class EducationPlanAiService {
  private readonly rag: DocumentRagService
  constructor(private readonly app: FastifyInstance) {
    this.rag = new DocumentRagService(app)
  }

  async generate(userId: string, input: unknown) {
    const data = planSchema.parse(input)
    const retrieved = await this.rag.retrieve(userId, {
      documentId: data.documentId,
      query: `Create education plan named ${data.name}`,
      topK: 8
    })

    const content = await generateJson<Array<Record<string, unknown>>>(
      `Generate weekly education plan content in ${data.language}.
Plan name: ${data.name}
Period months: ${data.periodMonths}
Sessions/week: ${data.sessionsPerWeek}
Hours/session: ${data.hoursPerSession}
Context:\n${retrieved.chunks.join('\n\n')}`
    )

    const { rows } = await this.app.db.query<{ id: string }>(
      `INSERT INTO education_plans (user_id, name, period_months, sessions_per_week, hours_per_session, document_ids, content)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb) RETURNING id`,
      [userId, data.name, data.periodMonths, data.sessionsPerWeek, data.hoursPerSession, JSON.stringify([data.documentId]), JSON.stringify(content)]
    )

    return { id: rows[0].id, content }
  }
}
