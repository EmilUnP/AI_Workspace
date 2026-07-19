import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { env } from '../config/env.js'

function buildCryptoKey() {
  const secret = env.AI_CREDENTIALS_ENCRYPTION_KEY || env.JWT_ACCESS_SECRET
  return createHash('sha256').update(secret).digest()
}

export function encryptSecret(raw: string): string {
  const iv = randomBytes(12)
  const key = buildCryptoKey()
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(raw, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`
}

export function decryptSecret(payload: string): string {
  const [version, ivRaw, tagRaw, encryptedRaw] = payload.split(':')
  if (version !== 'v1' || !ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error('Invalid encrypted secret payload')
  }
  const iv = Buffer.from(ivRaw, 'base64url')
  const tag = Buffer.from(tagRaw, 'base64url')
  const encrypted = Buffer.from(encryptedRaw, 'base64url')
  const key = buildCryptoKey()
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export function secretHint(raw: string, length = 4): string {
  if (raw.length <= length) return raw
  return raw.slice(-length)
}
