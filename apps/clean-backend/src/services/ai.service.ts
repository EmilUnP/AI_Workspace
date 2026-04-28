import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AiRepository } from '../repositories/ai.repository.js'

const createAiRequestSchema = z.object({
  type: z.string().min(1),
  payload: z.record(z.string(), z.unknown())
})

export class AiService {
  private readonly aiRepo: AiRepository

  constructor(app: FastifyInstance) {
    this.aiRepo = new AiRepository(app)
  }

  async create(userId: string, input: unknown) {
    const data = createAiRequestSchema.parse(input)
    const request = await this.aiRepo.createRequest({
      userId,
      type: data.type,
      payload: data.payload
    })

    // Phase-1 placeholder execution: sync-complete to keep API contract simple.
    return this.aiRepo.setCompleted(request.id, userId, {
      message: 'AI request accepted in clean backend phase-1',
      echo: data.payload
    })
  }

  async getById(userId: string, id: string) {
    return this.aiRepo.getByIdForUser(id, userId)
  }
}
