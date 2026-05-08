import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { env } from '../config/env.js'

const GEMINI_PROVIDER = 'gemini'

const saveGeminiKeySchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(20, 'Gemini API key is too short')
    .max(256, 'Gemini API key is too long')
    .refine((value) => value.startsWith('AIza'), 'Gemini API key must start with AIza')
})

function buildCryptoKey() {
  return createHash('sha256').update(env.JWT_ACCESS_SECRET).digest()
}

function encryptApiKey(raw: string) {
  const iv = randomBytes(12)
  const key = buildCryptoKey()
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(raw, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`
}

function decryptApiKey(payload: string) {
  const [version, ivRaw, tagRaw, encryptedRaw] = payload.split(':')
  if (version !== 'v1' || !ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error('Invalid encrypted key payload')
  }
  const iv = Buffer.from(ivRaw, 'base64url')
  const tag = Buffer.from(tagRaw, 'base64url')
  const encrypted = Buffer.from(encryptedRaw, 'base64url')
  const key = buildCryptoKey()
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}

type GeminiKeyRow = {
  encrypted_key: string
  key_hint: string
}

export class UserGeminiKeyService {
  constructor(private readonly app: FastifyInstance) {}

  async save(userId: string, input: unknown) {
    const data = saveGeminiKeySchema.parse(input)
    const encrypted = encryptApiKey(data.apiKey)
    const keyHint = data.apiKey.slice(-4)

    await this.app.db.query(
      `INSERT INTO user_ai_provider_keys (user_id, provider, encrypted_key, key_hint, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, provider)
       DO UPDATE SET encrypted_key = EXCLUDED.encrypted_key, key_hint = EXCLUDED.key_hint, updated_at = NOW()`,
      [userId, GEMINI_PROVIDER, encrypted, keyHint]
    )

    return { hasKey: true, keyHint }
  }

  async getStatus(userId: string) {
    const { rows } = await this.app.db.query<Pick<GeminiKeyRow, 'key_hint'>>(
      `SELECT key_hint FROM user_ai_provider_keys WHERE user_id = $1 AND provider = $2 LIMIT 1`,
      [userId, GEMINI_PROVIDER]
    )
    const row = rows[0]
    return {
      hasKey: Boolean(row),
      keyHint: row?.key_hint ?? null
    }
  }

  async remove(userId: string) {
    await this.app.db.query(`DELETE FROM user_ai_provider_keys WHERE user_id = $1 AND provider = $2`, [
      userId,
      GEMINI_PROVIDER
    ])
    return { hasKey: false, keyHint: null as string | null }
  }

  async resolveDecryptedKey(userId: string) {
    const { rows } = await this.app.db.query<GeminiKeyRow>(
      `SELECT encrypted_key, key_hint FROM user_ai_provider_keys WHERE user_id = $1 AND provider = $2 LIMIT 1`,
      [userId, GEMINI_PROVIDER]
    )
    const row = rows[0]
    if (!row) return null
    const apiKey = decryptApiKey(row.encrypted_key)
    return { apiKey, keyHint: row.key_hint }
  }
}
