import type { FastifyInstance } from 'fastify'
import { env } from '../config/env.js'
import { UserGeminiKeyService } from './user-gemini-key.service.js'

export async function resolveGeminiApiKeyForUser(app: FastifyInstance, userId: string) {
  const keyService = new UserGeminiKeyService(app)
  const userKey = await keyService.resolveDecryptedKey(userId)
  if (userKey?.apiKey) return userKey.apiKey
  if (env.GOOGLE_GEMINI_API_KEY) return env.GOOGLE_GEMINI_API_KEY
  const error = new Error('Gemini API key is missing for this user.') as Error & {
    statusCode?: number
    code?: string
    hint?: string
  }
  error.statusCode = 400
  error.code = 'MISSING_GEMINI_API_KEY'
  error.hint = 'Open /school-admin/api-integration and save your Gemini API key.'
  throw error
}
