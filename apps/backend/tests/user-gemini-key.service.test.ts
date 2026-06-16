import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isValidGeminiApiKeyFormat } from '../src/services/user-gemini-key.service.js'

test('accepts legacy AIza standard keys', () => {
  assert.equal(isValidGeminiApiKeyFormat('AIzaSyD-example-key-with-enough-length'), true)
})

test('accepts new AQ. auth keys from AI Studio', () => {
  assert.equal(
    isValidGeminiApiKeyFormat('AQ.EXAMPLE-FAKE-KEY-FOR-TESTS-ONLY-xxxxxxxxxxxxxxxx'),
    true
  )
})

test('rejects unknown key prefixes', () => {
  assert.equal(isValidGeminiApiKeyFormat('sk-invalid-key-format-example'), false)
})
