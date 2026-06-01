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
  extracted_text: string | null
  /** Legacy ≤0.2.9 — not returned by API; may exist in DB until backfill */
  text_chunks?: string[] | null
  /** Legacy ≤0.2.9 — not returned by API */
  chunk_embeddings?: number[][] | null
  text_extracted_at: string | null
  file_hash: string | null
  content_language: string | null
  total_tokens: number
  chunk_count: number
  avg_chunk_size: number
  quality_status: string | null
  quality_message: string | null
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
    localPath?: string | null
    fileData?: Buffer | null
    metadata?: Record<string, unknown>
  }) {
    const { rows } = await this.app.db.query<DocumentRecord>(
      `
        INSERT INTO documents (owner_user_id, title, file_name, file_type, file_size, status, local_path, file_data, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
        RETURNING id, owner_user_id, title, file_name, file_type, file_size, status, local_path, extracted_text, text_extracted_at, file_hash, content_language, total_tokens, chunk_count, avg_chunk_size, quality_status, quality_message, metadata, created_at, updated_at
      `,
      [
        input.ownerUserId,
        input.title,
        input.fileName,
        input.fileType,
        input.fileSize,
        input.status ?? 'uploaded',
        input.localPath ?? null,
        input.fileData ?? null,
        JSON.stringify(input.metadata ?? {})
      ]
    )
    return rows[0]
  }

  async hasFileData(id: string, ownerUserId: string) {
    const { rows } = await this.app.db.query<{ has_file_data: boolean }>(
      `
        SELECT (file_data IS NOT NULL AND octet_length(file_data) > 0) AS has_file_data
        FROM documents
        WHERE id = $1 AND owner_user_id = $2
        LIMIT 1
      `,
      [id, ownerUserId]
    )
    return rows[0]?.has_file_data ?? false
  }

  async listByUser(ownerUserId: string) {
    const { rows } = await this.app.db.query<DocumentRecord>(
      `
        SELECT id, owner_user_id, title, file_name, file_type, file_size, status, local_path, metadata, created_at, updated_at
               , text_extracted_at, file_hash, content_language, total_tokens, chunk_count, avg_chunk_size, quality_status, quality_message
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
               , extracted_text, text_extracted_at, file_hash, content_language, total_tokens, chunk_count, avg_chunk_size, quality_status, quality_message
        FROM documents
        WHERE id = $1 AND owner_user_id = $2
        LIMIT 1
      `,
      [id, ownerUserId]
    )
    return rows[0] ?? null
  }

  async updateForUser(
    id: string,
    ownerUserId: string,
    patch: { title: string; metadata?: Record<string, unknown> }
  ) {
    const { rows } = await this.app.db.query<DocumentRecord>(
      `
        UPDATE documents
        SET title = $3, metadata = $4::jsonb, updated_at = now()
        WHERE id = $1 AND owner_user_id = $2
        RETURNING id, owner_user_id, title, file_name, file_type, file_size, status, local_path, extracted_text, text_extracted_at, file_hash, content_language, total_tokens, chunk_count, avg_chunk_size, quality_status, quality_message, metadata, created_at, updated_at
      `,
      [id, ownerUserId, patch.title, JSON.stringify(patch.metadata ?? {})]
    )
    return rows[0] ?? null
  }

  async deleteForUser(id: string, ownerUserId: string) {
    const result = await this.app.db.query(
      `
        DELETE FROM documents
        WHERE id = $1 AND owner_user_id = $2
      `,
      [id, ownerUserId]
    )
    return (result.rowCount ?? 0) > 0
  }
}
