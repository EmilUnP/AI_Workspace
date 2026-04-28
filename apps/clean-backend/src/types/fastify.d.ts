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
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
