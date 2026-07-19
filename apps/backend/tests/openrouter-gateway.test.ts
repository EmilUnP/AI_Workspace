import assert from 'node:assert/strict'
import { describe, it, before } from 'node:test'

process.env.NODE_ENV = process.env.NODE_ENV || 'test'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/eduator_clean'
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-jwt-access-secret-at-least-32-chars'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-at-least-32-chars'
process.env.AI_CREDENTIALS_ENCRYPTION_KEY =
  process.env.AI_CREDENTIALS_ENCRYPTION_KEY || 'test-ai-credentials-encryption-key-32chars'

describe('openrouter migration helpers', () => {
  let stripJsonFences: typeof import('../src/ai/openrouter.js').stripJsonFences
  let AI_WORKLOADS: typeof import('../src/ai/types.js').AI_WORKLOADS
  let isRetryableProviderStatus: typeof import('../src/ai/types.js').isRetryableProviderStatus
  let sanitizeProviderErrorMessage: typeof import('../src/ai/types.js').sanitizeProviderErrorMessage
  let encryptSecret: typeof import('../src/utils/ai-credentials-crypto.js').encryptSecret
  let decryptSecret: typeof import('../src/utils/ai-credentials-crypto.js').decryptSecret
  let secretHint: typeof import('../src/utils/ai-credentials-crypto.js').secretHint
  let prepareEmbedding: typeof import('../src/utils/vector.js').prepareEmbedding
  let EMBEDDING_DIMENSIONS: typeof import('../src/utils/vector.js').EMBEDDING_DIMENSIONS

  before(async () => {
    ;({ stripJsonFences } = await import('../src/ai/openrouter.js'))
    ;({ AI_WORKLOADS, isRetryableProviderStatus, sanitizeProviderErrorMessage } = await import(
      '../src/ai/types.js'
    ))
    ;({ encryptSecret, decryptSecret, secretHint } = await import('../src/utils/ai-credentials-crypto.js'))
    ;({ prepareEmbedding, EMBEDDING_DIMENSIONS } = await import('../src/utils/vector.js'))
  })

  it('includes all planned workloads', () => {
    assert.ok(AI_WORKLOADS.includes('lesson_generation'))
    assert.ok(AI_WORKLOADS.includes('embeddings'))
    assert.ok(AI_WORKLOADS.includes('tts'))
    assert.equal(AI_WORKLOADS.length, 10)
  })

  it('classifies retryable provider statuses', () => {
    assert.equal(isRetryableProviderStatus(429), true)
    assert.equal(isRetryableProviderStatus(529), true)
    assert.equal(isRetryableProviderStatus(402), false)
    assert.equal(isRetryableProviderStatus(400), false)
  })

  it('redacts secrets from provider errors', () => {
    const message = sanitizeProviderErrorMessage(
      'Unauthorized Bearer sk-or-v1-abcdefghijklmnopqrstuvwxyz and token'
    )
    assert.ok(!message.includes('sk-or-v1-abcdefghijklmnopqrstuvwxyz'))
    assert.ok(message.includes('[REDACTED'))
  })

  it('strips markdown fences from JSON responses', () => {
    assert.equal(stripJsonFences('```json\n{"a":1}\n```'), '{"a":1}')
  })

  it('encrypts and decrypts AI credentials', () => {
    const raw = 'sk-or-v1-example-secret-key-value'
    const encrypted = encryptSecret(raw)
    assert.notEqual(encrypted, raw)
    assert.equal(decryptSecret(encrypted), raw)
    assert.equal(secretHint(raw), 'alue')
  })

  it('keeps embeddings at the pgvector dimension', () => {
    const values = Array.from({ length: 1536 }, (_, i) => i + 1)
    const prepared = prepareEmbedding(values)
    assert.equal(prepared.length, EMBEDDING_DIMENSIONS)
    const norm = Math.sqrt(prepared.reduce((sum, value) => sum + value * value, 0))
    assert.ok(Math.abs(norm - 1) < 1e-6)
  })
})
