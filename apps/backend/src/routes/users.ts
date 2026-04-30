import type { FastifyInstance } from 'fastify'
import { UsersService } from '../services/users.service.js'

export async function usersRoutes(app: FastifyInstance) {
  const usersService = new UsersService(app)

  app.get('/users', { preHandler: [app.authenticate] }, async (request) => {
    return {
      items: await usersService.list(request.query)
    }
  })

  app.patch('/users/:id/password', { preHandler: [app.authenticate] }, async (request, reply) => {
    if (request.authUser?.role !== 'admin') {
      reply.code(403).send({ error: 'Forbidden' })
      return
    }
    const params = request.params as { id?: string }
    const body = request.body as { password?: string }
    return usersService.updatePassword({
      userId: params.id,
      password: body?.password
    })
  })
}
