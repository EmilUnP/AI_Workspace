import { createHash } from 'node:crypto'
import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import mammoth from 'mammoth'
import WordExtractor from 'word-extractor'
import pdfParse from '@cedrugs/pdf-parse'
import { AiGateway } from '../ai/gateway.js'
import { readDocumentFileBuffer } from '../utils/document-file.js'
import { prepareEmbedding, toPgVector } from '../utils/vector.js'

const querySchema = z.object({
  documentId: z.uuid(),
  query: z.string().min(1),
  topK: z.number().int().min(1).max(10).default(5)
})

type DocRow = {
  id: string
  owner_user_id: string
  file_type: string
  local_path: string | null
  status: 'uploaded' | 'processing' | 'ready' | 'failed'
  extracted_text: string | null
  /** Legacy ≤0.2.9 — read only for one-time backfill into document_chunks */
  text_chunks: string[] | null
  /** Legacy ≤0.2.9 — read only for one-time backfill into document_chunks */
  chunk_embeddings: number[][] | null
  text_extracted_at: string | null
  file_hash: string | null
  content_language: string | null
  total_tokens: number
  chunk_count: number
  avg_chunk_size: number
  quality_status: string | null
  quality_message: string | null
}

export class DocumentRagService {
  private static readonly queue: Array<{ userId: string; documentId: string }> = []
  private static processing = false

  constructor(private readonly app: FastifyInstance) {}

  async processDocumentOnUpload(documentId: string, userId: string) {
    DocumentRagService.queue.push({ userId, documentId })
    void this.processQueue()
  }

  private async processQueue() {
    if (DocumentRagService.processing) return
    DocumentRagService.processing = true
    try {
      while (DocumentRagService.queue.length > 0) {
        const next = DocumentRagService.queue.shift()
        if (!next) break
        await this.processSingle(next.userId, next.documentId)
      }
    } finally {
      DocumentRagService.processing = false
    }
  }

  async retrieve(userId: string, input: unknown) {
    const data = querySchema.parse(input)
    const doc = await this.getDoc(userId, data.documentId)
    if (!doc) {
      const err = new Error('Document not found') as Error & { statusCode?: number }
      err.statusCode = 404
      throw err
    }
    const text = await this.ensureExtractedText(doc)
    const chunks = await this.getDocumentChunks(doc.id, text, userId)
    if (chunks.length === 0) {
      return { documentId: doc.id, chunks: [] as string[] }
    }
    await this.ensurePgvectorIndex(doc.id, chunks, userId)
    const queryForSearch = await this.translateQueryIfNeeded(data.query, doc.content_language, userId)
    try {
      const queryVec = await this.embedText(queryForSearch, userId)
      const relevant = await this.vectorSearch(doc.id, queryVec, data.topK)
      return { documentId: doc.id, chunks: relevant.length ? relevant : chunks.slice(0, data.topK) }
    } catch {
      return { documentId: doc.id, chunks: chunks.slice(0, Math.max(1, data.topK)) }
    }
  }

  /**
   * Batch retrieval for multiple documents with one query embedding and one SQL search.
   */
  async retrieveMany(
    userId: string,
    documentIds: string[],
    query: string,
    topKPerDocument = 2
  ): Promise<Map<string, string[]>> {
    const uniqueIds = Array.from(new Set(documentIds.filter(Boolean))).slice(0, 10)
    if (uniqueIds.length === 0) return new Map()

    await this.ensureDocumentsIndexed(uniqueIds, userId)

    const firstDoc = await this.getDoc(userId, uniqueIds[0])
    const queryForSearch = await this.translateQueryIfNeeded(query, firstDoc?.content_language ?? null, userId)
    try {
      const queryVec = await this.embedText(queryForSearch, userId)
      return await this.vectorSearchGrouped(uniqueIds, userId, queryVec, topKPerDocument)
    } catch {
      return new Map()
    }
  }

  /**
   * Backward-compatible core RAG method:
   * returns extracted text for one document (owner-checked).
   */
  async getParsedDocumentText(documentId: string, userId: string): Promise<string | null> {
    const doc = await this.getDoc(userId, documentId)
    if (!doc) return null
    try {
      return await this.ensureExtractedText(doc)
    } catch {
      return null
    }
  }

