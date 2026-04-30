import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { DocumentsRepository } from '../repositories/documents.repository.js'
import { env } from '../config/env.js'

const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().int().min(0),
  localPath: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  contentBase64: z.string().optional()
})

const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional()
})

export class DocumentsService {
  private readonly documentsRepo: DocumentsRepository

  constructor(app: FastifyInstance) {
    this.documentsRepo = new DocumentsRepository(app)
  }

  async create(userId: string, input: unknown) {
    const data = createDocumentSchema.parse(input)
    const inferredName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    let localPath = data.localPath

    if (!localPath && data.contentBase64) {
      const userDir = path.join(env.AI_STORAGE_DIR, 'documents', userId)
      await mkdir(userDir, { recursive: true })
      const fileName = `${randomUUID()}-${inferredName}`
      const absPath = path.join(userDir, fileName)
      const contentBuffer = Buffer.from(data.contentBase64, 'base64')
      await writeFile(absPath, contentBuffer)
      localPath = absPath
    }

    return this.documentsRepo.create({
      ownerUserId: userId,
      title: data.title,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
      localPath,
      metadata: data.metadata
    })
  }

  async list(userId: string) {
    return this.documentsRepo.listByUser(userId)
  }

  async getById(userId: string, id: string) {
    return this.documentsRepo.getByIdForUser(id, userId)
  }

  async update(userId: string, id: string, input: unknown) {
    const data = updateDocumentSchema.parse(input)
    const existing = await this.documentsRepo.getByIdForUser(id, userId)
    if (!existing) return null

    const existingMeta = (existing.metadata ?? {}) as Record<string, unknown>
    const metadata: Record<string, unknown> = {
      ...existingMeta,
      description: data.description ?? existingMeta.description ?? '',
      tags: data.tags ?? existingMeta.tags ?? []
    }

    return this.documentsRepo.updateForUser(id, userId, {
      title: data.title,
      metadata
    })
  }

  async delete(userId: string, id: string) {
    return this.documentsRepo.deleteForUser(id, userId)
  }
}
