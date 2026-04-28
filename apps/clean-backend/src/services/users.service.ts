import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { UsersRepository } from '../repositories/users.repository.js'

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0)
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
}
