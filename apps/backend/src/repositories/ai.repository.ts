import type { FastifyInstance } from 'fastify'

export type AiRequestRecord = {
  id: string
  user_id: string
  type: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  payload: Record<string, unknown>
  result: Record<string, unknown> | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export class AiRepository {
  constructor(private readonly app: FastifyInstance) {}

  async createRequest(input: {
    userId: string
    type: string
    payload: Record<string, unknown>
  }) {
    const { rows } = await this.app.db.query<AiRequestRecord>(
      `
        INSERT INTO ai_requests (user_id, type, status, payload)
        VALUES ($1, $2, 'queued', $3::jsonb)
        RETURNING id, user_id, type, status, payload, result, error_message, created_at, updated_at
      `,
      [input.userId, input.type, JSON.stringify(input.payload)]
    )
    return rows[0]
  }

  async setCompleted(id: string, userId: string, result: Record<string, unknown>) {
    const { rows } = await this.app.db.query<AiRequestRecord>(
      `
        UPDATE ai_requests
        SET status = 'completed', result = $3::jsonb, error_message = NULL, updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING id, user_id, type, status, payload, result, error_message, created_at, updated_at
      `,
      [id, userId, JSON.stringify(result)]
    )
    return rows[0] ?? null
  }

  async getByIdForUser(id: string, userId: string) {
    const { rows } = await this.app.db.query<AiRequestRecord>(
      `
        SELECT id, user_id, type, status, payload, result, error_message, created_at, updated_at
        FROM ai_requests
        WHERE id = $1 AND user_id = $2
        LIMIT 1
      `,
      [id, userId]
    )
    return rows[0] ?? null
  }
}
