import { z } from 'zod'
import { generateText } from '../ai/gemini.js'
import type { FastifyInstance } from 'fastify'
import { resolveGeminiApiKeyForUser } from './gemini-key-resolver.service.js'

const textSchema = z.object({ text: z.string().min(1) })
const imageSchema = z.object({ prompt: z.string().min(1) })

export class MediaAiService {
  constructor(private readonly app: FastifyInstance) {}

  async tts(input: unknown) {
    const data = textSchema.parse(input)
    // Phase-1 local clean backend: returns script output placeholder metadata.
    return {
      mode: 'phase1_placeholder',
      message: 'TTS endpoint is migrated and ready; binary synthesis provider wiring is next.',
      text: data.text
    }
  }

  async stt(input: unknown) {
    const data = textSchema.parse(input)
    return {
      mode: 'phase1_placeholder',
      transcript: data.text
    }
  }

  async image(userId: string, input: unknown) {
    const data = imageSchema.parse(input)
    const apiKey = await resolveGeminiApiKeyForUser(this.app, userId)
    const rewrittenPrompt = await generateText(
      `Rewrite this image prompt to be clear and production-ready:\n${data.prompt}`,
      { apiKey }
    )
    return {
      mode: 'phase1_placeholder',
      rewrittenPrompt
    }
  }
}
