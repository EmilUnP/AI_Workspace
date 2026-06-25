import {
  GoogleGenerativeAI,
  type GenerationConfig,
  type GenerateContentResult,
  type ModelParams,
} from '@google/generative-ai'
import { env } from '../config/env.js'
import { prepareEmbedding } from '../utils/vector.js'

export const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash'

/** Ordered fallbacks when primary flash model is overloaded (503/429). */
export const TEXT_MODEL_FALLBACK_CHAIN = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-001',
  'gemini-flash-latest',
  'gemini-2.0-flash-lite-001',
  'gemini-2.5-pro',
] as const

export const IMAGE_MODEL_FALLBACK_CHAIN = [
  'gemini-2.5-flash-image',
  'gemini-3-pro-image-preview',
  'gemini-2.5-flash-image-preview',
  'gemini-3.1-flash-image-preview',
] as const

export const TTS_MODEL_FALLBACK_CHAIN = [
  'gemini-2.5-flash-preview-tts',
  'gemini-2.5-pro-preview-tts',
  'gemini-3.1-flash-tts-preview',
] as const

export const EMBEDDING_MODEL_FALLBACK_CHAIN = [
  'gemini-embedding-001',
  'gemini-embedding-2',
] as const

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

type GeminiCallOptions = {
  apiKey?: string
}

export type GeminiTextOptions = GeminiCallOptions & {
  model?: string
}

export type GenerateContentWithFallbackOptions = GeminiTextOptions & {
  systemInstruction?: ModelParams['systemInstruction']
  generationConfig?: GenerationConfig
}

export type GenerateContentWithFallbackResult = {
  text: string
  modelUsed: string
  response: GenerateContentResult['response']
}

export type GeminiRestCallResult = {
  data: unknown
  modelUsed: string
  status: number
}

function resolveApiKey(options?: GeminiCallOptions) {
  const key = options?.apiKey || env.GOOGLE_GEMINI_API_KEY
  if (!key) {
    throw new Error('No Gemini API key configured for this user')
  }
  return key
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status === 503 || status === 502 || status === 500
}

export function isRetryableGeminiError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase()
  return (
    message.includes('503') ||
    message.includes('429') ||
    message.includes('service unavailable') ||
    message.includes('high demand') ||
    message.includes('overloaded') ||
    message.includes('resource exhausted') ||
    message.includes('quota') ||
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('temporarily unavailable') ||
    message.includes('unavailable')
  )
}

function buildModelChain(primary: string | undefined, chain: readonly string[]): string[] {
  const base = [...chain]
  if (!primary) return base
  return [primary, ...base.filter((model) => model !== primary)]
}

/** Low-level REST generateContent with model fallback (image, TTS, etc.). */
export async function postGeminiGenerateContentWithFallback(options: {
  apiKey: string
  models: readonly string[]
  primaryModel?: string
  body: Record<string, unknown>
  maxRetriesPerModel?: number
  retryDelayMs?: number
}): Promise<GeminiRestCallResult | null> {
  const models = buildModelChain(options.primaryModel, options.models)
  const maxRetries = options.maxRetriesPerModel ?? 1
  const retryDelayMs = options.retryDelayMs ?? 400

  for (const modelName of models) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const apiUrl = `${GEMINI_API_BASE}/${modelName}:generateContent?key=${options.apiKey}`
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options.body),
      })

      if (response.ok) {
        return {
          data: await response.json(),
          modelUsed: modelName,
          status: response.status,
        }
      }

      const errorText = await response.text()
      const retryable = isRetryableHttpStatus(response.status) || isRetryableGeminiError(errorText)
      console.warn(
        `[gemini] REST ${modelName} failed (${response.status}) attempt ${attempt + 1}/${maxRetries + 1}:`,
        errorText.slice(0, 200)
      )

      if (retryable && attempt < maxRetries) {
        await sleep(retryDelayMs * (attempt + 1))
        continue
      }

      if (!retryable) break
    }
  }

  return null
}

export async function generateContentWithFallback(
  prompt: string,
  options?: GenerateContentWithFallbackOptions
): Promise<GenerateContentWithFallbackResult> {
  const apiKey = resolveApiKey(options)
  const models = buildModelChain(options?.model, TEXT_MODEL_FALLBACK_CHAIN)
  let lastError: unknown

  for (const modelName of models) {
    try {
      const client = new GoogleGenerativeAI(apiKey)
      const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction: options?.systemInstruction,
        generationConfig: options?.generationConfig,
      })
      const result = await model.generateContent(prompt)
      const text = result.response?.text()?.trim() || ''
      return {
        text,
        modelUsed: modelName,
        response: result.response,
      }
    } catch (error) {
      lastError = error
      if (!isRetryableGeminiError(error)) {
        throw error
      }
      console.warn(
        `[gemini] ${modelName} unavailable, trying next model:`,
        error instanceof Error ? error.message : error
      )
      await sleep(300)
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export async function generateText(prompt: string, options?: GeminiTextOptions) {
  const result = await generateContentWithFallback(prompt, options)
  return result.text
}

export async function generateJson<T>(prompt: string, options?: GeminiTextOptions): Promise<T> {
  const text = await generateText(`${prompt}\n\nReturn ONLY valid JSON.`, options)
  const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim()
  return JSON.parse(jsonText) as T
}

export async function generateEmbedding(
  text: string,
  model = EMBEDDING_MODEL_FALLBACK_CHAIN[0],
  options?: GeminiCallOptions
) {
  const apiKey = resolveApiKey(options)
  const client = new GoogleGenerativeAI(apiKey)
  const models = buildModelChain(model, EMBEDDING_MODEL_FALLBACK_CHAIN)
  let lastError: unknown

  for (const modelName of models) {
    try {
      const m = client.getGenerativeModel({ model: modelName })
      const res = await m.embedContent(text)
      return prepareEmbedding(res.embedding.values)
    } catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('404')) {
        continue
      }
      if (!isRetryableGeminiError(error)) {
        throw error
      }
      console.warn(
        `[gemini] embedding ${modelName} unavailable, trying next model:`,
        message
      )
      await sleep(300)
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}
