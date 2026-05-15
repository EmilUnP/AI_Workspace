import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { UserApiKeysService } from '../services/user-api-keys.service.js'

/** Avoid logging the usage poll itself (would inflate counts each dashboard refresh). */
const SKIP_PATHS = new Set(['/v1/users/me/api-keys/usage'])

/** First-party web app marks requests; do not log routine UI traffic. */
const WEB_APP_CLIENT_HEADER = 'x-eduator-client'
const WEB_APP_CLIENT_VALUE = 'web-app'

function resolveLoggedPath(request: FastifyRequest): string {
  const pattern = request.routeOptions.url
  if (typeof pattern === 'string' && pattern.length > 0) {
    return pattern
  }
  return request.url.split('?')[0] ?? '/'
}

async function apiAccessLogPlugin(app: FastifyInstance) {
  const apiKeysService = new UserApiKeysService(app)

  app.addHook('onResponse', async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return

    if (request.method === 'OPTIONS') return

    const rawClient = request.headers[WEB_APP_CLIENT_HEADER]
    const clientKind = Array.isArray(rawClient) ? rawClient[0] : rawClient
    if (clientKind === WEB_APP_CLIENT_VALUE) return

    const path = resolveLoggedPath(request)
    if (SKIP_PATHS.has(path)) return

    const apiKeyId = request.authApiKeyId ?? null

    try {
      await app.db.query(
        `INSERT INTO api_access_log (user_id, api_key_id, method, path, status_code)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, apiKeyId, request.method, path, reply.statusCode]
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
