import type { FastifyInstance } from 'fastify'
import { createReadStream } from 'node:fs'
import { DocumentsService } from '../services/documents.service.js'
import { DocumentRagService } from '../services/document-rag.service.js'
import {
  documentHasStoredFile,
  readDocumentFileBuffer,
  resolveDocumentFilePath
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
    if (
      !documentHasStoredFile({
        local_path: document.local_path,
        has_file_data: hasFileData,
        extracted_text: document.extracted_text
      })
    ) {
      reply.code(404).send({ error: 'Document file missing' })
      return
    }

    // Uploads are retained as clean UTF-8 text only (original PDF/DOCX bytes are discarded).
    const contentType = 'text/plain; charset=utf-8'
    const downloadName = String(document.file_name || 'document.txt').replace(/\.[^.]+$/, '') + '.txt'

    const safeAsciiFileName = downloadName
      .replace(/[^\x20-\x7E]/g, '_')
      .replace(/["\\]/g, '_')
    const utf8FileName = encodeURIComponent(downloadName)

    reply.header('Content-Type', contentType)
    reply.header(
      'Content-Disposition',
      `inline; filename="${safeAsciiFileName}"; filename*=UTF-8''${utf8FileName}`
    )

    if (hasFileData) {
      const buffer = await readDocumentFileBuffer(app, {
        id: document.id,
        owner_user_id: document.owner_user_id,
        local_path: document.local_path
      })
      return reply.send(buffer)
    }

    if (document.local_path) {
      return reply.send(createReadStream(resolveDocumentFilePath(document.local_path)))
    }

    return reply.send(document.extracted_text || '')
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
