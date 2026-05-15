import type { FastifyRequest } from 'fastify'

/** Eduator account that owns assistants and conversations. */
export type OwnerScope = {
  ownerUserId: string
  /** True when authenticated with HTTP API key (ed_…). */
  isApiKey: boolean
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

export function readOptionalExternalUserId(request: FastifyRequest): string | null {
  const header = request.headers['x-eduator-external-user-id']
  if (typeof header === 'string' && header.trim()) {
    return normalizeExternalUserId(header)
  }
  const query = (request.query as { externalUserId?: string })?.externalUserId
  if (query) return normalizeExternalUserId(query)
  const body = request.body as { externalUserId?: string } | undefined
  if (body && typeof body === 'object' && body.externalUserId) {
    return normalizeExternalUserId(body.externalUserId)
  }
  return null
}

export function resolveOwnerScope(request: FastifyRequest): OwnerScope {
  const ownerUserId = request.authUser?.sub
  if (!ownerUserId) {
    const err = new Error('Unauthorized') as Error & { statusCode?: number }
    err.statusCode = 401
    throw err
  }
  return {
    ownerUserId,
    isApiKey: Boolean(request.authApiKeyId),
  }
}
