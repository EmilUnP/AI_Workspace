import { createHash } from 'node:crypto'
import mammoth from 'mammoth'
import WordExtractor from 'word-extractor'
import pdfParse from '@cedrugs/pdf-parse'

/**
 * PostgreSQL text/jsonb cannot contain NUL (\u0000). Some binary-heavy PDFs
 * may leak it into extracted text; strip it to prevent "invalid byte sequence".
 */
export function sanitizeForPostgresText(value: string): string {
  const withoutNull = value.replace(/\u0000/g, '')
  if (typeof (withoutNull as unknown as { toWellFormed?: () => string }).toWellFormed === 'function') {
    return (withoutNull as unknown as { toWellFormed: () => string }).toWellFormed()
  }
  return withoutNull
}

/**
 * Remove common PDF/OCR artifacts so chunking/embedding focuses on useful text.
 * Intentionally conservative to avoid dropping valid educational content.
 */
export function cleanExtractedText(raw: string): string {
  const text = sanitizeForPostgresText(raw)
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

export function normalizeDocumentFileType(fileType: string, fileName: string): string {
  const raw = String(fileType || '').toLowerCase()
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  if (raw.includes('pdf') || ext === 'pdf') return 'pdf'
  if (raw.includes('officedocument.wordprocessingml.document') || ext === 'docx') return 'docx'
  if (raw.includes('msword') || ext === 'doc') return 'doc'
  if (raw.includes('markdown') || ext === 'md' || ext === 'markdown') return 'markdown'
  if (raw.includes('text') || ext === 'txt') return 'text'
  return raw || 'text'
}

/**
 * Extract clean text from an uploaded document buffer.
 * Images/embedded media are discarded — only the text layer is kept for RAG.
 */
export async function extractCleanTextFromBuffer(
  fileBuffer: Buffer,
  fileType: string,
  fileName = ''
): Promise<string> {
  const normalizedFileType = normalizeDocumentFileType(fileType, fileName)
  let text = ''

  if (normalizedFileType === 'pdf') {
    const parsed = await pdfParse(fileBuffer)
    text = parsed.text || ''
  } else if (normalizedFileType === 'docx') {
    const parsed = await mammoth.extractRawText({ buffer: fileBuffer })
    text = parsed.value || ''
  } else if (normalizedFileType === 'doc') {
    const extractor = new WordExtractor()
    const parsed = await extractor.extract(fileBuffer)
    text = parsed.getBody() || ''
  } else {
    text = fileBuffer.toString('utf8')
  }

  return sanitizeForPostgresText(cleanExtractedText(text).replace(/\s+/g, ' ').trim())
}

export function hashExtractedText(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

export function toTextOnlyFileName(originalFileName: string): string {
  const base = originalFileName.replace(/\.[^.]+$/, '').trim() || 'document'
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${safe}.txt`
}
