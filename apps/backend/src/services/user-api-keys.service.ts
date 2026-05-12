import { createHash, randomBytes } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

type UserApiKeyRow = {
  id: string
  name: string
  key_prefix: string
  is_active: boolean
  created_at: string
  last_used_at: string | null
}

export class UserApiKeysService {
  constructor(private readonly app: FastifyInstance) {}

  async list(userId: string) {
    const { rows } = await this.app.db.query<UserApiKeyRow>(
      `SELECT id, name, key_prefix, is_active, created_at, last_used_at
       FROM user_api_keys
       WHERE user_id = $1 AND is_active = TRUE
       ORDER BY created_at DESC`,
      [userId]
    )
    return rows
  }

  async create(userId: string, name: string) {
    const safeName = name.trim()
    if (!safeName) {
      throw new Error('Key name is required')
    }

    const rawKey = `ed_${randomBytes(24).toString('hex')}`
    const keyHash = createHash('sha256').update(rawKey).digest('hex')
    const keyPrefix = rawKey.slice(0, 10)

    const { rows } = await this.app.db.query<UserApiKeyRow>(
      `INSERT INTO user_api_keys (user_id, name, key_hash, key_prefix, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
       RETURNING id, name, key_prefix, is_active, created_at, last_used_at`,
      [userId, safeName, keyHash, keyPrefix]
    )

    return { key: rawKey, row: rows[0] }
  }

  async revoke(userId: string, keyId: string) {
    const result = await this.app.db.query(
      `UPDATE user_api_keys
       SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND is_active = TRUE`,
      [keyId, userId]
    )
    return (result.rowCount ?? 0) > 0
  }

  async getUsageStats(userId: string) {
    const summary = await this.app.db.query<{
      total_requests: number
      success_count: number
      error_count: number
    }>(
      `SELECT
         COUNT(*)::int AS total_requests,
         COUNT(*) FILTER (WHERE status = 'done')::int AS success_count,
         COUNT(*) FILTER (WHERE status <> 'done')::int AS error_count
       FROM ai_requests
       WHERE user_id = $1`,
      [userId]
    )

    const recent = await this.app.db.query<{
      type: string
      status: string
      created_at: string
    }>(
      `SELECT type, status, created_at
       FROM ai_requests
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    )

    const totals = summary.rows[0] ?? { total_requests: 0, success_count: 0, error_count: 0 }

    return {
      totalRequests: Number(totals.total_requests || 0),
      successCount: Number(totals.success_count || 0),
      errorCount: Number(totals.error_count || 0),
      byKey: [] as Array<{ keyId: string; keyName: string; keyPrefix: string; total: number; success: number; error: number }>,
      byEndpoint: [] as Array<{ method: string; endpoint: string; total: number; success: number; error: number }>,
      recent: recent.rows.map((row) => ({
        method: 'POST',
        endpoint: `/ai/${row.type}`,
        status: row.status === 'done' ? 'success' : 'error',
        statusCode: row.status === 'done' ? 200 : 500,
        createdAt: row.created_at,
      })),
    }
  }
}
