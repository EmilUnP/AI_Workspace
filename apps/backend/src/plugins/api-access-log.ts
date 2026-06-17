import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { UserApiKeysService } from '../services/user-api-keys.service.js'

/** Avoid logging usage polling from first-party UI (would inflate dashboard counts). */
const SKIP_PATHS = new Set(['/v1/users/me/api-keys/usage', '/users/me/api-keys/usage'])

/** First-party web app marks requests; do not log routine UI traffic. */
const WEB_APP_CLIENT_HEADER = 'x-eduator-client'
const WEB_APP_CLIENT_VALUE = 'web-app'
const LOG_ERROR_MESSAGE_KEY = '__apiAccessLogErrorMessage'

type RequestWithLogError = FastifyRequest & {
  [LOG_ERROR_MESSAGE_KEY]?: string
}

type LogRequestMeta = {
  externalUserId?: string
  documentId?: string
  documentIdsCount?: number
  lessonId?: string
  examId?: string
  conversationId?: string
  assistantId?: string
}

function resolveLoggedPath(request: FastifyRequest): string {
  const pattern = request.routeOptions.url
  if (typeof pattern === 'string' && pattern.length > 0) {
    return pattern
  }
  return request.url.split('?')[0] ?? '/'
}

/** Prefer auth plugin value; re-resolve from Bearer when the request used an `ed_…` key. */
async function resolveApiKeyIdForLog(
  request: FastifyRequest,
  apiKeysService: UserApiKeysService
): Promise<string | null> {
  if (request.authApiKeyId) return request.authApiKeyId

  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice('Bearer '.length).trim()
  if (!token.startsWith('ed_')) return null

  const resolved = await apiKeysService.verifyRawKey(token)
  return resolved?.keyId ?? null
}

function trimErrorMessage(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 500)
}

function extractErrorMessage(payload: unknown): string | null {
  if (payload == null) return null

  if (typeof payload === 'object') {
    const obj = payload as Record<string, unknown>
    if (typeof obj.error === 'string' && obj.error.trim()) return trimErrorMessage(obj.error)
    if (typeof obj.message === 'string' && obj.message.trim()) return trimErrorMessage(obj.message)
    return null
  }

  if (Buffer.isBuffer(payload)) {
    return extractErrorMessage(payload.toString('utf8'))
  }

  if (typeof payload === 'string') {
    const raw = payload.trim()
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as unknown
      return extractErrorMessage(parsed)
    } catch {
      // Keep plaintext fallback for non-JSON responses.
      return trimErrorMessage(raw)
    }
  }

  return null
}

function collectRequestMeta(request: FastifyRequest): LogRequestMeta | null {
  const meta: LogRequestMeta = {}

  const params = (request.params && typeof request.params === 'object'
    ? (request.params as Record<string, unknown>)
    : {}) as Record<string, unknown>
  const query = (request.query && typeof request.query === 'object'
    ? (request.query as Record<string, unknown>)
    : {}) as Record<string, unknown>
  const body = (request.body && typeof request.body === 'object'
    ? (request.body as Record<string, unknown>)
    : {}) as Record<string, unknown>

  const externalUserId =
    (typeof request.headers['x-eduator-external-user-id'] === 'string'
      ? request.headers['x-eduator-external-user-id']
      : undefined) ||
    (typeof query.externalUserId === 'string' ? query.externalUserId : undefined) ||
    (typeof body.externalUserId === 'string' ? body.externalUserId : undefined)
  if (externalUserId) meta.externalUserId = externalUserId.slice(0, 128)

  if (typeof body.documentId === 'string') meta.documentId = body.documentId
  if (Array.isArray(body.documentIds)) meta.documentIdsCount = body.documentIds.length

  if (typeof params.id === 'string') {
    if (request.url.includes('/lessons/')) meta.lessonId = params.id
    if (request.url.includes('/exams/')) meta.examId = params.id
  }
  if (typeof params.conversationId === 'string') meta.conversationId = params.conversationId
  if (typeof params.assistantId === 'string') meta.assistantId = params.assistantId

  return Object.keys(meta).length > 0 ? meta : null
}

async function apiAccessLogPlugin(app: FastifyInstance) {
  const apiKeysService = new UserApiKeysService(app)

  app.addHook('onSend', async (request, reply, payload) => {
    if (reply.statusCode < 400) return payload
    const message = extractErrorMessage(payload)
    if (message) {
      ;(request as RequestWithLogError)[LOG_ERROR_MESSAGE_KEY] = message
    }
    return payload
  })

  app.addHook('onResponse', async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return

    if (request.method === 'OPTIONS') return

    const apiKeyId = await resolveApiKeyIdForLog(request, apiKeysService)

    const rawClient = request.headers[WEB_APP_CLIENT_HEADER]
    const clientKind = Array.isArray(rawClient) ? rawClient[0] : rawClient
    // Keep skipping routine first-party UI traffic, but never skip API-key requests.
    if (clientKind === WEB_APP_CLIENT_VALUE && !apiKeyId) return

    const path = resolveLoggedPath(request)
    // Keep all API-key traffic in logs, even for paths skipped for first-party UI.
    if (SKIP_PATHS.has(path) && !apiKeyId) return

    try {
      const errorMessage = (request as RequestWithLogError)[LOG_ERROR_MESSAGE_KEY] ?? null
      const requestMeta = collectRequestMeta(request)
      await app.db.query(
        `INSERT INTO api_access_log (user_id, api_key_id, method, path, status_code, error_message, request_meta)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [userId, apiKeyId, request.method, path, reply.statusCode, errorMessage, JSON.stringify(requestMeta)]
      )
      if (apiKeyId) {
        await apiKeysService.touchLastUsed(apiKeyId)
      }
    } catch (err) {
      request.log.warn({ err }, 'api_access_log insert failed')
    }
  })
}

export default fp(apiAccessLogPlugin)
