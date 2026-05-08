import { z } from 'zod'
import { generateText } from '../ai/gemini.js'
import type { FastifyInstance } from 'fastify'
import { resolveGeminiApiKeyForUser } from './gemini-key-resolver.service.js'

const translateSchema = z.object({
  text: z.string().min(1),
  toLanguage: z.string().min(1)
})

export class TranslatorAiService {
  constructor(private readonly app: FastifyInstance) {}

  async translate(userId: string, input: unknown) {
    const data = translateSchema.parse(input)
    const apiKey = await resolveGeminiApiKeyForUser(this.app, userId)
    const text = await generateText(`Translate this text to ${data.toLanguage}:\n\n${data.text}`, 'gemini-2.5-flash', { apiKey })
    return { translatedText: text }
  }
}
