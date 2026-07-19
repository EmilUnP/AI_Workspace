export const AI_WORKLOADS = [
  'lightweight_text',
  'lesson_generation',
  'exam_generation',
  'education_plan_generation',
  'teacher_chat',
  'translation',
  'rag_query',
  'embeddings',
  'image_generation',
  'tts',
] as const

export type AiWorkload = (typeof AI_WORKLOADS)[number]

export type AiProviderName = 'openrouter'

export type TokenUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export type AiTextRequest = {
  workload: AiWorkload
  prompt: string
  systemInstruction?: string
  sessionId?: string
  userId?: string
  temperature?: number
  maxTokens?: number
}

export type AiJsonRequest = AiTextRequest & {
  jsonSchema?: {
    name: string
    schema: Record<string, unknown>
    strict?: boolean
  }
}

export type AiTextResult = {
  text: string
  modelUsed: string
  provider: AiProviderName
  usage?: TokenUsage
  generationId?: string
}

export type AiEmbeddingRequest = {
  workload?: AiWorkload
  input: string | string[]
  userId?: string
}

export type AiEmbeddingResult = {
  embeddings: number[][]
  modelUsed: string
  provider: AiProviderName
  dimensions: number
}

export type AiImageRequest = {
  prompt: string
  userId?: string
}

export type AiImageResult = {
  images: Array<{ mimeType: string; base64: string }>
  modelUsed: string
  provider: AiProviderName
}

export type AiTtsRequest = {
  text: string
  voice?: string
  responseFormat?: 'mp3' | 'pcm' | 'wav'
  userId?: string
}

export type AiTtsResult = {
  audio: Buffer
  mimeType: string
  modelUsed: string
  provider: AiProviderName
}

export class AiProviderError extends Error {
  readonly statusCode: number
  readonly retryable: boolean
  readonly code: string

  constructor(message: string, options?: { statusCode?: number; retryable?: boolean; code?: string }) {
    super(message)
    this.name = 'AiProviderError'
    this.statusCode = options?.statusCode ?? 500
    this.retryable = options?.retryable ?? false
    this.code = options?.code ?? 'AI_PROVIDER_ERROR'
  }
}

export function isRetryableProviderStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 529
}

export function sanitizeProviderErrorMessage(message: string): string {
  return message
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer [REDACTED]')
    .replace(/sk-or-[A-Za-z0-9\-]+/gi, '[REDACTED_KEY]')
    .slice(0, 500)
}
