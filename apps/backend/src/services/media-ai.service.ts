import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import { AiGateway } from '../ai/gateway.js'

const textSchema = z.object({ text: z.string().min(1) })
const imageSchema = z.object({ prompt: z.string().min(1) })

export class MediaAiService {
  constructor(private readonly app: FastifyInstance) {}

  async tts(userId: string, input: unknown) {
    const data = textSchema.parse(input)
    const gateway = new AiGateway(this.app)
    const result = await gateway.generateSpeech({
      text: data.text,
      userId,
      responseFormat: 'mp3',
    })
    return {
      mode: 'openrouter',
      mimeType: result.mimeType,
      modelUsed: result.modelUsed,
      audioBase64: result.audio.toString('base64'),
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
    const gateway = new AiGateway(this.app)
    const rewritten = await gateway.generateText({
      workload: 'lightweight_text',
      userId,
      prompt: `Rewrite this image prompt to be clear and production-ready:\n${data.prompt}`,
    })
    return {
      mode: 'openrouter',
      rewrittenPrompt: rewritten.text,
      modelUsed: rewritten.modelUsed,
    }
  }
}
