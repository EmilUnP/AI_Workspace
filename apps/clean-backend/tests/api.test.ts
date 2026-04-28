import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-12345678901234567890'
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-1234567890123456789'
process.env.DATABASE_URL ??= ''

const canRunIntegration = Boolean(process.env.DATABASE_URL)

test('health endpoint works', async () => {
  if (!canRunIntegration) return
  const { buildApp } = await import('../src/app.js')
  const app = await buildApp()
  const response = await app.inject({ method: 'GET', url: '/health' })
  assert.equal(response.statusCode, 200)
  const payload = response.json()
  assert.equal(payload.ok, true)
  await app.close()
})

test('auth + documents + ai flow', async () => {
  if (!canRunIntegration) return

  const { buildApp } = await import('../src/app.js')
  const { pool } = await import('../src/db/client.js')
  const app = await buildApp()
  const email = `test-${randomUUID()}@clean.local`
  const password = 'password123'

  await pool.query('DELETE FROM ai_requests')
  await pool.query('DELETE FROM documents')
  await pool.query("DELETE FROM users WHERE email LIKE 'test-%@clean.local'")

  const registerRes = await app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: { email, password, role: 'user' }
  })
  assert.equal(registerRes.statusCode, 201)
  const registerPayload = registerRes.json()
  const accessToken = registerPayload.tokens.accessToken as string
  assert.ok(accessToken)

  const docRes = await app.inject({
    method: 'POST',
    url: '/v1/documents',
    headers: { authorization: `Bearer ${accessToken}` },
    payload: {
      title: 'Doc A',
      fileName: 'a.pdf',
      fileType: 'application/pdf',
      fileSize: 10
    }
  })
  assert.equal(docRes.statusCode, 201)

  const aiCreateRes = await app.inject({
    method: 'POST',
    url: '/v1/ai/requests',
    headers: { authorization: `Bearer ${accessToken}` },
    payload: {
      type: 'summarize',
      payload: { text: 'hello world' }
    }
  })
  assert.equal(aiCreateRes.statusCode, 201)
  const aiCreatePayload = aiCreateRes.json()
  const requestId = aiCreatePayload.request.id as string

  const aiGetRes = await app.inject({
    method: 'GET',
    url: `/v1/ai/requests/${requestId}`,
    headers: { authorization: `Bearer ${accessToken}` }
  })
  assert.equal(aiGetRes.statusCode, 200)
  const aiGetPayload = aiGetRes.json()
  assert.equal(aiGetPayload.request.status, 'completed')

  await app.close()
})