  /**
   * Backward-compatible core RAG method:
   * returns top relevant chunks for one document and query.
   */
  async getRelevantChunks(
    documentId: string,
    userId: string,
    query: string,
    topK = 7
  ): Promise<string[]> {
    const doc = await this.getDoc(userId, documentId)
    if (!doc) return []
    const text = await this.ensureExtractedText(doc)
    const chunks = await this.getDocumentChunks(doc.id, text, userId)
    if (chunks.length === 0) return []
    await this.ensurePgvectorIndex(doc.id, chunks, userId)
    const queryForSearch = await this.translateQueryIfNeeded(query, doc.content_language, userId)
    try {
      const queryVec = await this.embedText(queryForSearch, userId)
      const results = await this.vectorSearch(doc.id, queryVec, Math.max(1, topK))
      return results.length ? results : chunks.slice(0, Math.max(1, topK))
    } catch {
      return chunks.slice(0, Math.max(1, topK))
    }
  }

  /**
   * Backward-compatible core RAG method:
   * concatenates extracted text from many documents.
   */
  async getDocumentsContent(documentIds: string[], userId: string): Promise<string> {
    const parts: string[] = []
    for (const documentId of documentIds) {
      const text = await this.getParsedDocumentText(documentId, userId)
      if (text && text.trim()) parts.push(text)
    }
    return parts.join('\n\n---\n\n')
  }

  /**
   * Backward-compatible core RAG method:
   * concatenates relevant chunks from many documents for one query.
   * Uses a single pgvector query instead of N sequential searches.
   */
  async getRelevantContentFromDocuments(
    documentIds: string[],
    userId: string,
    query: string,
    chunksPerDocument = 5
  ): Promise<string> {
    const uniqueIds = Array.from(new Set(documentIds.filter(Boolean)))
    if (uniqueIds.length === 0) return ''

    await this.ensureDocumentsIndexed(uniqueIds, userId)

    const firstDoc = await this.getDoc(userId, uniqueIds[0])
    const queryForSearch = await this.translateQueryIfNeeded(query, firstDoc?.content_language ?? null, userId)
    try {
      const queryVec = await this.embedText(queryForSearch, userId)
      const chunks = await this.vectorSearchAcrossDocuments(
        uniqueIds,
        userId,
        queryVec,
        chunksPerDocument
      )
      return chunks.join('\n\n---\n\n')
    } catch {
      return ''
    }
  }

  private async ensureDocumentsIndexed(documentIds: string[], userId: string) {
    await Promise.all(
      documentIds.map(async (documentId) => {
        try {
          const doc = await this.getDoc(userId, documentId)
          if (!doc) return
          const text = await this.ensureExtractedText(doc)
          const chunks = await this.getDocumentChunks(doc.id, text, userId)
          if (chunks.length > 0) {
            await this.ensurePgvectorIndex(doc.id, chunks, userId)
          }
        } catch {
          // skip failed document and continue with others
        }
      })
    )
  }

  private async processSingle(userId: string, documentId: string) {
    const doc = await this.getDoc(userId, documentId)
    if (!doc) return
    await this.app.db.query(`UPDATE documents SET status = 'processing', updated_at = now() WHERE id = $1`, [doc.id])
    try {
      const text = await this.ensureExtractedText(doc)
      const chunks = this.chunkText(text, 4000, 400)
      const embeddings = await this.generateChunkEmbeddings(chunks, userId)
      await this.persistDocumentChunks(doc.id, chunks, embeddings)
      const quality = this.validateTextQuality(text, chunks)
      const contentLanguage = await this.detectLanguage(text)

      const totalTokens = this.estimateTokens(text)
      const chunkCount = chunks.length
      const avgChunkSize = chunkCount > 0 ? Math.round(chunks.reduce((a, c) => a + c.length, 0) / chunkCount) : 0

      await this.app.db.query(
        `UPDATE documents
         SET text_chunks = NULL,
             chunk_embeddings = NULL,
             content_language = $2,
             total_tokens = $3,
             chunk_count = $4,
             avg_chunk_size = $5,
             quality_status = $6,
             quality_message = $7,
             status = 'ready',
             updated_at = now()
         WHERE id = $1`,
        [
          doc.id,
          contentLanguage,
          totalTokens,
          chunkCount,
          avgChunkSize,
          quality.status,
          quality.message
        ]
      )
    } catch (error) {
      await this.app.db.query(
        `UPDATE documents
         SET status = 'failed',
             quality_status = 'failed',
             quality_message = $2,
             updated_at = now()
         WHERE id = $1`,
        [doc.id, error instanceof Error ? error.message.slice(0, 500) : 'Processing failed']
      )
    }
  }

