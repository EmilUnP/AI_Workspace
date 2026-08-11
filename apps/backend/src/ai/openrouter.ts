import { env } from '../config/env.js'
import { prepareEmbedding, EMBEDDING_DIMENSIONS } from '../utils/vector.js'
import {
  AiProviderError,
  isRetryableProviderStatus,
  sanitizeProviderErrorMessage,
  type AiEmbeddingResult,
  type AiImageResult,
  type AiTextResult,
  type AiTtsResult,
  type TokenUsage,
} from './types.js'

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

type OpenRouterChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<Record<string, unknown>>
}

type OpenRouterChatResponse = {
  id?: string
  model?: string
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string; image_url?: { url?: string } }>
    }
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  error?: { message?: string; code?: number }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function mapUsage(usage?: OpenRouterChatResponse['usage']): TokenUsage | undefined {
  if (!usage) return undefined
  return {
    promptTokens: usage.prompt_tokens ?? 0,
    completionTokens: usage.completion_tokens ?? 0,
    totalTokens: usage.total_tokens ?? 0,
  }
}

function extractTextContent(content: OpenRouterChatResponse['choices']): string {
  const messageContent = content?.[0]?.message?.content
  if (typeof messageContent === 'string') return messageContent.trim()
  if (Array.isArray(messageContent)) {
    return messageContent
      .filter((part) => part.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text as string)
      .join('\n')
      .trim()
  }
  return ''
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl)
  if (!match) return null
  return { mimeType: match[1], base64: match[2] }
}

