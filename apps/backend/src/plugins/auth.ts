import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { jwtVerify } from 'jose'
import { env } from '../config/env.js'

export type JwtUser = {
  sub: string
  email: string
  role: string
  tokenType: 'access' | 'refresh'
}

async function authPlugin(app: FastifyInstance) {
  const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET)

  app.decorate('authenticate', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.code(401).send({ error: 'Unauthorized' })
        return
      }
      const token = authHeader.slice('Bearer '.length)
      const verified = await jwtVerify(token, accessSecret)
      const payload = verified.payload as unknown as JwtUser
      if (!payload || payload.tokenType !== 'access') {
        reply.code(401).send({ error: 'Invalid access token' })
        return
      }
      request.authUser = payload
    } catch {
      reply.code(401).send({ error: 'Unauthorized' })
    }
  })
}

export default fp(authPlugin)
