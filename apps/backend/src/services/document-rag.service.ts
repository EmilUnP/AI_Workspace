import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import mammoth from 'mammoth'
import WordExtractor from 'word-extractor'
import pdfParse from '@cedrugs/pdf-parse'
import { generateEmbedding, generateText } from '../ai/gemini.js'
import { env } from '../config/env.js'
import { resolveGeminiApiKeyForUser } from './gemini-key-resolver.service.js'

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
  text_chunks: string[] | null
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

type DocumentChunksData = {
  chunks: string[]
  embeddings: number[][] | null
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
    const chunks = this.chunkText(text, 4000, 400)
    const embeddings = await this.ensureEmbeddings(doc.id, chunks, userId)
    const apiKey = await resolveGeminiApiKeyForUser(this.app, userId)
    const queryForSearch = await this.translateQueryIfNeeded(data.query, doc.content_language, apiKey)
    const queryVec = await generateEmbedding(queryForSearch, 'gemini-embedding-001', { apiKey })
    let relevant: string[]
    try {
      relevant = this.pickTopChunks(chunks, embeddings, queryVec, data.topK)
    } catch {
      relevant = chunks.slice(0, Math.max(1, data.topK))
    }
    return { documentId: doc.id, chunks: relevant }
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
    const { chunks, embeddings } = await this.getDocumentChunks(doc.id, text, userId)
    if (chunks.length === 0) return []
    const apiKey = await resolveGeminiApiKeyForUser(this.app, userId)
    const queryForSearch = await this.translateQueryIfNeeded(query, doc.content_language, apiKey)
    try {
      const queryVec = await generateEmbedding(queryForSearch, 'gemini-embedding-001', { apiKey })
      if (embeddings && embeddings.length === chunks.length) {
        return this.pickTopChunks(chunks, embeddings, queryVec, Math.max(1, topK))
      }
      return chunks.slice(0, Math.max(1, topK))
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
   */
  async getRelevantContentFromDocuments(
    documentIds: string[],
    userId: string,
    query: string,
    chunksPerDocument = 5
  ): Promise<string> {
    const relevant: string[] = []
    for (const documentId of documentIds) {
      try {
        const chunks = await this.getRelevantChunks(documentId, userId, query, chunksPerDocument)
        relevant.push(...chunks)
      } catch {
        // skip failed document and continue with others
      }
    }
    return relevant.join('\n\n---\n\n')
  }

  private async processSingle(userId: string, documentId: string) {
    const doc = await this.getDoc(userId, documentId)
    if (!doc) return
    await this.app.db.query(`UPDATE documents SET status = 'processing', updated_at = now() WHERE id = $1`, [doc.id])
    try {
      const text = await this.ensureExtractedText(doc)
      const chunks = this.chunkText(text, 4000, 400)
      const apiKey = await resolveGeminiApiKeyForUser(this.app, userId)
      const embeddings = await this.generateChunkEmbeddings(chunks, apiKey)
      const quality = this.validateTextQuality(text, chunks)
      const contentLanguage = await this.detectLanguage(text)

      const totalTokens = this.estimateTokens(text)
      const chunkCount = chunks.length
      const avgChunkSize = chunkCount > 0 ? Math.round(chunks.reduce((a, c) => a + c.length, 0) / chunkCount) : 0

      await this.app.db.query(
        `UPDATE documents
         SET text_chunks = $2::jsonb,
             chunk_embeddings = $3::jsonb,
             content_language = $4,
             total_tokens = $5,
             chunk_count = $6,
             avg_chunk_size = $7,
             quality_status = $8,
             quality_message = $9,
             status = 'ready',
             updated_at = now()
         WHERE id = $1`,
        [
          doc.id,
          this.safeJsonStringify(chunks.map((chunk) => this.sanitizeForPostgresText(chunk)), '[]'),
          this.safeJsonStringify(embeddings, '[]'),
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
      `SELECT id, owner_user_id, file_type, local_path, status, extracted_text, text_chunks, chunk_embeddings, text_extracted_at, file_hash, content_language, total_tokens, chunk_count, avg_chunk_size, quality_status, quality_message
       FROM documents WHERE id = $1 AND owner_user_id = $2 LIMIT 1`,
      [id, userId]
    )
    return rows[0] ?? null
  }

  private async ensureExtractedText(doc: DocRow) {
    if (doc.extracted_text && doc.extracted_text.length > 0) return doc.extracted_text
    if (!doc.local_path) throw new Error('Document local path is missing')

    const localPath = doc.local_path.replace(/\\/g, '/')
    const normalizedStorageRoot = path.resolve(env.AI_STORAGE_DIR).replace(/\\/g, '/')
    let absPath: string

    if (path.isAbsolute(doc.local_path)) {
      absPath = doc.local_path
    } else if (localPath.startsWith('storage/')) {
      // Legacy rows may store relative paths prefixed with "storage/".
      // Avoid ".../storage/storage/..." by resolving from backend root.
      absPath = path.resolve(localPath)
    } else if (localPath.startsWith('documents/')) {
      // Common relative path format inside storage dir.
      absPath = path.join(env.AI_STORAGE_DIR, localPath)
    } else if (localPath.startsWith(normalizedStorageRoot)) {
      // Safety path in case slashes differ but string isn't detected as absolute.
      absPath = path.resolve(localPath)
    } else {
      absPath = path.join(env.AI_STORAGE_DIR, localPath)
    }

    const fileBuffer = await readFile(absPath)
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

  private safeJsonStringify(value: unknown, fallback: string): string {
    try {
      const serialized = JSON.stringify(value)
      return typeof serialized === 'string' ? serialized : fallback
    } catch {
      return fallback
    }
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

  private async getDocumentChunks(documentId: string, documentText: string, userId: string): Promise<DocumentChunksData> {
    const { rows } = await this.app.db.query<Pick<DocRow, 'text_chunks' | 'chunk_embeddings' | 'extracted_text'>>(
      `SELECT text_chunks, chunk_embeddings, extracted_text FROM documents WHERE id = $1 LIMIT 1`,
      [documentId]
    )
    const row = rows[0]
    const cachedChunks = Array.isArray(row?.text_chunks) ? row.text_chunks : null
    const cachedEmbeddings = Array.isArray(row?.chunk_embeddings) ? row.chunk_embeddings : null

    // Reuse previously indexed chunks if source extracted text is unchanged.
    if (
      cachedChunks &&
      cachedChunks.length > 0 &&
      row?.extracted_text === documentText
    ) {
      if (cachedEmbeddings && cachedEmbeddings.length === cachedChunks.length) {
        return { chunks: cachedChunks, embeddings: cachedEmbeddings }
      }
      return { chunks: cachedChunks, embeddings: null }
    }

    const chunks = this.chunkText(documentText, 4000, 400)
    if (chunks.length === 0) return { chunks: [], embeddings: null }

    const embeddings = await this.ensureEmbeddings(documentId, chunks, userId)
    if (Array.isArray(embeddings) && embeddings.length === chunks.length) {
      return { chunks, embeddings }
    }
    return { chunks, embeddings: null }
  }

  private async ensureEmbeddings(documentId: string, chunks: string[], userId: string) {
    const { rows } = await this.app.db.query<Pick<DocRow, 'chunk_embeddings'>>(
      `SELECT chunk_embeddings FROM documents WHERE id = $1`,
      [documentId]
    )
    const existing = rows[0]?.chunk_embeddings
    if (Array.isArray(existing) && existing.length === chunks.length) return existing

    const apiKey = await resolveGeminiApiKeyForUser(this.app, userId)
    const embeddings = await this.generateChunkEmbeddings(chunks, apiKey)
    await this.app.db.query(`UPDATE documents SET text_chunks = $2::jsonb, chunk_embeddings = $3::jsonb WHERE id = $1`, [
      documentId,
      this.safeJsonStringify(chunks.map((chunk) => this.sanitizeForPostgresText(chunk)), '[]'),
      this.safeJsonStringify(embeddings, '[]')
    ])
    return embeddings
  }

  private pickTopChunks(chunks: string[], embeddings: number[][], queryVec: number[], topK: number) {
    if (embeddings.length !== chunks.length || embeddings.length === 0) {
      return chunks.slice(0, Math.max(1, topK))
    }
    // Embedding model/dim mismatch fallback instead of hard failure.
    if (embeddings[0] && embeddings[0].length !== queryVec.length) {
      return chunks.slice(0, Math.max(1, topK))
    }
    const scored = embeddings.map((embedding, index) => ({
      index,
      score: this.cosineSimilarity(embedding, queryVec)
    }))
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, topK).map((x) => chunks[x.index])
  }

  private cosineSimilarity(a: number[], b: number[]) {
    const len = Math.min(a.length, b.length)
    let dot = 0
    let na = 0
    let nb = 0
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i]
      na += a[i] * a[i]
      nb += b[i] * b[i]
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
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
      const fallbackApiKey = env.GOOGLE_GEMINI_API_KEY
      const answer = await generateText(
        `Detect dominant language of the following text.
Return ONLY a 2-letter ISO 639-1 code (like en, ru, az, tr, ar, es, fr, de).
Text:
${sample}`
      , 'gemini-2.5-flash', fallbackApiKey ? { apiKey: fallbackApiKey } : undefined)
      const normalized = this.normalizeLanguageCode(answer)
      if (normalized) return normalized
    } catch {
      // fallback below
    }

    // Final fallback prefers heuristic result over hardcoded English.
    return heuristic || this.detectLanguageByScript(sample) || 'en'
  }

  private async translateQueryIfNeeded(query: string, contentLanguage: string | null, apiKey?: string) {
    if (!contentLanguage) return query
    const target = contentLanguage.toLowerCase()
    if (target.startsWith('en')) return query
    try {
      const translated = await generateText(
        `Translate this search query into ${target}. Return only the translated text:\n${query}`
      , 'gemini-2.5-flash', apiKey ? { apiKey } : undefined)
      return translated || query
    } catch {
      return query
    }
  }

  private async generateChunkEmbeddings(chunks: string[], apiKey?: string) {
    const embeddings: number[][] = []
    const batchSize = 8
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      const batchEmbeddings = await Promise.all(
        batch.map((chunk) => generateEmbedding(chunk, 'gemini-embedding-001', apiKey ? { apiKey } : undefined))
      )
      embeddings.push(...batchEmbeddings)
    }
    return embeddings
  }
}