  private async getDoc(userId: string, id: string) {
    const { rows } = await this.app.db.query<DocRow>(
      `SELECT id, owner_user_id, file_type, local_path, status, extracted_text, text_extracted_at, file_hash, content_language, total_tokens, chunk_count, avg_chunk_size, quality_status, quality_message
       FROM documents WHERE id = $1 AND owner_user_id = $2 LIMIT 1`,
      [id, userId]
    )
    return rows[0] ?? null
  }

  private async hasPgvectorChunks(documentId: string, expectedCount?: number) {
    const { rows } = await this.app.db.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM document_chunks WHERE document_id = $1`,
      [documentId]
    )
    const count = rows[0]?.count ?? 0
    if (count === 0) return false
    if (typeof expectedCount === 'number') return count === expectedCount
    return true
  }

  private async persistDocumentChunks(documentId: string, chunks: string[], embeddings: number[][]) {
    const client = await this.app.db.connect()
    try {
      await client.query('BEGIN')
      await client.query(`DELETE FROM document_chunks WHERE document_id = $1`, [documentId])
      if (chunks.length === 0) {
        await client.query('COMMIT')
        return
      }
      const indices = chunks.map((_, index) => index)
      const vectors = embeddings.map((embedding) => toPgVector(embedding))
      await client.query(
        `INSERT INTO document_chunks (document_id, chunk_index, content, embedding)
         SELECT $1, idx, content, emb::vector
         FROM unnest($2::int[], $3::text[], $4::text[]) AS t(idx, content, emb)`,
        [documentId, indices, chunks, vectors]
      )
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  private async vectorSearch(documentId: string, queryVec: number[], topK: number): Promise<string[]> {
    const { rows } = await this.app.db.query<{ content: string }>(
      `SELECT content
       FROM document_chunks
       WHERE document_id = $1
       ORDER BY embedding <=> $2::vector
       LIMIT $3`,
      [documentId, toPgVector(queryVec), Math.max(1, topK)]
    )
    return rows.map((row) => row.content)
  }

  private async vectorSearchAcrossDocuments(
    documentIds: string[],
    ownerUserId: string,
    queryVec: number[],
    topKPerDocument: number
  ): Promise<string[]> {
    const { rows } = await this.app.db.query<{ content: string }>(
      `WITH ranked AS (
         SELECT dc.content,
                ROW_NUMBER() OVER (
                  PARTITION BY dc.document_id
                  ORDER BY dc.embedding <=> $1::vector
                ) AS rn
         FROM document_chunks dc
         INNER JOIN documents d ON d.id = dc.document_id
         WHERE dc.document_id = ANY($2::uuid[])
           AND d.owner_user_id = $3
           AND d.status = 'ready'
       )
       SELECT content FROM ranked WHERE rn <= $4`,
      [toPgVector(queryVec), documentIds, ownerUserId, Math.max(1, topKPerDocument)]
    )
    return rows.map((row) => row.content)
  }

  private async vectorSearchGrouped(
    documentIds: string[],
    ownerUserId: string,
    queryVec: number[],
    topKPerDocument: number
  ): Promise<Map<string, string[]>> {
    const { rows } = await this.app.db.query<{ document_id: string; content: string }>(
      `WITH ranked AS (
         SELECT dc.document_id,
                dc.content,
                ROW_NUMBER() OVER (
                  PARTITION BY dc.document_id
                  ORDER BY dc.embedding <=> $1::vector
                ) AS rn
         FROM document_chunks dc
         INNER JOIN documents d ON d.id = dc.document_id
         WHERE dc.document_id = ANY($2::uuid[])
           AND d.owner_user_id = $3
       )
       SELECT document_id, content FROM ranked WHERE rn <= $4`,
      [toPgVector(queryVec), documentIds, ownerUserId, Math.max(1, topKPerDocument)]
    )
    const grouped = new Map<string, string[]>()
    for (const row of rows) {
      const existing = grouped.get(row.document_id) ?? []
      existing.push(row.content)
      grouped.set(row.document_id, existing)
    }
    return grouped
  }

  private async ensurePgvectorIndex(documentId: string, chunks: string[], userId: string) {
    if (await this.hasPgvectorChunks(documentId, chunks.length)) return

    const backfilled = await this.tryBackfillFromLegacy(documentId)
    if (backfilled && (await this.hasPgvectorChunks(documentId, chunks.length))) return

    const embeddings = await this.generateChunkEmbeddings(chunks, userId)
    await this.persistDocumentChunks(documentId, chunks, embeddings)
    await this.app.db.query(
      `UPDATE documents
       SET text_chunks = NULL,
           chunk_embeddings = NULL,
           updated_at = now()
       WHERE id = $1`,
      [documentId]
    )
  }

  private async tryBackfillFromLegacy(documentId: string): Promise<boolean> {
    const { rows } = await this.app.db.query<Pick<DocRow, 'text_chunks' | 'chunk_embeddings'>>(
      `SELECT text_chunks, chunk_embeddings FROM documents WHERE id = $1`,
      [documentId]
    )
    const legacyChunks = Array.isArray(rows[0]?.text_chunks) ? rows[0].text_chunks : null
    const legacyEmbeddings = Array.isArray(rows[0]?.chunk_embeddings) ? rows[0].chunk_embeddings : null
    if (!legacyChunks?.length || !legacyEmbeddings || legacyEmbeddings.length !== legacyChunks.length) {
      return false
    }
    const prepared = legacyEmbeddings.map((embedding) => prepareEmbedding(embedding))
    await this.persistDocumentChunks(documentId, legacyChunks, prepared)
    await this.app.db.query(
      `UPDATE documents SET text_chunks = NULL, chunk_embeddings = NULL, updated_at = now() WHERE id = $1`,
      [documentId]
    )
    return true
  }

  private async ensureExtractedText(doc: DocRow) {
    if (doc.extracted_text && doc.extracted_text.length > 0) return doc.extracted_text

    const fileBuffer = await readDocumentFileBuffer(this.app, doc)
    let text = ''

    const normalizedFileType = String(doc.file_type || '').toLowerCase()

    if (normalizedFileType === 'pdf' || normalizedFileType.includes('pdf')) {
      const parsed = await pdfParse(fileBuffer)
      text = parsed.text || ''
    } else if (normalizedFileType === 'docx' || normalizedFileType.includes('officedocument.wordprocessingml.document')) {
      const parsed = await mammoth.extractRawText({ buffer: fileBuffer })
      text = parsed.value || ''
    } else if (normalizedFileType === 'doc' || normalizedFileType.includes('msword')) {
      const extractor = new WordExtractor()
      const parsed = await extractor.extract(fileBuffer)
      text = parsed.getBody() || ''
    } else {
      text = fileBuffer.toString('utf8')
    }

    const cleaned = this.cleanExtractedText(text)
    const normalized = this.sanitizeForPostgresText(cleaned.replace(/\s+/g, ' ').trim())
    const fileHash = createHash('sha256').update(normalized).digest('hex')
    await this.app.db.query(
      `UPDATE documents
       SET extracted_text = $2, text_extracted_at = now(), file_hash = $3, updated_at = now()
       WHERE id = $1`,
      [doc.id, normalized, fileHash]
    )
    return normalized
  }

  /**
   * PostgreSQL text/jsonb cannot contain NUL (\u0000). Some binary-heavy PDFs
   * may leak it into extracted text; strip it to prevent "invalid byte sequence".
   */
  private sanitizeForPostgresText(value: string): string {
    const withoutNull = value.replace(/\u0000/g, '')
    if (typeof (withoutNull as unknown as { toWellFormed?: () => string }).toWellFormed === 'function') {
      return (withoutNull as unknown as { toWellFormed: () => string }).toWellFormed()
    }
    return withoutNull
  }

  /**
   * Remove common PDF/OCR artifacts so chunking/embedding focuses on useful text.
   * This is intentionally conservative to avoid dropping valid educational content.
   */
  private cleanExtractedText(raw: string): string {
    const text = this.sanitizeForPostgresText(raw)
      .replace(/[^\S\r\n\t]+/g, ' ')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, '')

    const lines = text.split('\n')
    const kept: string[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      // Drop likely binary/base64 fragments.
      if (/^[A-Za-z0-9+/=]{120,}$/.test(trimmed)) continue

      // Drop lines that are mostly symbols/noise.
      const nonWord = (trimmed.match(/[^\p{L}\p{N}\s]/gu) || []).length
      const ratio = nonWord / trimmed.length
      if (trimmed.length < 40 && ratio > 0.45) continue

      // Drop obvious repeated-character artifacts.
      if (/(.)\1{8,}/.test(trimmed)) continue

      kept.push(trimmed)
    }

    return kept.join('\n').replace(/\n{3,}/g, '\n\n')
  }

  private chunkText(text: string, chunkSize: number, overlap: number) {
    const chunks: string[] = []
    const cleanText = text.replace(/\s+/g, ' ').trim()
    if (!cleanText) return chunks

    // Prefer sentence boundaries for semantic chunking quality.
    const sentences = cleanText.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0)
    if (sentences.length === 0) {
      let index = 0
      while (index < cleanText.length) {
        const end = Math.min(index + chunkSize, cleanText.length)
        chunks.push(this.sanitizeForPostgresText(cleanText.slice(index, end).trim()))
        if (end === cleanText.length) break
        index = end - overlap
      }
      return chunks.filter((c) => c.length > 100)
    }

    let currentChunk = ''
    let chunkStartIndex = 0

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i]
      const potentialChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence
      if (potentialChunk.length > chunkSize && currentChunk) {
        chunks.push(this.sanitizeForPostgresText(currentChunk.trim()))

        const overlapSentences: string[] = []
        let overlapLength = 0
        for (let j = i - 1; j >= chunkStartIndex && overlapLength < overlap && j >= 0; j--) {
          const prevSentence = sentences[j]
          if (overlapLength + prevSentence.length <= overlap) {
            overlapSentences.unshift(prevSentence)
            overlapLength += prevSentence.length + 1
          } else {
            break
          }
        }

        currentChunk = overlapSentences.join(' ') + (overlapSentences.length > 0 ? ' ' : '') + sentence
        chunkStartIndex = i - overlapSentences.length
      } else {
        currentChunk = potentialChunk
      }
    }

    if (currentChunk.trim()) {
      chunks.push(this.sanitizeForPostgresText(currentChunk.trim()))
    }

    return chunks.filter((c) => c.length > 100)
  }

  private async loadChunksFromPgvector(documentId: string): Promise<string[]> {
    const { rows } = await this.app.db.query<{ content: string }>(
      `SELECT content
       FROM document_chunks
       WHERE document_id = $1
       ORDER BY chunk_index ASC`,
      [documentId]
    )
    return rows.map((row) => row.content)
  }

  private async getDocumentChunks(documentId: string, documentText: string, userId: string): Promise<string[]> {
    const indexed = await this.loadChunksFromPgvector(documentId)
    if (indexed.length > 0) return indexed

    const backfilled = await this.tryBackfillFromLegacy(documentId)
    if (backfilled) {
      const afterBackfill = await this.loadChunksFromPgvector(documentId)
      if (afterBackfill.length > 0) return afterBackfill
    }

    const chunks = this.chunkText(documentText, 4000, 400)
    if (chunks.length === 0) return []

    await this.ensurePgvectorIndex(documentId, chunks, userId)
    return this.loadChunksFromPgvector(documentId).then((loaded) =>
      loaded.length > 0 ? loaded : chunks
    )
  }

  private estimateTokens(text: string) {
    return Math.max(1, Math.ceil(text.length / 4))
  }

  private validateTextQuality(text: string, chunks: string[]) {
    if (!text || text.length < 120) {
      return { status: 'failed', message: 'Insufficient extractable text from document.' }
    }
    if (chunks.length < 1) {
      return { status: 'failed', message: 'No valid chunks generated from extracted text.' }
    }
    if (text.length < 500) {
      return { status: 'low_quality', message: 'Low text volume. AI output quality may be limited.' }
    }
    const symbols = (text.match(/[^\p{L}\p{N}\s]/gu) || []).length
    const symbolRatio = symbols / text.length
    if (symbolRatio > 0.35) {
      return { status: 'low_quality', message: 'Text contains many non-text artifacts; RAG quality may be limited.' }
    }
    return { status: 'good', message: 'Text extracted and indexed successfully.' }
  }

  private normalizeLanguageCode(raw: string): string {
    const value = raw.trim().toLowerCase()
    if (!value) return ''
    const isoMatch = value.match(/\b(en|ru|tr|)\b/)
    if (isoMatch?.[1]) return isoMatch[1]
    const aliases: Record<string, string> = {
      english: 'en',
      russian: 'ru',
      turkish: 'tr',
      azerbaijani: 'az',
      azeri: 'az',

    }
    for (const [name, code] of Object.entries(aliases)) {
      if (value === name || value.includes(name)) return code
    }
    if (/^[a-z]{2}(-[a-z]{2})?$/.test(value)) return value.slice(0, 2)
    return ''
  }

  private detectLanguageByScript(text: string): string | null {
    const sample = text.slice(0, 4000)
    if (!sample) return null
    const cyr = (sample.match(/\p{Script=Cyrillic}/gu) || []).length
    const arab = (sample.match(/\p{Script=Arabic}/gu) || []).length
    const latin = (sample.match(/\p{Script=Latin}/gu) || []).length
    const total = cyr + arab + latin
    if (total < 50) return null
    if (cyr / total > 0.35) return 'ru'
    if (arab / total > 0.35) return 'ar'
    if (latin / total > 0.5) {
      // Azerbaijani-specific letters.
      const azChars = (sample.match(/[əğıöüşçƏĞIİÖÜŞÇ]/g) || []).length
      // Turkish-specific letters (without Azerbaijani ə).
      const trChars = (sample.match(/[ğıöüşçİIĞÖÜŞÇ]/g) || []).length
      const lower = sample.toLowerCase()
      const azWords = (lower.match(/\b(və|üçün|ilə|kimi|olan|dərs|mətn)\b/g) || []).length
      const trWords = (lower.match(/\b(ve|için|ile|olarak|ders|metin)\b/g) || []).length
      if (azChars >= 3 || azWords >= 2) return 'az'
      if (trChars >= 3 || trWords >= 2) return 'tr'
      return 'en'
    }
    return null
  }

  private async detectLanguage(text: string) {
    const sample = text.slice(0, 3000).trim()
    if (!sample) return 'en'

    // Fast heuristic first.
    const heuristic = this.detectLanguageByScript(sample)
    if (heuristic && heuristic !== 'en') return heuristic

    try {
      const gateway = new AiGateway(this.app)
      const answer = await gateway.generateText({
        workload: 'rag_query',
        prompt: `Detect dominant language of the following text.
Return ONLY a 2-letter ISO 639-1 code (like en, ru, az, tr, ar, es, fr, de).
Text:
${sample}`,
      })
      const normalized = this.normalizeLanguageCode(answer.text)
      if (normalized) return normalized
    } catch {
      // fallback below
    }

    // Final fallback prefers heuristic result over hardcoded English.
    return heuristic || this.detectLanguageByScript(sample) || 'en'
  }

  private async translateQueryIfNeeded(query: string, contentLanguage: string | null, userId?: string) {
    if (!contentLanguage) return query
    const target = contentLanguage.toLowerCase()
    if (target.startsWith('en')) return query
    try {
      const gateway = new AiGateway(this.app)
      const translated = await gateway.generateText({
        workload: 'rag_query',
        userId,
        prompt: `Translate this search query into ${target}. Return only the translated text:\n${query}`,
      })
      return translated.text || query
    } catch {
      return query
    }
  }

  private async embedText(text: string, userId?: string) {
    const gateway = new AiGateway(this.app)
    const result = await gateway.generateEmbedding({ input: text, userId })
    return result.embeddings[0]
  }

  private async generateChunkEmbeddings(chunks: string[], userId?: string) {
    const embeddings: number[][] = []
    const batchSize = 8
    const gateway = new AiGateway(this.app)
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      const result = await gateway.generateEmbedding({ input: batch, userId })
      embeddings.push(...result.embeddings)
    }
    return embeddings
  }
}
