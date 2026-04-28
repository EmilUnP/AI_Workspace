import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { DocumentsRepository } from '../repositories/documents.repository.js'

const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().int().min(0),
  localPath: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
})

export class DocumentsService {
  private readonly documentsRepo: DocumentsRepository

  constructor(app: FastifyInstance) {
    this.documentsRepo = new DocumentsRepository(app)
  }

  async create(userId: string, input: unknown) {
    const data = createDocumentSchema.parse(input)
    return this.documentsRepo.create({
      ownerUserId: userId,
      title: data.title,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
      localPath: data.localPath,
      metadata: data.metadata
    })
  }

  async list(userId: string) {
    return this.documentsRepo.listByUser(userId)
  }

  async getById(userId: string, id: string) {
    return this.documentsRepo.getByIdForUser(id, userId)
  }
}
