import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest } from 'fastify'

/** Avoid logging the usage poll itself (would inflate counts each dashboard refresh). */
const SKIP_PATHS = new Set(['/v1/users/me/api-keys/usage'])

function resolveLoggedPath(request: FastifyRequest): string {
  const pattern = request.routeOptions.url
  if (typeof pattern === 'string' && pattern.length > 0) {
    return pattern
  }
  return request.url.split('?')[0] ?? '/'
}

async function apiAccessLogPlugin(app: FastifyInstance) {
  app.addHook('onResponse', async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return

    if (request.method === 'OPTIONS') return

    const path = resolveLoggedPath(request)
    if (SKIP_PATHS.has(path)) return

    try {
      await app.db.query(
        `INSERT INTO api_access_log (user_id, method, path, status_code) VALUES ($1, $2, $3, $4)`,
        [userId, request.method, path, reply.statusCode]
      )
    } catch (err) {
      request.log.warn({ err }, 'api_access_log insert failed')
    }
  })
}

export default fp(apiAccessLogPlugin)
