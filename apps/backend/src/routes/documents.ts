import type { FastifyInstance } from 'fastify'
import { DocumentsService } from '../services/documents.service.js'

export async function documentsRoutes(app: FastifyInstance) {
  const documentsService = new DocumentsService(app)

  app.post('/documents', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) {
      reply.code(401).send({ error: 'Unauthorized' })
      return
    }
    const document = await documentsService.create(userId, request.body)
    reply.code(201).send({ document })
  })

  app.get('/documents', { preHandler: [app.authenticate] }, async (request) => {
    const userId = request.authUser?.sub
    if (!userId) return { items: [] }
    const items = await documentsService.list(userId)
    return { items }
  })

  app.get('/documents/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) {
      reply.code(401).send({ error: 'Unauthorized' })
      return
    }
    const id = (request.params as { id: string }).id
    const document = await documentsService.getById(userId, id)
    if (!document) {
      reply.code(404).send({ error: 'Document not found' })
      return
    }
    reply.send({ document })
  })
}
