import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  EMBEDDING_MODEL_FALLBACK_CHAIN,
  IMAGE_MODEL_FALLBACK_CHAIN,
  isRetryableGeminiError,
  isRetryableHttpStatus,
  TEXT_MODEL_FALLBACK_CHAIN,
  TTS_MODEL_FALLBACK_CHAIN,
} from '../src/ai/gemini.js'

test('detects 503 high demand as retryable', () => {
  const error = new Error(
    '[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: [503 Service Unavailable] This model is currently experiencing high demand.'
  )
  assert.equal(isRetryableGeminiError(error), true)
})

test('detects quota and rate limit as retryable', () => {
  assert.equal(isRetryableGeminiError(new Error('429 Too Many Requests')), true)
  assert.equal(isRetryableGeminiError(new Error('Resource exhausted: quota exceeded')), true)
})

test('does not retry validation errors', () => {
  assert.equal(isRetryableGeminiError(new Error('400 Bad Request: invalid prompt')), false)
})

test('fallback chain keeps flash first and includes lite/pro backups', () => {
  assert.equal(TEXT_MODEL_FALLBACK_CHAIN[0], 'gemini-2.5-flash')
  assert.ok(TEXT_MODEL_FALLBACK_CHAIN.includes('gemini-2.5-flash-lite'))
  assert.ok(TEXT_MODEL_FALLBACK_CHAIN.includes('gemini-2.5-pro'))
})

test('detects retryable HTTP status codes', () => {
  assert.equal(isRetryableHttpStatus(503), true)
  assert.equal(isRetryableHttpStatus(429), true)
  assert.equal(isRetryableHttpStatus(400), false)
})

test('image, TTS, and embedding chains are non-empty', () => {
  assert.ok(IMAGE_MODEL_FALLBACK_CHAIN.length >= 2)
  assert.ok(TTS_MODEL_FALLBACK_CHAIN.length >= 2)
  assert.ok(EMBEDDING_MODEL_FALLBACK_CHAIN.length >= 2)
})
