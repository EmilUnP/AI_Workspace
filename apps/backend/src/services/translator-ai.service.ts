import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import { AiGateway } from '../ai/gateway.js'

const translateSchema = z.object({
  text: z.string().min(1),
  toLanguage: z.string().min(1)
})

export class TranslatorAiService {
  constructor(private readonly app: FastifyInstance) {}

  async translate(userId: string, input: unknown) {
    const data = translateSchema.parse(input)
    const gateway = new AiGateway(this.app)
    const result = await gateway.generateText({
      workload: 'translation',
      prompt: `Translate this text to ${data.toLanguage}:\n\n${data.text}`,
      userId,
    })
    return { translatedText: result.text }
  }
}
