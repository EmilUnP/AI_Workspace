import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { UsersRepository } from '../repositories/users.repository.js'
import { hashPassword } from '../utils/security.js'

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0)
})

const updatePasswordSchema = z.object({
  userId: z.uuid(),
  password: z.string().min(8)
})

const adminCreateUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  role: z.enum(['operator', 'user']).default('operator'),
  manual_note: z.string().max(1000).optional()
})

export class UsersService {
  private readonly usersRepo: UsersRepository

  constructor(app: FastifyInstance) {
    this.usersRepo = new UsersRepository(app)
  }

  async me(userId: string) {
    return this.usersRepo.findById(userId)
  }

  async list(query: unknown) {
    const data = listQuerySchema.parse(query)
    return this.usersRepo.list(data.limit, data.offset)
  }

  async adminCreate(input: unknown) {
    const data = adminCreateUserSchema.parse(input)
    const existing = await this.usersRepo.findByEmail(data.email)
    if (existing) {
      const error = new Error('Email already exists') as Error & { statusCode?: number }
      error.statusCode = 409
      throw error
    }
    const passwordHash = await hashPassword(data.password)
    const user = await this.usersRepo.create(
      data.email,
      passwordHash,
      data.role,
      data.manual_note
    )
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      manual_note: user.manual_note,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }
  }

  async updatePassword(input: unknown) {
    const data = updatePasswordSchema.parse(input)
    const passwordHash = await hashPassword(data.password)
    const updated = await this.usersRepo.updatePasswordById(data.userId, passwordHash)
    if (!updated) {
      const error = new Error('User not found') as Error & { statusCode?: number }
      error.statusCode = 404
      throw error
    }
    return { success: true }
  }
}
