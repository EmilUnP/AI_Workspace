import type { FastifyInstance } from 'fastify'

type RefreshTokenRecord = {
  id: string
  user_id: string
  token_hash: string
  expires_at: string
  revoked_at: string | null
  created_at: string
}

export class RefreshTokensRepository {
  constructor(private readonly app: FastifyInstance) {}

  async create(input: { id: string; userId: string; tokenHash: string; expiresAt: Date }) {
    await this.app.db.query(
      `
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
        VALUES ($1, $2, $3, $4)
      `,
      [input.id, input.userId, input.tokenHash, input.expiresAt.toISOString()]
    )
  }

  async findActiveByHash(tokenHash: string) {
    const { rows } = await this.app.db.query<RefreshTokenRecord>(
      `
        SELECT id, user_id, token_hash, expires_at, revoked_at, created_at
        FROM refresh_tokens
        WHERE token_hash = $1
          AND revoked_at IS NULL
          AND expires_at > NOW()
        LIMIT 1
      `,
      [tokenHash]
    )
    return rows[0] ?? null
  }

  async revokeById(id: string) {
    await this.app.db.query(
      `
        UPDATE refresh_tokens
        SET revoked_at = NOW()
        WHERE id = $1
      `,
      [id]
    )
  }
}
