import type { FastifyInstance } from 'fastify'
import { UserGeminiKeyService } from '../services/user-gemini-key.service.js'

export async function userAiKeysRoutes(app: FastifyInstance) {
  const service = new UserGeminiKeyService(app)

  app.get('/users/me/ai-keys/gemini', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const status = await service.getStatus(userId)
    reply.send(status)
  })

  app.put('/users/me/ai-keys/gemini', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const status = await service.save(userId, request.body)
    reply.send(status)
  })

  app.delete('/users/me/ai-keys/gemini', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const status = await service.remove(userId)
    reply.send(status)
  })
}
