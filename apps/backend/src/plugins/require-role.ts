import type { FastifyReply, FastifyRequest } from 'fastify'

export function requireJwtRole(...roles: string[]) {
  return async function requireRoleHandler(request: FastifyRequest, reply: FastifyReply) {
    const user = request.authUser
    if (!user) {
      reply.code(401).send({ error: 'Unauthorized' })
      return
    }
    if (request.authApiKeyId) {
      reply.code(403).send({ error: 'API keys cannot access this endpoint' })
      return
    }
    if (!roles.includes(user.role)) {
      reply.code(403).send({ error: 'Forbidden' })
      return
    }
  }
}

export const requireAdminJwt = requireJwtRole('admin')
