import type { FastifyInstance } from 'fastify'
import { createReadStream } from 'node:fs'
import { DocumentsService } from '../services/documents.service.js'
import { DocumentRagService } from '../services/document-rag.service.js'
import {
  documentHasStoredFile,
  readDocumentFileBuffer,
  resolveDocumentFilePath,
  useDatabaseFileStorage
} from '../utils/document-file.js'

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

  app.get('/documents/:id/file', { preHandler: [app.authenticate] }, async (request, reply) => {
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
    const hasFileData = await documentsService.hasFileData(userId, id)
    if (!documentHasStoredFile({ local_path: document.local_path, has_file_data: hasFileData })) {
      reply.code(404).send({ error: 'Document file missing' })
      return
    }

    const lowerType = String(document.file_type || '').toLowerCase()
    const contentType = lowerType.includes('pdf')
      ? 'application/pdf'
      : lowerType.includes('officedocument.wordprocessingml.document') || lowerType === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : lowerType.includes('msword') || lowerType === 'doc'
          ? 'application/msword'
          : lowerType.includes('markdown')
            ? 'text/markdown; charset=utf-8'
            : 'text/plain; charset=utf-8'

    const safeAsciiFileName = String(document.file_name || 'document')
      .replace(/[^\x20-\x7E]/g, '_')
      .replace(/["\\]/g, '_')
    const utf8FileName = encodeURIComponent(String(document.file_name || 'document'))

    reply.header('Content-Type', contentType)
    reply.header(
      'Content-Disposition',
      `inline; filename="${safeAsciiFileName}"; filename*=UTF-8''${utf8FileName}`
    )
    if (hasFileData || useDatabaseFileStorage()) {
      const buffer = await readDocumentFileBuffer(app, {
        id: document.id,
        owner_user_id: document.owner_user_id,
        local_path: document.local_path
      })
      return reply.send(buffer)
    }

    return reply.send(createReadStream(resolveDocumentFilePath(document.local_path!)))
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
