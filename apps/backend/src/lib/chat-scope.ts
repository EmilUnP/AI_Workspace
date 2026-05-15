import type { FastifyRequest } from 'fastify'

export type ChatScope = {
  ownerUserId: string
  /** Third-party end-user id when using HTTP API key; null for in-app JWT users. */
  externalUserId: string | null
}

const EXTERNAL_USER_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,126}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/

export function normalizeExternalUserId(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null
  const id = String(raw).trim()
  if (!id) return null
  if (id.length > 128 || !EXTERNAL_USER_ID_RE.test(id)) {
    const err = new Error(
      'externalUserId must be 1–128 characters (letters, numbers, dot, underscore, hyphen)'
    ) as Error & { statusCode?: number; code?: string }
    err.statusCode = 400
    err.code = 'INVALID_EXTERNAL_USER_ID'
    throw err
  }
  return id
}

function readExternalUserIdFromRequest(request: FastifyRequest): unknown {
  const header = request.headers['x-eduator-external-user-id']
  if (typeof header === 'string' && header.trim()) return header
  const query = (request.query as { externalUserId?: string })?.externalUserId
  if (query) return query
  const body = request.body as { externalUserId?: string } | undefined
  if (body && typeof body === 'object' && 'externalUserId' in body) return body.externalUserId
  return null
}

export function resolveChatScope(request: FastifyRequest): ChatScope {
  const ownerUserId = request.authUser?.sub
  if (!ownerUserId) {
    const err = new Error('Unauthorized') as Error & { statusCode?: number }
    err.statusCode = 401
    throw err
  }

  const parsed = normalizeExternalUserId(readExternalUserIdFromRequest(request))

  if (request.authApiKeyId) {
    if (!parsed) {
      const err = new Error(
        'externalUserId is required for chat when using an HTTP API key. Pass it in the JSON body, query ?externalUserId=, or header X-Eduator-External-User-Id.'
      ) as Error & { statusCode?: number; code?: string; hint?: string }
      err.statusCode = 400
      err.code = 'MISSING_EXTERNAL_USER_ID'
      err.hint =
        'Use your platform’s user id (e.g. student id). Each value gets its own isolated chat threads under your Eduator account.'
      throw err
    }
    return { ownerUserId, externalUserId: parsed }
  }

  return { ownerUserId, externalUserId: null }
}
