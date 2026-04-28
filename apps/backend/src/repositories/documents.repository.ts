import type { FastifyInstance } from 'fastify'

export type DocumentRecord = {
  id: string
  owner_user_id: string
  title: string
  file_name: string
  file_type: string
  file_size: number
  status: 'uploaded' | 'processing' | 'ready' | 'failed'
  local_path: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export class DocumentsRepository {
  constructor(private readonly app: FastifyInstance) {}

  async create(input: {
    ownerUserId: string
    title: string
    fileName: string
    fileType: string
    fileSize: number
    status?: DocumentRecord['status']
    localPath?: string
    metadata?: Record<string, unknown>
  }) {
    const { rows } = await this.app.db.query<DocumentRecord>(
      `
        INSERT INTO documents (owner_user_id, title, file_name, file_type, file_size, status, local_path, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
        RETURNING id, owner_user_id, title, file_name, file_type, file_size, status, local_path, metadata, created_at, updated_at
      `,
      [
        input.ownerUserId,
        input.title,
        input.fileName,
        input.fileType,
        input.fileSize,
        input.status ?? 'uploaded',
        input.localPath ?? null,
        JSON.stringify(input.metadata ?? {})
      ]
    )
    return rows[0]
  }

  async listByUser(ownerUserId: string) {
    const { rows } = await this.app.db.query<DocumentRecord>(
      `
        SELECT id, owner_user_id, title, file_name, file_type, file_size, status, local_path, metadata, created_at, updated_at
        FROM documents
        WHERE owner_user_id = $1
        ORDER BY created_at DESC
      `,
      [ownerUserId]
    )
    return rows
  }

  async getByIdForUser(id: string, ownerUserId: string) {
    const { rows } = await this.app.db.query<DocumentRecord>(
      `
        SELECT id, owner_user_id, title, file_name, file_type, file_size, status, local_path, metadata, created_at, updated_at
        FROM documents
        WHERE id = $1 AND owner_user_id = $2
        LIMIT 1
      `,
      [id, ownerUserId]
    )
    return rows[0] ?? null
  }
}
