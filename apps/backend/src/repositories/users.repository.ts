import type { FastifyInstance } from 'fastify'

export type UserRecord = {
  id: string
  email: string
  password_hash: string
  role: string
  manual_note: string | null
  created_at: string
  updated_at: string
}

export class UsersRepository {
  constructor(private readonly app: FastifyInstance) {}

  async create(email: string, passwordHash: string, role: string, manualNote?: string | null) {
    const { rows } = await this.app.db.query<UserRecord>(
      `
        INSERT INTO users (email, password_hash, role, manual_note)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, password_hash, role, manual_note, created_at, updated_at
      `,
      [email, passwordHash, role, manualNote ?? null]
    )
    return rows[0]
  }

  async findByEmail(email: string) {
    const { rows } = await this.app.db.query<UserRecord>(
      `
        SELECT id, email, password_hash, role, manual_note, created_at, updated_at
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [email]
    )
    return rows[0] ?? null
  }

  async findById(id: string) {
    const { rows } = await this.app.db.query<Omit<UserRecord, 'password_hash'>>(
      `
        SELECT id, email, role, manual_note, created_at, updated_at
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    )
    return rows[0] ?? null
  }

  async list(limit = 50, offset = 0) {
    const { rows } = await this.app.db.query<Omit<UserRecord, 'password_hash'>>(
      `
        SELECT id, email, role, manual_note, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    )
    return rows
  }

  async updatePasswordById(id: string, passwordHash: string) {
    const { rowCount } = await this.app.db.query(
      `
        UPDATE users
        SET password_hash = $2, updated_at = NOW()
        WHERE id = $1
      `,
      [id, passwordHash]
    )
    return (rowCount ?? 0) > 0
  }
}