export class OpenRouterClient {
  constructor(private readonly apiKey: string) {}

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.OPENROUTER_HTTP_REFERER,
      'X-Title': env.OPENROUTER_APP_TITLE,
    }
  }

  async chatCompletion(options: {
    models: string[]
    messages: OpenRouterChatMessage[]
    temperature?: number
    maxTokens?: number
    sessionId?: string
    user?: string
    preferZdr?: boolean
    requireStructuredOutputs?: boolean
    jsonSchema?: { name: string; schema: Record<string, unknown>; strict?: boolean }
    modalities?: string[]
  }): Promise<AiTextResult & { raw: OpenRouterChatResponse }> {
    const [primary, ...fallbacks] = options.models
    if (!primary) {
      throw new AiProviderError('No models configured for OpenRouter request', {
        statusCode: 500,
        code: 'NO_MODELS',
      })
    }

    const body: Record<string, unknown> = {
      model: primary,
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      user: options.user,
      route: 'fallback',
      models: fallbacks.length > 0 ? fallbacks : undefined,
      provider: {
        allow_fallbacks: true,
        ...(options.preferZdr ? { zdr: true } : {}),
        ...(options.requireStructuredOutputs
          ? { require_parameters: true }
          : {}),
      },
    }

    if (options.modalities?.length) {
      body.modalities = options.modalities
    }

    if (options.jsonSchema) {
      body.response_format = {
        type: 'json_schema',
        json_schema: {
          name: options.jsonSchema.name,
          strict: options.jsonSchema.strict ?? true,
          schema: options.jsonSchema.schema,
        },
      }
    }

    const headers: Record<string, string> = this.headers()
    if (options.sessionId) {
      headers['X-Session-Id'] = options.sessionId
    }

    let lastError: unknown
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(env.OPENROUTER_TIMEOUT_MS),
        })

        const rawText = await response.text()
        let data: OpenRouterChatResponse
        try {
          data = JSON.parse(rawText) as OpenRouterChatResponse
        } catch {
          throw new AiProviderError(
            sanitizeProviderErrorMessage(`OpenRouter returned non-JSON: ${rawText.slice(0, 200)}`),
            { statusCode: response.status, retryable: isRetryableProviderStatus(response.status) }
          )
        }

        if (!response.ok) {
          const message = sanitizeProviderErrorMessage(
            data.error?.message || rawText || `OpenRouter HTTP ${response.status}`
          )
          const retryable = isRetryableProviderStatus(response.status)
          if (retryable && attempt < 2) {
            await sleep(300 * (attempt + 1))
            lastError = new AiProviderError(message, {
              statusCode: response.status,
              retryable: true,
              code: response.status === 402 ? 'INSUFFICIENT_CREDITS' : 'RETRYABLE',
            })
            continue
          }
          throw new AiProviderError(message, {
            statusCode: response.status === 402 ? 402 : response.status,
            retryable,
            code: response.status === 402 ? 'INSUFFICIENT_CREDITS' : 'OPENROUTER_ERROR',
          })
        }

        const text = extractTextContent(data.choices)
        return {
          text,
          modelUsed: data.model || primary,
          provider: 'openrouter',
          usage: mapUsage(data.usage),
          generationId: data.id,
          raw: data,
        }
      } catch (error) {
        lastError = error
        if (error instanceof AiProviderError && !error.retryable) throw error
        if (attempt < 2) {
          await sleep(300 * (attempt + 1))
          continue
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new AiProviderError('OpenRouter request failed', { retryable: true })
  }

  async generateImage(options: {
    models: string[]
    prompt: string
    user?: string
    preferZdr?: boolean
  }): Promise<AiImageResult> {
    const result = await this.chatCompletion({
      models: options.models,
      messages: [{ role: 'user', content: options.prompt }],
      user: options.user,
      preferZdr: options.preferZdr,
      modalities: ['image', 'text'],
    })

    const images: AiImageResult['images'] = []
    const content = result.raw.choices?.[0]?.message?.content
    if (Array.isArray(content)) {
      for (const part of content) {
        const url = part.image_url?.url
        if (!url) continue
        const parsed = parseDataUrl(url)
        if (parsed) images.push(parsed)
      }
    } else if (typeof content === 'string') {
      const dataUrlMatch = content.match(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/)
      if (dataUrlMatch) {
        const parsed = parseDataUrl(dataUrlMatch[0])
        if (parsed) images.push(parsed)
      }
    }

    if (images.length === 0) {
      throw new AiProviderError('OpenRouter image response contained no image data', {
        statusCode: 502,
        code: 'NO_IMAGE',
      })
    }

    return {
      images,
      modelUsed: result.modelUsed,
      provider: 'openrouter',
    }
  }

  async createEmbedding(options: {
    models: string[]
    input: string | string[]
    user?: string
    preferZdr?: boolean
  }): Promise<AiEmbeddingResult> {
    let lastError: unknown
    for (const model of options.models) {
      try {
        const body: Record<string, unknown> = {
          model,
          input: options.input,
          encoding_format: 'float',
          provider: {
            allow_fallbacks: true,
            ...(options.preferZdr ? { zdr: true } : {}),
          },
        }

        // Keep embedding vectors in the existing 768-dim pgvector schema.
        if (model.includes('text-embedding-3')) {
          body.dimensions = EMBEDDING_DIMENSIONS
        }

        const response = await fetch(`${OPENROUTER_BASE}/embeddings`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(env.OPENROUTER_TIMEOUT_MS),
        })

        const data = (await response.json()) as {
          data?: Array<{ embedding?: number[] }>
          model?: string
          error?: { message?: string }
        }

        if (!response.ok) {
          const message = sanitizeProviderErrorMessage(
            data.error?.message || `OpenRouter embeddings HTTP ${response.status}`
          )
          if (isRetryableProviderStatus(response.status) || response.status === 404) {
            lastError = new AiProviderError(message, {
              statusCode: response.status,
              retryable: true,
            })
            continue
          }
          throw new AiProviderError(message, { statusCode: response.status })
        }

        const embeddings = (data.data || [])
          .map((item) => item.embedding || [])
          .filter((values) => values.length > 0)
          .map((values) => prepareEmbedding(values))

        if (embeddings.length === 0) {
          throw new AiProviderError('OpenRouter embedding response was empty', {
            statusCode: 502,
            code: 'EMPTY_EMBEDDING',
          })
        }

        return {
          embeddings,
          modelUsed: data.model || model,
          provider: 'openrouter',
          dimensions: embeddings[0].length,
        }
      } catch (error) {
        lastError = error
        if (error instanceof AiProviderError && !error.retryable) throw error
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new AiProviderError('OpenRouter embedding request failed', { retryable: true })
  }

  async createSpeech(options: {
    models: string[]
    input: string
    voice?: string
    responseFormat?: 'mp3' | 'pcm' | 'wav'
  }): Promise<AiTtsResult> {
    let lastError: unknown
    for (const model of options.models) {
      try {
        const response = await fetch(`${OPENROUTER_BASE}/audio/speech`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({
            model,
            input: options.input,
            voice: options.voice || 'nova',
            response_format: options.responseFormat || 'mp3',
          }),
          signal: AbortSignal.timeout(env.OPENROUTER_TIMEOUT_MS),
        })

        if (!response.ok) {
          const errorText = await response.text()
          const message = sanitizeProviderErrorMessage(errorText || `OpenRouter TTS HTTP ${response.status}`)
          if (isRetryableProviderStatus(response.status) || response.status === 404) {
            lastError = new AiProviderError(message, {
              statusCode: response.status,
              retryable: true,
            })
            continue
          }
          throw new AiProviderError(message, { statusCode: response.status })
        }

        const audio = Buffer.from(await response.arrayBuffer())
        const contentType = response.headers.get('content-type') || 'audio/mpeg'
        return {
          audio,
          mimeType: contentType,
          modelUsed: model,
          provider: 'openrouter',
        }
      } catch (error) {
        lastError = error
        if (error instanceof AiProviderError && !error.retryable) throw error
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new AiProviderError('OpenRouter TTS request failed', { retryable: true })
  }

  async listModels(): Promise<unknown[]> {
    const response = await fetch(`${OPENROUTER_BASE}/models`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(env.OPENROUTER_TIMEOUT_MS),
    })
    const data = (await response.json()) as { data?: unknown[]; error?: { message?: string } }
    if (!response.ok) {
      throw new AiProviderError(
        sanitizeProviderErrorMessage(data.error?.message || `OpenRouter models HTTP ${response.status}`),
        { statusCode: response.status }
      )
    }
    return data.data || []
  }

  async testConnection(): Promise<{ ok: boolean; modelUsed?: string; error?: string }> {
    try {
      const result = await this.chatCompletion({
        models: ['openai/gpt-5.4-nano', 'deepseek/deepseek-v4-flash'],
        messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
        maxTokens: 8,
        temperature: 0,
      })
      return { ok: true, modelUsed: result.modelUsed }
    } catch (error) {
      return {
        ok: false,
        error: sanitizeProviderErrorMessage(error instanceof Error ? error.message : String(error)),
      }
    }
  }
}

export function stripJsonFences(text: string): string {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim()
}
