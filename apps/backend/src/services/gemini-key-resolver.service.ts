import type { FastifyInstance } from 'fastify'
import { env } from '../config/env.js'
import { UserGeminiKeyService } from './user-gemini-key.service.js'

export async function resolveGeminiApiKeyForUser(app: FastifyInstance, userId: string) {
  const keyService = new UserGeminiKeyService(app)
  const userKey = await keyService.resolveDecryptedKey(userId)
  if (userKey?.apiKey) return userKey.apiKey
  if (env.GOOGLE_GEMINI_API_KEY) return env.GOOGLE_GEMINI_API_KEY
  throw new Error('Gemini API key is not configured. Add your key in API Integration.')
}
