import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import mammoth from 'mammoth'
import WordExtractor from 'word-extractor'
import pdfParse from '@cedrugs/pdf-parse'
import { generateEmbedding } from '../ai/gemini.js'
import { env } from '../config/env.js'

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
  extracted_text: string | null
  text_chunks: string[] | null
  chunk_embeddings: number[][] | null
}

export class DocumentRagService {
  constructor(private readonly app: FastifyInstance) {}

  async retrieve(userId: string, input: unknown) {
    const data = querySchema.parse(input)
    const doc = await this.getDoc(userId, data.documentId)
    if (!doc) {
      const err = new Error('Document not found') as Error & { statusCode?: number }
      err.statusCode = 404
      throw err
    }
    const text = await this.ensureExtractedText(doc)
    const chunks = this.chunkText(text, 2000, 200)
    const embeddings = await this.ensureEmbeddings(doc.id, chunks)
    const queryVec = await generateEmbedding(data.query)
    const relevant = this.pickTopChunks(chunks, embeddings, queryVec, data.topK)
    return { documentId: doc.id, chunks: relevant }
  }

  private async getDoc(userId: string, id: string) {
    const { rows } = await this.app.db.query<DocRow>(
      `SELECT id, owner_user_id, file_type, local_path, extracted_text, text_chunks, chunk_embeddings
       FROM documents WHERE id = $1 AND owner_user_id = $2 LIMIT 1`,
      [id, userId]
    )
    return rows[0] ?? null
  }

  private async ensureExtractedText(doc: DocRow) {
    if (doc.extracted_text && doc.extracted_text.length > 0) return doc.extracted_text
    if (!doc.local_path) throw new Error('Document local path is missing')

    const absPath = path.isAbsolute(doc.local_path)
      ? doc.local_path
      : path.join(env.AI_STORAGE_DIR, doc.local_path)

    const fileBuffer = await readFile(absPath)
    let text = ''

    if (doc.file_type === 'pdf') {
      const parsed = await pdfParse(fileBuffer)
      text = parsed.text || ''
    } else if (doc.file_type === 'docx') {
      const parsed = await mammoth.extractRawText({ buffer: fileBuffer })
      text = parsed.value || ''
    } else if (doc.file_type === 'doc') {
      const extractor = new WordExtractor()
      const parsed = await extractor.extract(fileBuffer)
      text = parsed.getBody() || ''
    } else {
      text = fileBuffer.toString('utf8')
    }

    const normalized = text.replace(/\s+/g, ' ').trim()
    await this.app.db.query(`UPDATE documents SET extracted_text = $2 WHERE id = $1`, [doc.id, normalized])
    return normalized
  }

  private chunkText(text: string, chunkSize: number, overlap: number) {
    const chunks: string[] = []
    let index = 0
    while (index < text.length) {
      const end = Math.min(index + chunkSize, text.length)
      chunks.push(text.slice(index, end).trim())
      if (end === text.length) break
      index = end - overlap
    }
    return chunks.filter((c) => c.length > 50)
  }

  private async ensureEmbeddings(documentId: string, chunks: string[]) {
    const { rows } = await this.app.db.query<Pick<DocRow, 'chunk_embeddings'>>(
      `SELECT chunk_embeddings FROM documents WHERE id = $1`,
      [documentId]
    )
    const existing = rows[0]?.chunk_embeddings
    if (Array.isArray(existing) && existing.length === chunks.length) return existing

    const embeddings: number[][] = []
    for (const chunk of chunks) {
      embeddings.push(await generateEmbedding(chunk))
    }
    await this.app.db.query(`UPDATE documents SET text_chunks = $2::jsonb, chunk_embeddings = $3::jsonb WHERE id = $1`, [
      documentId,
      JSON.stringify(chunks),
      JSON.stringify(embeddings)
    ])
    return embeddings
  }

  private pickTopChunks(chunks: string[], embeddings: number[][], queryVec: number[], topK: number) {
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
}
