import type { FastifyInstance } from 'fastify'
import { createHash } from 'node:crypto'
import { AiProviderConfigService } from '../services/ai-provider-config.service.js'
import { OpenRouterClient, stripJsonFences } from './openrouter.js'
import {
  AiProviderError,
  type AiEmbeddingRequest,
  type AiEmbeddingResult,
  type AiImageRequest,
  type AiImageResult,
  type AiJsonRequest,
  type AiTextRequest,
  type AiTextResult,
  type AiTtsRequest,
  type AiTtsResult,
  type AiWorkload,
} from './types.js'

function pseudonymousUser(userId?: string): string | undefined {
  if (!userId) return undefined
  return createHash('sha256').update(`eduator:${userId}`).digest('hex').slice(0, 32)
}

export class AiGateway {
  private readonly config: AiProviderConfigService

  constructor(app: FastifyInstance) {
    this.config = new AiProviderConfigService(app)
  }

  private async client() {
    const apiKey = await this.config.resolveApiKey()
    return new OpenRouterClient(apiKey)
  }

  private async resolveModels(workload: AiWorkload) {
    const policy = await this.config.getPolicy(workload)
    return {
      models: policy.model_chain,
      requireStructuredOutputs: policy.require_structured_outputs,
      preferZdr: policy.prefer_zdr,
    }
  }

  async generateText(request: AiTextRequest): Promise<AiTextResult> {
    const policy = await this.resolveModels(request.workload)
    const client = await this.client()
    const messages = [
      ...(request.systemInstruction
        ? [{ role: 'system' as const, content: request.systemInstruction }]
        : []),
      { role: 'user' as const, content: request.prompt },
    ]

    return client.chatCompletion({
      models: policy.models,
      messages,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      sessionId: request.sessionId,
      user: pseudonymousUser(request.userId),
      preferZdr: policy.preferZdr,
    })
  }

  async generateJson<T>(request: AiJsonRequest): Promise<T> {
    const policy = await this.resolveModels(request.workload)
    const client = await this.client()
    const messages = [
      ...(request.systemInstruction
        ? [{ role: 'system' as const, content: request.systemInstruction }]
        : []),
      {
        role: 'user' as const,
        content: `${request.prompt}\n\nReturn ONLY valid JSON.`,
      },
    ]

    const result = await client.chatCompletion({
      models: policy.models,
      messages,
      temperature: request.temperature ?? 0.2,
      maxTokens: request.maxTokens,
      sessionId: request.sessionId,
      user: pseudonymousUser(request.userId),
      preferZdr: policy.preferZdr,
      requireStructuredOutputs: policy.requireStructuredOutputs || Boolean(request.jsonSchema),
      jsonSchema: request.jsonSchema,
    })

    const jsonText = stripJsonFences(result.text)
    try {
      return JSON.parse(jsonText) as T
    } catch {
      throw new AiProviderError('Model returned invalid JSON', {
        statusCode: 502,
        code: 'INVALID_JSON',
      })
    }
  }

  async generateEmbedding(request: AiEmbeddingRequest): Promise<AiEmbeddingResult> {
    const policy = await this.resolveModels(request.workload || 'embeddings')
    const client = await this.client()
    return client.createEmbedding({
      models: policy.models,
      input: request.input,
      user: pseudonymousUser(request.userId),
      preferZdr: policy.preferZdr,
    })
  }

  async generateImage(request: AiImageRequest): Promise<AiImageResult> {
    const policy = await this.resolveModels('image_generation')
    const client = await this.client()
    return client.generateImage({
      models: policy.models,
      prompt: request.prompt,
      user: pseudonymousUser(request.userId),
      preferZdr: policy.preferZdr,
    })
  }

  async generateSpeech(request: AiTtsRequest): Promise<AiTtsResult> {
    const policy = await this.resolveModels('tts')
    const client = await this.client()
    // Chat models (gemini-2.5-flash) must never be sent to /audio/speech — OpenRouter
    // records empty 0-token rows and no real TTS audio is produced.
    const models = sanitizeTtsModelChain(policy.models)
    const primary = models[0]
    const voice = request.voice?.trim() || defaultTtsVoiceForModel(primary)
    // Gemini TTS playground uses PCM; mp3 is often unsupported / empty for these models.
    const responseFormat =
      request.responseFormat ||
      (primary.includes('gemini') || primary.startsWith('google/') ? 'pcm' : 'mp3')
    return client.createSpeech({
      models,
      input: request.text,
      voice,
      responseFormat,
    })
  }
}

const DEFAULT_GEMINI_TTS_MODEL = 'google/gemini-3.1-flash-tts-preview'

/** Only models with speech/TTS capability belong on the /audio/speech endpoint. */
export function isSpeechCapableModel(model: string): boolean {
  const id = model.trim().toLowerCase()
  if (!id) return false
  if (id.includes('tts') || id.includes('speech') || id.includes('kokoro') || id.includes('voxtral')) {
    return true
  }
  // Explicit allowlist for known OpenRouter speech models without those substrings
  return false
}

export function sanitizeTtsModelChain(models: string[]): string[] {
  const cleaned = models.map((m) => m.trim()).filter((m) => isSpeechCapableModel(m))
  return cleaned.length > 0 ? cleaned : [DEFAULT_GEMINI_TTS_MODEL]
}

/** Gemini TTS voices (Zephyr/Kore/…); OpenAI-style voices (nova/alloy) fail on Gemini models. */
function defaultTtsVoiceForModel(model: string): string {
  const id = model.toLowerCase()
  if (id.includes('gemini') || id.startsWith('google/')) return 'Zephyr'
  return 'nova'
}

/** Convenience helpers that mirror the legacy helper surface. */
export async function generateText(
  app: FastifyInstance,
  prompt: string,
  options?: {
    workload?: AiWorkload
    systemInstruction?: string
    sessionId?: string
    userId?: string
  }
) {
  const gateway = new AiGateway(app)
  const result = await gateway.generateText({
    workload: options?.workload || 'lightweight_text',
    prompt,
    systemInstruction: options?.systemInstruction,
    sessionId: options?.sessionId,
    userId: options?.userId,
  })
  return result.text
}

export async function generateJson<T>(
  app: FastifyInstance,
  prompt: string,
  options?: {
    workload?: AiWorkload
    userId?: string
    jsonSchema?: AiJsonRequest['jsonSchema']
  }
): Promise<T> {
  const gateway = new AiGateway(app)
  return gateway.generateJson<T>({
    workload: options?.workload || 'lightweight_text',
    prompt,
    userId: options?.userId,
    jsonSchema: options?.jsonSchema,
  })
}

export async function generateEmbedding(
  app: FastifyInstance,
  text: string,
  options?: { userId?: string }
) {
  const gateway = new AiGateway(app)
  const result = await gateway.generateEmbedding({ input: text, userId: options?.userId })
  return result.embeddings[0]
}
