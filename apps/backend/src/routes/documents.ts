import type { FastifyInstance } from 'fastify'
import { DocumentsService } from '../services/documents.service.js'
import { DocumentRagService } from '../services/document-rag.service.js'

export async function documentsRoutes(app: FastifyInstance) {
  const documentsService = new DocumentsService(app)
  const ragService = new DocumentRagService(app)

  app.post('/documents', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) {
      reply.code(401).send({ error: 'Unauthorized' })
      return
    }
    const document = await documentsService.create(userId, request.body)
    await ragService.processDocumentOnUpload(document.id, userId)
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

  app.patch('/documents/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) {
      reply.code(401).send({ error: 'Unauthorized' })
      return
    }
    const id = (request.params as { id: string }).id
    const document = await documentsService.update(userId, id, request.body)
    if (!document) {
      reply.code(404).send({ error: 'Document not found' })
      return
    }
    reply.send({ document })
  })

  app.delete('/documents/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) {
      reply.code(401).send({ error: 'Unauthorized' })
      return
    }
    const id = (request.params as { id: string }).id
    const deleted = await documentsService.delete(userId, id)
    if (!deleted) {
      reply.code(404).send({ error: 'Document not found' })
      return
    }
    reply.send({ success: true })
  })
}
