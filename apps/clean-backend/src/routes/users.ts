import type { FastifyInstance } from 'fastify'
import { UsersService } from '../services/users.service.js'

export async function usersRoutes(app: FastifyInstance) {
  const usersService = new UsersService(app)

  app.get('/users', { preHandler: [app.authenticate] }, async (request) => {
    return {
      items: await usersService.list(request.query)
    }
  })
}
