import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { FastifyInstance } from 'fastify'
import { env } from '../config/env.js'

export function useDatabaseFileStorage() {
  return env.FILE_STORAGE === 'database'
}

export function resolveDocumentFilePath(localPath: string): string {
  const normalized = localPath.replace(/\\/g, '/')
  const storageRoot = env.AI_STORAGE_DIR.replace(/\\/g, '/')

  if (path.isAbsolute(localPath)) {
    return localPath
  }
  if (normalized.startsWith('storage/')) {
    return path.resolve(normalized)
  }
  if (normalized.startsWith('documents/')) {
    return path.join(env.AI_STORAGE_DIR, normalized)
  }
  if (normalized.startsWith(storageRoot)) {
    return path.resolve(localPath)
  }
  return path.join(env.AI_STORAGE_DIR, normalized)
}

export async function readDocumentFileBuffer(
  app: FastifyInstance,
  doc: { id: string; owner_user_id: string; local_path: string | null }
): Promise<Buffer> {
  const { rows } = await app.db.query<{ file_data: Buffer | null }>(
    `SELECT file_data FROM documents WHERE id = $1 AND owner_user_id = $2 LIMIT 1`,
    [doc.id, doc.owner_user_id]
  )
  const fileData = rows[0]?.file_data
  if (fileData && fileData.length > 0) {
    return fileData
  }

  if (!doc.local_path) {
    throw new Error('Document file is missing')
  }

  return readFile(resolveDocumentFilePath(doc.local_path))
}

export function documentHasStoredFile(doc: {
  local_path: string | null
  has_file_data?: boolean
}): boolean {
  return Boolean(doc.has_file_data) || Boolean(doc.local_path)
}
