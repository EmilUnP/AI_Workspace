import { createHash, randomBytes } from 'node:crypto'
import type { FastifyInstance } from 'fastify'

export type UsageDateRange = 'today' | '30d' | 'all'

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
      `DELETE FROM user_api_keys
       WHERE id = $1 AND user_id = $2`,
      [keyId, userId]
    )
    return (result.rowCount ?? 0) > 0
  }

  async getUsageStats(userId: string, range: UsageDateRange = 'all') {
    try {
      return await this.getUsageStatsFromAccessLog(userId, range)
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : ''
      if (code === '42P01') {
        return this.getUsageStatsFromAiRequestsFallback(userId, range)
      }
      throw err
    }
  }

  private dateFilterSql(range: UsageDateRange): string {
    if (range === 'today') return ` AND created_at >= CURRENT_DATE`
    if (range === '30d') return ` AND created_at >= NOW() - INTERVAL '30 days'`
    return ''
  }

  private async getUsageStatsFromAccessLog(userId: string, range: UsageDateRange) {
    type Summary = { total_requests: number; success_count: number; error_count: number }
    type RecentRow = { method: string; path: string; status_code: number; created_at: string }
    type EndpointRow = { method: string; path: string; total: number; success: number; error: number }

    const dateFilter = this.dateFilterSql(range)

    const [summary, recent, byEndpoint] = await Promise.all([
      this.app.db.query<Summary>(
        `SELECT
           COUNT(*)::int AS total_requests,
           COUNT(*) FILTER (WHERE status_code < 400)::int AS success_count,
           COUNT(*) FILTER (WHERE status_code >= 400)::int AS error_count
         FROM api_access_log
         WHERE user_id = $1${dateFilter}`,
        [userId]
      ),
      this.app.db.query<RecentRow>(
        `SELECT method, path, status_code, created_at
         FROM api_access_log
         WHERE user_id = $1${dateFilter}
         ORDER BY created_at DESC
         LIMIT 50`,
        [userId]
      ),
      this.app.db.query<EndpointRow>(
        `SELECT method, path,
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status_code < 400)::int AS success,
           COUNT(*) FILTER (WHERE status_code >= 400)::int AS error
         FROM api_access_log
         WHERE user_id = $1${dateFilter}
         GROUP BY method, path
         ORDER BY total DESC`,
        [userId]
      ),
    ])

    const totals = summary.rows[0] ?? { total_requests: 0, success_count: 0, error_count: 0 }

    return {
      totalRequests: Number(totals.total_requests || 0),
      successCount: Number(totals.success_count || 0),
      errorCount: Number(totals.error_count || 0),
      byKey: [] as Array<{ keyId: string; keyName: string; keyPrefix: string; total: number; success: number; error: number }>,
      byEndpoint: byEndpoint.rows.map((r) => ({
        method: r.method,
        endpoint: r.path,
        total: Number(r.total),
        success: Number(r.success),
        error: Number(r.error),
      })),
      recent: recent.rows.map((row) => ({
        method: row.method,
        endpoint: row.path,
        status: row.status_code < 400 ? 'success' : 'error',
        statusCode: row.status_code,
        createdAt: row.created_at,
      })),
    }
  }

  /** When `api_access_log` is not migrated yet; also fixes legacy `done` vs `completed` mismatch. */
  private async getUsageStatsFromAiRequestsFallback(userId: string, range: UsageDateRange) {
    const dateFilter = this.dateFilterSql(range)

    const summary = await this.app.db.query<{
      total_requests: number
      success_count: number
      error_count: number
    }>(
      `SELECT
         COUNT(*)::int AS total_requests,
         COUNT(*) FILTER (WHERE status IN ('completed', 'done'))::int AS success_count,
         COUNT(*) FILTER (WHERE status = 'failed')::int AS error_count
       FROM ai_requests
       WHERE user_id = $1${dateFilter}`,
      [userId]
    )

    const recent = await this.app.db.query<{
      type: string
      status: string
      created_at: string
    }>(
      `SELECT type, status, created_at
       FROM ai_requests
       WHERE user_id = $1${dateFilter}
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    )

    const totals = summary.rows[0] ?? { total_requests: 0, success_count: 0, error_count: 0 }

    const isOk = (s: string) => s === 'completed' || s === 'done'

    return {
      totalRequests: Number(totals.total_requests || 0),
      successCount: Number(totals.success_count || 0),
      errorCount: Number(totals.error_count || 0),
      byKey: [] as Array<{ keyId: string; keyName: string; keyPrefix: string; total: number; success: number; error: number }>,
      byEndpoint: [] as Array<{ method: string; endpoint: string; total: number; success: number; error: number }>,
      recent: recent.rows.map((row) => ({
        method: 'POST',
        endpoint: '/v1/ai/requests',
        status: isOk(row.status) ? 'success' : row.status === 'failed' ? 'error' : 'success',
        statusCode: isOk(row.status) ? 200 : row.status === 'failed' ? 500 : 202,
        createdAt: row.created_at,
      })),
    }
  }
}
