import type { FastifyInstance } from 'fastify'

export type UserRecord = {
  id: string
  email: string
  password_hash: string
  role: string
  created_at: string
  updated_at: string
}

export class UsersRepository {
  constructor(private readonly app: FastifyInstance) {}

  async create(email: string, passwordHash: string, role: string) {
    const { rows } = await this.app.db.query<UserRecord>(
      `
        INSERT INTO users (email, password_hash, role)
        VALUES ($1, $2, $3)
        RETURNING id, email, password_hash, role, created_at, updated_at
      `,
      [email, passwordHash, role]
    )
    return rows[0]
  }

  async findByEmail(email: string) {
    const { rows } = await this.app.db.query<UserRecord>(
      `
        SELECT id, email, password_hash, role, created_at, updated_at
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
        SELECT id, email, role, created_at, updated_at
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
        SELECT id, email, role, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    )
    return rows
  }
}
