import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { DocumentsRepository } from '../repositories/documents.repository.js'
import { env } from '../config/env.js'
import {
  resolveDocumentFilePath,
  useDatabaseFileStorage
} from '../utils/document-file.js'
import {
  extractCleanTextFromBuffer,
  hashExtractedText,
  normalizeDocumentFileType,
  toTextOnlyFileName
} from '../utils/document-text-extract.js'

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
    const originalFileType = normalizeDocumentFileType(data.fileType, data.fileName)
    let sourceBuffer: Buffer | null = null

    if (data.contentBase64) {
      sourceBuffer = Buffer.from(data.contentBase64, 'base64')
    } else if (data.localPath) {
      sourceBuffer = await readFile(resolveDocumentFilePath(data.localPath))
    }

    if (!sourceBuffer) {
      throw new Error('Document upload requires contentBase64 or a readable localPath')
    }

    // Extract text immediately and discard binary/image-heavy payloads.
    // RAG only needs clean text; storing PDF/DOCX bytes has no product value.
    const extractedText = await extractCleanTextFromBuffer(
      sourceBuffer,
      originalFileType,
      data.fileName
    )
    if (!extractedText) {
      const err = new Error(
        'No extractable text found in document. Scanned/image-only PDFs are not supported without OCR.'
      ) as Error & { statusCode?: number }
      err.statusCode = 422
      throw err
    }

    const textBuffer = Buffer.from(extractedText, 'utf8')
    const textFileName = toTextOnlyFileName(data.fileName)
    const fileHash = hashExtractedText(extractedText)
    const metadata: Record<string, unknown> = {
      ...(data.metadata ?? {}),
      textOnly: true,
      originalFileName: data.fileName,
      originalFileType,
      originalFileSize: data.fileSize || sourceBuffer.length
    }

    // Drop the original binary from memory as soon as text is ready.
    sourceBuffer = null

    let localPath: string | null = null
    let fileData: Buffer | null = null

    if (useDatabaseFileStorage()) {
      // Persist only UTF-8 text bytes (not the original PDF/DOCX).
      fileData = textBuffer
    } else {
      const userDir = path.join(env.AI_STORAGE_DIR, 'documents', userId)
      await mkdir(userDir, { recursive: true })
      const storedName = `${randomUUID()}-${textFileName}`
      const absPath = path.join(userDir, storedName)
      await writeFile(absPath, textBuffer, 'utf8')
      localPath = absPath
    }

    return this.documentsRepo.create({
      ownerUserId: userId,
      title: data.title,
      fileName: textFileName,
      fileType: 'text',
      fileSize: textBuffer.length,
      localPath,
      fileData,
      extractedText,
      fileHash,
      metadata
    })
  }

  async list(userId: string) {
    return this.documentsRepo.listByUser(userId)
  }

  async getById(userId: string, id: string) {
    return this.documentsRepo.getByIdForUser(id, userId)
  }

  async hasFileData(userId: string, id: string) {
    return this.documentsRepo.hasFileData(id, userId)
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
    const existing = await this.documentsRepo.getByIdForUser(id, userId)
    if (!existing) return false

    if (existing.local_path && !useDatabaseFileStorage()) {
      try {
        await unlink(resolveDocumentFilePath(existing.local_path))
      } catch (error) {
        // Ignore missing file; still delete DB record.
        if (!(error instanceof Error && 'code' in error && (error as { code?: string }).code === 'ENOENT')) {
          throw error
        }
      }
    }

    return this.documentsRepo.deleteForUser(id, userId)
  }
}
