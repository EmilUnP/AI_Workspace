import 'fastify'
import type { FastifyReply, FastifyRequest } from 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: {
      sub: string
      email: string
      role: string
      tokenType: 'access' | 'refresh'
    }
    /** Set when the request is authenticated with a user HTTP API key (`ed_…`). */
    authApiKeyId?: string
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
