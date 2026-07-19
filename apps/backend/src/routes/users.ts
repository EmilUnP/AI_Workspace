import type { FastifyInstance } from 'fastify'
import { requireAdminJwt } from '../plugins/require-role.js'
import { UsersService } from '../services/users.service.js'

export async function usersRoutes(app: FastifyInstance) {
  const usersService = new UsersService(app)

  app.get('/users', { preHandler: [app.authenticate, requireAdminJwt] }, async (request) => {
    return {
      items: await usersService.list(request.query)
    }
  })

  app.post('/admin/users', { preHandler: [app.authenticate, requireAdminJwt] }, async (request, reply) => {
    const user = await usersService.adminCreate(request.body)
    reply.code(201).send({ user })
  })

  app.patch('/users/:id/password', { preHandler: [app.authenticate, requireAdminJwt] }, async (request) => {
    const params = request.params as { id?: string }
    const body = request.body as { password?: string }
    return usersService.updatePassword({
      userId: params.id,
      password: body?.password
    })
  })
}
