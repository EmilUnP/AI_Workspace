import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AuthService } from '../services/auth.service.js'
import { UsersService } from '../services/users.service.js'

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
})

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app)
  const usersService = new UsersService(app)

  app.post('/auth/register', async (request, reply) => {
    const result = await authService.register(request.body)
    reply.code(201).send(result)
  })

  app.post('/auth/login', async (request) => {
    return authService.login(request.body)
  })

  app.post('/auth/refresh', async (request) => {
    const data = refreshSchema.parse(request.body)
    return authService.refresh(data.refreshToken)
  })

  app.get('/auth/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) {
      reply.code(401).send({ error: 'Unauthorized' })
      return
    }
    const user = await usersService.me(userId)
    if (!user) {
      reply.code(404).send({ error: 'User not found' })
      return
    }
    reply.send({ user })
  })
}
