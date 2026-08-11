import type { FastifyInstance } from 'fastify'

const UUID_RE = /^[0-9a-f-]{36}$/i

export const parseSourceDocumentIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  const ids = value
    .map((item) => String(item || '').trim())
    .filter((id) => UUID_RE.test(id))
  return Array.from(new Set(ids))
}

export type SourceDocumentRef = { id: string; title: string }

/**
 * Resolve document IDs to { id, title } for the owning user.
 * Missing/deleted docs are omitted.
 */
export async function resolveSourceDocuments(
  app: FastifyInstance,
  userId: string,
  documentIds: string[]
): Promise<SourceDocumentRef[]> {
  const ids = parseSourceDocumentIds(documentIds)
  if (ids.length === 0) return []

  const { rows } = await app.db.query<{ id: string; title: string | null; file_name: string | null }>(
    `SELECT id, title, file_name
     FROM documents
     WHERE user_id = $1 AND id = ANY($2::uuid[])`,
    [userId, ids]
  )

  const byId = new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        title: String(row.title || row.file_name || 'Untitled').trim() || 'Untitled',
      },
    ])
  )

  // Preserve selection order
  return ids.map((id) => byId.get(id)).filter((item): item is SourceDocumentRef => Boolean(item))
}
