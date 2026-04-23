/**
 * Shared Document RAG Service
 * Provides document processing, caching, and vector-based retrieval for both
 * lesson and exam generation
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { AI_MODELS } from '@eduator/config'

// Type for embeddings (array of numbers)
export type Embedding = number[]

/**
 * Get parsed document text from Supabase storage with caching
 */
export async function getParsedDocumentText(
  documentId: string,
  _userId: string,
  _extractText: boolean = false
): Promise<string | null> {
  try {
    // Import here to avoid circular dependencies
    const { createAdminClient } = await import('@eduator/auth/supabase/admin')
    
    // Use admin client for all operations to bypass RLS
    // Access is already verified in the route before calling this function
    const adminSupabase = createAdminClient()

    // Get document info using admin client (including cache fields)
    const { data: document, error: docError } = await adminSupabase
      .from('documents')
      .select('*, extracted_text, text_chunks, text_extracted_at, file_hash, file_path, file_type, file_name, title')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      console.warn(`[RAG] Document not found (id=${documentId}):`, docError?.message ?? 'Unknown error')
      return null
    }

    if (!document.file_path) {
      console.error('Document missing file_path:', document)
      throw new Error('Document file path is missing')
    }

    // Check if we have cached extracted text
    if (document.extracted_text && document.text_extracted_at) {
      // Verify file hasn't changed by checking hash (if hash exists)
      if (document.file_hash) {
        // Download file to check hash
        const { data: fileData } = await adminSupabase.storage
          .from('documents')
          .download(document.file_path)
        
        if (fileData) {
          const arrayBuffer = await fileData.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          const currentHash = await calculateFileHash(buffer)
          
          // If hash matches, use cached text
          if (currentHash === document.file_hash) {
            console.log(`Using cached extracted text for document ${documentId}`)
            return document.extracted_text
          } else {
            console.log(`File changed for document ${documentId}, re-extracting...`)
            // File changed, will extract below
          }
        }
      } else {
        // No hash stored, but we have cached text - use it (first time after migration)
        console.log(`Using cached extracted text for document ${documentId} (no hash check)`)
        return document.extracted_text
      }
    }

    // For PDF files, we need to extract text using proper PDF parser
    if (document.file_type === 'pdf') {
      // Download the file using admin client to bypass RLS
      const { data: fileData, error: downloadError } = await adminSupabase.storage
        .from('documents')
        .download(document.file_path)

      if (downloadError || !fileData) {
        console.error('Failed to download document:', downloadError)
        console.error('File path:', document.file_path)
        throw new Error(`Failed to download PDF file: ${downloadError?.message || 'Unknown error'}. File path: ${document.file_path}`)
      }

      const arrayBuffer = await fileData.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      try {
        // Use @cedrugs/pdf-parse library for proper PDF text extraction
        // This is a maintained fork that works better with Next.js/webpack
        // Suppress Buffer deprecation and PDF.js font warnings (e.g. "TT: undefined function: 32")
        // PDF.js writes these via stderr directly, so we patch stderr.write as well as console.warn
        const originalEmitWarning = process.emitWarning
        process.emitWarning = () => {} // Suppress deprecation warnings temporarily
        const originalConsoleWarn = console.warn
        console.warn = (...args: unknown[]) => {
          const msg = args[0] != null ? String(args[0]) : ''
          if (/TT:\s*undefined function/i.test(msg)) return // PDF.js font recovery message, harmless
          originalConsoleWarn.apply(console, args)
        }
        const originalStderrWrite = process.stderr.write.bind(process.stderr)
        process.stderr.write = ((
          chunk: string | Uint8Array,
          encodingOrCb?: BufferEncoding | ((err?: Error | null) => void),
          cb?: (err?: Error | null) => void
        ): boolean => {
          const str = typeof chunk === 'string' ? chunk : String(chunk)
          if (/TT:\s*undefined function/i.test(str)) return true
          if (typeof encodingOrCb === 'function') return originalStderrWrite(chunk, encodingOrCb)
          return originalStderrWrite(chunk, encodingOrCb, cb)
        }) as typeof process.stderr.write

        // @ts-ignore - @cedrugs/pdf-parse has types but may not be recognized
        const pdfParseModule = require('@cedrugs/pdf-parse')
        // @cedrugs/pdf-parse exports the function directly or as default
        const pdfParse = pdfParseModule.default || pdfParseModule
        if (typeof pdfParse !== 'function') {
          console.error(`[PDF Extraction] Module structure:`, Object.keys(pdfParseModule))
          throw new Error('@cedrugs/pdf-parse did not export a function')
        }
        const pdfData = await pdfParse(buffer)

        // Restore original warn/emitWarning/stderr
        process.stderr.write = originalStderrWrite
        console.warn = originalConsoleWarn
        process.emitWarning = originalEmitWarning
        let text = pdfData.text || ''
        
        console.log(`[PDF Extraction] Raw extracted text length: ${text.length} characters`)
        
        // Clean extracted text (less aggressive now)
        const textBeforeCleaning = text
        text = cleanExtractedText(text)
        console.log(`[PDF Extraction] After cleaning: ${text.length} characters (was ${textBeforeCleaning.length})`)
        
        // Validate text quality
        const qualityCheck = validateTextQuality(text, document.title)
        if (!qualityCheck.isValid) {
          console.warn(`[PDF Extraction] Low quality text detected for document ${documentId}:`, qualityCheck.reason)
          console.warn(`[PDF Extraction] Text length: ${text.length}, Sample: ${text.substring(0, 200)}...`)
          // Still cache it but with a warning - user can try to use it
          const extractedText = text.trim()
          await cacheDocumentText(adminSupabase, documentId, buffer, extractedText)
          return extractedText
        }
        
        const extractedText = text.trim()
        // Cache the extracted text
        await cacheDocumentText(adminSupabase, documentId, buffer, extractedText)
        console.log(`[PDF Extraction] ✅ Successfully extracted ${extractedText.length} characters from PDF ${documentId}`)
        console.log(`[PDF Extraction] Estimated tokens: ${estimateTokens(extractedText)}`)
        return extractedText
      } catch (parseError) {
        console.error('[PDF Extraction] PDF parsing error:', parseError)
        console.error('[PDF Extraction] Error details:', parseError instanceof Error ? parseError.message : String(parseError))
        console.error('[PDF Extraction] Error stack:', parseError instanceof Error ? parseError.stack : 'No stack trace')
        
        // Try alternative import method for CommonJS modules
        try {
          console.log('[PDF Extraction] Attempting alternative import method (require)...')
          const originalWarn = console.warn
          const originalStderr = process.stderr.write.bind(process.stderr)
          let text: string = ''
          try {
            console.warn = (...args: unknown[]) => {
              const msg = args[0] != null ? String(args[0]) : ''
              if (/TT:\s*undefined function/i.test(msg)) return
              originalWarn.apply(console, args)
            }
            process.stderr.write = ((
              chunk: string | Uint8Array,
              encodingOrCb?: BufferEncoding | ((err?: Error | null) => void),
              cb?: (err?: Error | null) => void
            ): boolean => {
              const str = typeof chunk === 'string' ? chunk : String(chunk)
              if (/TT:\s*undefined function/i.test(str)) return true
              if (typeof encodingOrCb === 'function') return originalStderr(chunk, encodingOrCb)
              return originalStderr(chunk, encodingOrCb, cb)
            }) as typeof process.stderr.write
            // @ts-ignore - require is available in Node.js
            const pdfParseModule = require('@cedrugs/pdf-parse')
            const pdfParse = pdfParseModule.default || pdfParseModule
            if (typeof pdfParse !== 'function') {
              throw new Error('@cedrugs/pdf-parse did not export a function in fallback')
            }
            const pdfData = await pdfParse(buffer)
            text = pdfData.text || ''
          } finally {
            process.stderr.write = originalStderr
            console.warn = originalWarn
          }
          console.log(`[PDF Extraction] Alternative method succeeded! Raw extracted text length: ${text.length} characters`)
          
          // Clean extracted text
          const textBeforeCleaning = text
          text = cleanExtractedText(text)
          console.log(`[PDF Extraction] After cleaning: ${text.length} characters (was ${textBeforeCleaning.length})`)
          
          // Validate text quality
          const qualityCheck = validateTextQuality(text, document.title)
          if (!qualityCheck.isValid) {
            console.warn(`[PDF Extraction] Low quality text detected:`, qualityCheck.reason)
          }
          
          const extractedText = text.trim()
          await cacheDocumentText(adminSupabase, documentId, buffer, extractedText)
          console.log(`[PDF Extraction] ✅ Successfully extracted ${extractedText.length} characters using alternative method`)
          console.log(`[PDF Extraction] Estimated tokens: ${estimateTokens(extractedText)}`)
          return extractedText
        } catch (fallbackError) {
          console.error('[PDF Extraction] Alternative import method also failed:', fallbackError)
          // Final fallback: return a helpful message
          const fallbackText = `Document: ${document.title}\n\nContent from: ${document.file_name}\n\nNote: This PDF could not be parsed properly. It may be a scanned document or have complex formatting. Please ensure the PDF contains selectable text.\n\nError: ${parseError instanceof Error ? parseError.message : String(parseError)}`
          await cacheDocumentText(adminSupabase, documentId, buffer, fallbackText)
          return fallbackText
        }
      }
    }

    // For Word .doc (Word 97–2003 binary): use word-extractor (mammoth only supports .docx).
    if (document.file_type === 'doc') {
      const { data: fileData, error: downloadError } = await adminSupabase.storage
        .from('documents')
        .download(document.file_path)
      if (downloadError || !fileData) {
        console.error('Failed to download document:', downloadError)
        throw new Error(`Failed to download Word file: ${downloadError?.message || 'Unknown error'}`)
      }
      const arrayBuffer = await fileData.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      try {
        const mod = await import('word-extractor')
        const WordExtractor = (mod as { default?: unknown }).default ?? mod
        const extractor = new (WordExtractor as new () => { extract: (buf: Buffer) => Promise<{ getBody: () => string }> })()
        const doc = await extractor.extract(buffer)
        const body = doc.getBody()
        let text = (body || '').trim()
        if (text && text.length >= 50) {
          text = cleanExtractedText(text)
          await cacheDocumentText(adminSupabase, documentId, buffer, text)
          console.log(`[Word .doc] Extracted ${text.length} characters`)
          return text
        }
      } catch (docErr) {
        console.error('[Word .doc Extraction] Error:', docErr instanceof Error ? docErr.message : docErr)
      }
      const fallbackText = `Document: ${document.title}\n\nContent from: ${document.file_name}\n\nNote: .doc (Word 97–2003) could not be parsed. Save as .docx and re-upload for best results.`
      await cacheDocumentText(adminSupabase, documentId, buffer, fallbackText)
      return fallbackText
    }

    // For Word .docx (Office Open XML) - extract text with mammoth (try extractRawText, then convertToHtml + strip HTML)
    if (document.file_type === 'docx') {
      const { data: fileData, error: downloadError } = await adminSupabase.storage
        .from('documents')
        .download(document.file_path)
      if (downloadError || !fileData) {
        console.error('Failed to download document:', downloadError)
        throw new Error(`Failed to download Word file: ${downloadError?.message || 'Unknown error'}`)
      }
      const arrayBuffer = await fileData.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const mammoth = await import('mammoth')
      let text = ''

      try {
        const result = await mammoth.extractRawText({ buffer })
        text = (result.value || '').trim()
      } catch (extractErr) {
        console.warn('[Word .docx] extractRawText failed, trying convertToHtml:', extractErr instanceof Error ? extractErr.message : extractErr)
      }

      if (!text || text.length < 100) {
        try {
          const htmlResult = await mammoth.convertToHtml({ buffer })
          const html = (htmlResult.value || '').trim()
          if (html) {
            text = stripHtmlToText(html)
            if (text) console.log(`[Word .docx] Extracted ${text.length} chars via convertToHtml (extractRawText was empty or short)`)
          }
        } catch (htmlErr) {
          console.error('[Word .docx Extraction] convertToHtml failed:', htmlErr instanceof Error ? htmlErr.message : htmlErr)
        }
      }

      if (text && text.length >= 50) {
        text = cleanExtractedText(text)
        await cacheDocumentText(adminSupabase, documentId, buffer, text)
        return text
      }
      const fallbackText = `Document: ${document.title}\n\nContent from: ${document.file_name}\n\nNote: This Word document could not be parsed. Please ensure it contains text and is a valid .docx file.`
      await cacheDocumentText(adminSupabase, documentId, buffer, fallbackText)
      return fallbackText
    }

    // For text/markdown files - use admin client for storage operations
    const { data: fileData, error: downloadError } = await adminSupabase.storage
      .from('documents')
      .download(document.file_path)

    if (downloadError || !fileData) {
      console.error('Failed to download document:', downloadError)
      console.error('File path:', document.file_path)
      throw new Error(`Failed to download file: ${downloadError?.message || 'Unknown error'}. File path: ${document.file_path}`)
    }

    const text = await fileData.text()
    // Cache text files too
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await cacheDocumentText(adminSupabase, documentId, buffer, text)
    return text
  } catch (error) {
    console.error('Error getting document text:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack)
      // Re-throw to get better error messages
      throw error
    }
    throw new Error('Unknown error occurred while processing document')
  }
}

/**
 * Strip HTML to plain text (for mammoth convertToHtml fallback). Preserves Cyrillic and Unicode.
 */
function stripHtmlToText(html: string): string {
  let text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x[0-9a-fA-F]+;|&#[0-9]+;/g, (m) => {
      const isHex = m.charAt(2) === 'x'
      const num = isHex ? parseInt(m.slice(3, -1), 16) : parseInt(m.slice(2, -1), 10)
      return Number.isNaN(num) ? m : String.fromCodePoint(num)
    })
    .replace(/\s+/g, ' ')
    .trim()
  return text
}

/**
 * Clean extracted text from PDF to remove artifacts and improve quality
 * Less aggressive cleaning to preserve legitimate content
 */
function cleanExtractedText(text: string): string {
  const originalLength = text.length
  
  // First, normalize whitespace but preserve line breaks
  text = text.replace(/[ \t]+/g, ' ') // Multiple spaces/tabs to single space
  text = text.replace(/\r\n/g, '\n') // Normalize line endings
  text = text.replace(/\r/g, '\n')
  
  // Remove obvious PDF artifacts (but be conservative)
  // Only remove very specific patterns that are clearly artifacts
  text = text.replace(/\b[a-z]\s+[a-z]\s+[a-z]\s+[a-z]\s+[a-z]\b/g, ' ') // 5+ single letters in a row
  text = text.replace(/\b\d+[a-z]\s+\d+[a-z]\s+\d+[a-z]\b/g, ' ') // Patterns like "3i 3i5 3i" (3+ occurrences)
  text = text.replace(/[\[\]{}()]{4,}/g, ' ') // 4+ consecutive brackets (likely artifact)
  
  // Remove lines that are CLEARLY artifacts (very strict criteria)
  const lines = text.split('\n')
  const cleanedLines = lines.filter(line => {
    const trimmed = line.trim()
    
    // Keep very short lines if they might be meaningful (like "I" or "a")
    if (trimmed.length < 2) return false
    
    // Only remove lines that are clearly garbage (very high symbol ratio)
    const symbolRatio = (trimmed.match(/[^a-zA-Z0-9\s]/g) || []).length / trimmed.length
    if (symbolRatio > 0.7 && trimmed.length < 10) return false // Very short lines with mostly symbols
    
    // Remove lines that are just repeated single characters or symbols
    if (/^([a-z]\s+){5,}$/i.test(trimmed)) return false // 5+ single letters
    if (/^([\[\]{}()]\s*){5,}$/.test(trimmed)) return false // 5+ brackets
    
    // Keep everything else - be conservative
    return true
  })
  
  text = cleanedLines.join('\n')
  
  // Final cleanup - normalize excessive newlines but keep structure
  text = text.replace(/\n{4,}/g, '\n\n\n') // Max 3 consecutive newlines (preserve some structure)
  text = text.replace(/[ \t]+/g, ' ') // Final space normalization
  
  const cleanedLength = text.length
  const reductionPercent = parseFloat(((originalLength - cleanedLength) / originalLength * 100).toFixed(1))
  
  if (reductionPercent > 50) {
    console.warn(`[Text Cleaning] Aggressive reduction: ${originalLength} → ${cleanedLength} chars (${reductionPercent}% reduction)`)
  } else {
    console.log(`[Text Cleaning] Cleaned text: ${originalLength} → ${cleanedLength} chars (${reductionPercent}% reduction)`)
  }
  
  return text.trim()
}

/**
 * Validate text quality to detect low-quality extractions
 */
function validateTextQuality(text: string, _documentTitle: string): { isValid: boolean; reason?: string } {
  if (!text || text.trim().length < 100) {
    return { isValid: false, reason: 'Text too short (less than 100 characters)' }
  }
  
  // Check for meaningful word count
  const words = text.split(/\s+/).filter(w => w.length >= 3)
  if (words.length < 20) {
    return { isValid: false, reason: 'Too few meaningful words' }
  }
  
  // Check for excessive symbols (indicates binary data interpreted as text).
  // Count as "symbols" only chars that are not letters (any script), digits, or whitespace
  // so that Cyrillic, Latin, etc. are not falsely flagged (e.g. Russian PDFs).
  const nonSymbolPattern = /[\p{L}\p{N}\s]/gu
  const letterDigitSpaceCount = (text.match(nonSymbolPattern) || []).length
  const symbolRatio = 1 - letterDigitSpaceCount / text.length
  if (symbolRatio > 0.3) {
    return { isValid: false, reason: 'Too many symbols (possible binary data)' }
  }
  
  // Check for common PDF artifacts
  const artifactPatterns = [
    /[a-z]\s+[A-Z]\s+[a-z]\s+[A-Z]/g, // Alternating case single letters
    /\d+[a-z]\s+\d+[a-z]/g, // Patterns like "3i 3i5"
    /[\[\]{}()]{3,}/g, // Multiple brackets
  ]
  
  for (const pattern of artifactPatterns) {
    const matches = text.match(pattern)
    if (matches && matches.length > 10) {
      return { isValid: false, reason: 'Contains PDF structure artifacts' }
    }
  }
  
  // Check for meaningful sentences (at least some periods, question marks, etc.)
  const sentenceEndings = (text.match(/[.!?]/g) || []).length
  if (sentenceEndings < 3 && text.length > 500) {
    return { isValid: false, reason: 'No sentence structure detected' }
  }
  
  return { isValid: true }
}

/**
 * Calculate MD5 hash of file content for change detection
 */
async function calculateFileHash(buffer: Buffer): Promise<string> {
  const crypto = await import('crypto')
  return crypto.createHash('md5').update(buffer).digest('hex')
}

/**
 * Cache extracted text and file hash in database
 */
async function cacheDocumentText(
  adminSupabase: any,
  documentId: string,
  fileBuffer: Buffer,
  extractedText: string
): Promise<void> {
  try {
    const fileHash = await calculateFileHash(fileBuffer)
    
    await adminSupabase
      .from('documents')
      .update({
        extracted_text: extractedText,
        text_extracted_at: new Date().toISOString(),
        file_hash: fileHash,
      })
      .eq('id', documentId)
    
    console.log(`Cached extracted text for document ${documentId}`)
  } catch (error) {
    // Don't fail if caching fails, just log
    console.warn('Failed to cache document text:', error)
  }
}

/**
 * Chunk text into smaller pieces for RAG with overlap for better context
 */
export function chunkText(text: string, chunkSize: number = 2000, overlap: number = 200): string[] {
  const chunks: string[] = []
  
  // Clean and normalize text
  const cleanText = text.replace(/\s+/g, ' ').trim()
  
  // Split by sentences for better semantic boundaries
  const sentences = cleanText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0)
  
  if (sentences.length === 0) {
    // Fallback: split by paragraphs if no sentence markers
    const paragraphs = cleanText.split(/\n\n+/).filter(p => p.trim().length > 0)
    return paragraphs.filter(p => p.length > 50)
  }
  
  let currentChunk = ''
  let chunkStartIndex = 0
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i]
    const potentialChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence
    
    // If adding this sentence would exceed chunk size, save current chunk
    if (potentialChunk.length > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim())
      
      // Start new chunk with overlap: include last few sentences from previous chunk
      const overlapSentences: string[] = []
      let overlapLength = 0
      
      // Go backwards from current position to build overlap
      for (let j = i - 1; j >= chunkStartIndex && overlapLength < overlap && j >= 0; j--) {
        const prevSentence = sentences[j]
        if (overlapLength + prevSentence.length <= overlap) {
          overlapSentences.unshift(prevSentence)
          overlapLength += prevSentence.length + 1 // +1 for space
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
  
  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  // Filter out very small chunks and ensure minimum quality
  return chunks.filter(chunk => chunk.length > 100) // Increased minimum size
}

/**
 * Get the Gemini API key from environment.
 */
function getEmbeddingApiKey(): string {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_KEY || process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('Missing GOOGLE_GENERATIVE_AI_KEY or GOOGLE_GEMINI_API_KEY')
  return apiKey
}

const GEMINI_EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODELS.EMBEDDING}`

/**
 * Generate embedding for a single text using the Gemini REST API.
 * Uses outputDimensionality to reduce vector size (768 vs default 3072).
 */
export async function generateEmbedding(text: string): Promise<Embedding> {
  const apiKey = getEmbeddingApiKey()
  const response = await fetch(`${GEMINI_EMBED_URL}:embedContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${AI_MODELS.EMBEDDING}`,
      content: { parts: [{ text }] },
      outputDimensionality: AI_MODELS.EMBEDDING_DIMENSIONS,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Embedding API error ${response.status}: ${body.slice(0, 200)}`)
  }

  const data = await response.json()
  const embedding: number[] | undefined = data?.embedding?.values
  if (!embedding || embedding.length === 0) {
    throw new Error('Empty embedding returned')
  }
  return embedding
}

/**
 * Generate embeddings for multiple chunks using the batchEmbedContents REST API.
 * Sends up to 100 texts per request (API limit), dramatically reducing round trips.
 */
export async function generateChunkEmbeddings(chunks: string[]): Promise<Embedding[]> {
  const apiKey = getEmbeddingApiKey()
  const embeddings: Embedding[] = []
  const batchSize = 100

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    const requests = batch.map((text) => ({
      model: `models/${AI_MODELS.EMBEDDING}`,
      content: { parts: [{ text }] },
      outputDimensionality: AI_MODELS.EMBEDDING_DIMENSIONS,
    }))

    const response = await fetch(`${GEMINI_EMBED_URL}:batchEmbedContents?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`Batch embedding API error ${response.status}: ${body.slice(0, 200)}`)
    }

    const data = await response.json()
    const batchEmbeddings: Array<{ values: number[] }> | undefined = data?.embeddings
    if (!Array.isArray(batchEmbeddings) || batchEmbeddings.length !== batch.length) {
      throw new Error(`Batch embedding returned ${batchEmbeddings?.length ?? 0} results, expected ${batch.length}`)
    }

    for (const emb of batchEmbeddings) {
      embeddings.push(emb.values)
    }

    if (i + batchSize < chunks.length) {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  return embeddings
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: Embedding, vecB: Embedding): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length')
  }
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Find most relevant chunks using vector similarity search
 * Handles embedding dimension mismatches gracefully by falling back to first N chunks
 */
export function findRelevantChunks(
  queryEmbedding: Embedding,
  chunks: string[],
  chunkEmbeddings: Embedding[],
  topK: number = 7
): string[] {
  if (chunks.length !== chunkEmbeddings.length) {
    throw new Error('Chunks and embeddings arrays must have the same length')
  }
  
  // Check for embedding dimension mismatch (can happen when embedding model was changed)
  if (chunkEmbeddings.length > 0 && chunkEmbeddings[0].length !== queryEmbedding.length) {
    console.log(`[RAG] Using first ${topK} chunks (embedding model changed: query ${queryEmbedding.length}d vs cached ${chunkEmbeddings[0].length}d). Re-upload document to re-embed.`)
    return chunks.slice(0, topK)
  }
  
  // Calculate similarity scores for all chunks
  const scores = chunkEmbeddings.map((embedding, index) => ({
    index,
    similarity: cosineSimilarity(queryEmbedding, embedding),
    chunk: chunks[index]
  }))
  
  // Sort by similarity (highest first) and take top K
  scores.sort((a, b) => b.similarity - a.similarity)
  
  return scores.slice(0, topK).map(item => item.chunk)
}

/**
 * Get or create chunks and embeddings for a document
 */
export async function getDocumentChunks(
  documentId: string,
  documentText: string
): Promise<{ chunks: string[]; embeddings: Embedding[] | null }> {
  const { createAdminClient } = await import('@eduator/auth/supabase/admin')
  const adminSupabase = createAdminClient()
  
  const { data: docWithChunks } = await adminSupabase
    .from('documents')
    .select('text_chunks, chunk_embeddings, extracted_text, embeddings_generated_at')
    .eq('id', documentId)
    .single()
  
  let chunks: string[]
  let embeddings: Embedding[] | null = null
  
  // If we have cached chunks and they match current text, use them
  if (docWithChunks?.text_chunks && Array.isArray(docWithChunks.text_chunks) && docWithChunks.text_chunks.length > 0) {
    // Verify chunks are still valid by checking if extracted text matches
    if (docWithChunks.extracted_text === documentText) {
      console.log(`[RAG] ✅ Using cached chunks from DB for document ${documentId} (${docWithChunks.text_chunks.length} chunks)`)
      chunks = docWithChunks.text_chunks as string[]
      
      // Check if we have embeddings (main column or fallback table)
      if (docWithChunks.chunk_embeddings &&
          Array.isArray(docWithChunks.chunk_embeddings) &&
          docWithChunks.chunk_embeddings.length === chunks.length) {
        embeddings = docWithChunks.chunk_embeddings as Embedding[]
        console.log(`[RAG] ✅ Using cached embeddings from DB for document ${documentId} (${embeddings.length} embeddings)`)
      } else {
        const fromTable = await loadEmbeddingsFromChunkTable(adminSupabase, documentId, chunks.length)
        if (fromTable && fromTable.length === chunks.length) {
          embeddings = fromTable
          console.log(`[RAG] ✅ Using cached embeddings from document_chunk_embeddings for document ${documentId} (${embeddings.length} embeddings)`)
        } else {
          console.log(`[RAG] ⚠️ Cached chunks found but no embeddings - will use simple chunk selection`)
        }
      }
    } else {
      // Text changed, re-chunk
      console.log(`[RAG] ⚠️ Text changed for document ${documentId}, re-chunking and updating cache...`)
      chunks = chunkText(documentText, 4000, 400)
      const generatedEmbeddings = await cacheDocumentChunks(adminSupabase, documentId, chunks)
      await updateDocumentStats(adminSupabase, documentId, documentText, chunks, 'completed')
      if (generatedEmbeddings.length === chunks.length) {
        embeddings = generatedEmbeddings
        console.log(`[RAG] ✅ Re-chunked and generated ${chunks.length} chunks with ${embeddings.length} embeddings for document ${documentId}`)
      }
    }
  } else {
    // No cached chunks, create them
    console.log(`[RAG] ⚠️ No cached chunks found in DB for document ${documentId}, creating new chunks and embeddings...`)
    console.log(`[RAG] Document text length: ${documentText.length} characters`)
    chunks = chunkText(documentText, 4000, 400)
    console.log(`[RAG] Created ${chunks.length} chunks from document text`)
    
    if (chunks.length === 0) {
      console.error(`[RAG] ❌ No chunks created from document ${documentId}! Text might be too short or empty.`)
      console.error(`[RAG] Document text sample: ${documentText.substring(0, 500)}...`)
    }
    
    // Cache the chunks and generate embeddings - use returned embeddings directly
    // (DB re-read can fail for large documents due to JSONB row size limits)
    const generatedEmbeddings = await cacheDocumentChunks(adminSupabase, documentId, chunks)
    await updateDocumentStats(adminSupabase, documentId, documentText, chunks, 'completed')
    if (generatedEmbeddings.length === chunks.length) {
      embeddings = generatedEmbeddings
      console.log(`[RAG] ✅ Created ${chunks.length} chunks with ${embeddings.length} embeddings for document ${documentId}`)
    } else if (generatedEmbeddings.length > 0) {
      console.warn(`[RAG] ⚠️ Embeddings count (${generatedEmbeddings.length}) doesn't match chunks (${chunks.length}), skipping vector search`)
    }
  }
  
  return { chunks, embeddings }
}

/**
 * Detect the content language of a document using Gemini (fast, accurate, works for all scripts).
 * Samples 1-2 chunks of text to identify the language.
 * Returns a language name like "Russian", "English", "Azerbaijani", etc.
 */
export async function detectDocumentLanguage(text: string): Promise<string | null> {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_KEY || process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) return null

    // Sample ~1000 chars from the middle of the document for better representation
    const midPoint = Math.floor(text.length / 2)
    const sample = text.slice(Math.max(0, midPoint - 500), midPoint + 500).trim()
    if (sample.length < 50) return null

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: AI_MODELS.LANGUAGE_DETECTION })
    const result = await model.generateContent(
      `What language is this text written in? Return ONLY the language name in English (e.g. "Russian", "English", "Azerbaijani", "Turkish", "German", "French", "Arabic", "Spanish"). If mixed, return the dominant language.\n\nText: "${sample}"`
    )
    const detected = result.response?.text()?.trim().replace(/[."']/g, '')
    if (detected && detected.length > 0 && detected.length < 30) {
      return detected
    }
    return null
  } catch (err) {
    console.warn('[RAG] Language detection failed:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Use Gemini to translate a short query into the target language for better RAG matching.
 * Fast and cheap since queries are short (~5-20 words).
 */
async function translateQueryForRag(query: string, targetLanguage: string): Promise<string> {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_KEY || process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) return query

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(
      `Translate the following text to ${targetLanguage}. Return ONLY the translation, no explanation.\n\nText: "${query}"`
    )
    const translated = result.response?.text()?.trim()
    if (translated && translated.length > 0) {
      console.log(`[RAG] 🌐 Translated query for cross-language RAG: "${query}" → "${translated}" (${targetLanguage})`)
      return translated
    }
    return query
  } catch (err) {
    console.warn('[RAG] Query translation failed, using original:', err instanceof Error ? err.message : err)
    return query
  }
}

/**
 * Get the saved content_language for a document (detected during upload processing).
 * Falls back to quick LLM detection if not yet saved.
 */
async function getDocumentContentLanguage(documentId: string, documentText: string): Promise<string | null> {
  try {
    const { createAdminClient } = await import('@eduator/auth/supabase/admin')
    const adminSupabase = createAdminClient()
    const { data } = await adminSupabase
      .from('documents')
      .select('content_language')
      .eq('id', documentId)
      .single()

    if (data?.content_language && typeof data.content_language === 'string') {
      console.log(`[RAG] 🌐 Document content language from DB: "${data.content_language}"`)
      return data.content_language
    }

    // Not saved yet (older document uploaded before this feature). Detect now and save.
    console.log(`[RAG] 🌐 No content_language in DB for document ${documentId}, detecting...`)
    const detected = await detectDocumentLanguage(documentText)
    if (detected) {
      console.log(`[RAG] 🌐 Detected and saving content language for document ${documentId}: ${detected}`)
      await adminSupabase
        .from('documents')
        .update({ content_language: detected })
        .eq('id', documentId)
      return detected
    }
    console.log(`[RAG] 🌐 Could not detect content language for document ${documentId}`)
    return null
  } catch (err) {
    console.warn(`[RAG] 🌐 Error getting document content language:`, err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Detect language of a short text (query, topic). Unlike detectDocumentLanguage which
 * samples from a large document, this works on inputs as short as 5 characters.
 */
async function detectQueryLanguage(text: string): Promise<string | null> {
  try {
    const trimmed = text.trim()
    if (trimmed.length < 5) return null

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_KEY || process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) return null

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: AI_MODELS.LANGUAGE_DETECTION })
    const result = await model.generateContent(
      `What language is this short text written in? Return ONLY the language name in English (e.g. "Russian", "English", "Azerbaijani", "Turkish", "German", "French", "Arabic", "Spanish"). Text: "${trimmed}"`
    )
    const detected = result.response?.text()?.trim().replace(/[."']/g, '')
    if (detected && detected.length > 0 && detected.length < 30) {
      return detected
    }
    return null
  } catch (err) {
    console.warn('[RAG] Query language detection failed:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Check if a query is likely in a different language than the document content.
 * Uses the saved content_language from the document and detects the query language.
 */
async function shouldTranslateQuery(query: string, docLanguage: string): Promise<boolean> {
  const queryLang = await detectQueryLanguage(query)
  console.log(`[RAG] 🌐 Language comparison — query: "${queryLang}", document: "${docLanguage}"`)
  if (!queryLang) return false
  const norm = (s: string) => s.toLowerCase().trim()
  return norm(queryLang) !== norm(docLanguage)
}

/**
 * Get relevant chunks for a query/topic using vector search or LLM fallback.
 * Handles cross-language scenarios: if the document content language differs from
 * the query language, the query is translated to the document's language before
 * embedding to improve semantic match accuracy.
 */
export async function getRelevantChunks(
  documentId: string,
  documentText: string,
  query: string,
  topK: number = 7
): Promise<string[]> {
  const { chunks, embeddings } = await getDocumentChunks(documentId, documentText)
  
  if (chunks.length === 0) {
    throw new Error('Document text could not be chunked properly')
  }
  
  if (chunks.length <= topK) {
    return chunks
  }
  
  if (embeddings && embeddings.length === chunks.length) {
    try {
      console.log(`[RAG] 🔍 Using vector similarity search with ${embeddings.length} embeddings for query: "${query}"`)
      
      // Cross-language handling: translate query to document language if they differ
      let effectiveQuery = query
      const docLanguage = await getDocumentContentLanguage(documentId, documentText)
      if (docLanguage) {
        const needsTranslation = await shouldTranslateQuery(query, docLanguage)
        if (needsTranslation) {
          console.log(`[RAG] 🌐 Cross-language: document is in ${docLanguage}, translating query...`)
          effectiveQuery = await translateQueryForRag(query, docLanguage)
        }
      }

      const queryEmbedding = await generateEmbedding(effectiveQuery)
      const relevant = findRelevantChunks(queryEmbedding, chunks, embeddings, topK)
      console.log(`[RAG] ✅ Found ${relevant.length} most relevant chunks using vector search`)
      return relevant
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('[RAG] ❌ Error in vector similarity search:', errorMessage)
      
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        console.warn('[RAG] ⚠️ Embedding model may be unavailable. Using first chunks as fallback.')
      }
      
      console.log(`[RAG] 📋 Falling back to first ${topK} chunks`)
      return chunks.slice(0, topK)
    }
  } else {
    const embLen = embeddings ? embeddings.length : 0
    console.log(`[RAG] ⚠️ No usable embeddings (have ${embLen}, need ${chunks.length}), using first ${topK} chunks as fallback`)
    return chunks.slice(0, topK)
  }
}

/**
 * Normalize Supabase/HTTP error messages. When Supabase is behind Cloudflare and
 * the origin fails, the client may receive HTML (520/521) instead of JSON.
 * Return a short message so we don't log huge HTML dumps.
 */
function normalizeSupabaseErrorMessage(msg: string | undefined): string {
  if (!msg || typeof msg !== 'string') return 'Unknown error'
  const trimmed = msg.trim()
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
    const code = trimmed.includes('520') ? '520' : trimmed.includes('521') ? '521' : '5xx'
    return `Supabase/Cloudflare returned HTML (${code} - origin error or server temporarily down). Try again in a few minutes.`
  }
  if (trimmed.length > 200) return trimmed.slice(0, 200) + '...'
  return trimmed
}

/**
 * Cache text chunks and their embeddings in database.
 * Returns the generated embeddings so callers don't need to re-read from DB
 * (which can fail for large documents due to JSONB row size limits).
 */
async function cacheDocumentChunks(
  adminSupabase: any,
  documentId: string,
  chunks: string[]
): Promise<Embedding[]> {
  // Save text_chunks FIRST in a separate update so they persist even if
  // the embeddings update fails (large JSONB payloads can exceed column limits).
  try {
    await adminSupabase
      .from('documents')
      .update({ text_chunks: chunks })
      .eq('id', documentId)
    console.log(`[RAG] ✅ Saved ${chunks.length} text chunks to DB for document ${documentId}`)
  } catch (chunkSaveError) {
    console.warn('[RAG] ⚠️ Failed to save text_chunks to DB:', chunkSaveError)
  }

  let embeddings: Embedding[] = []
  try {
    console.log(`Generating embeddings for ${chunks.length} chunks...`)
    embeddings = await generateChunkEmbeddings(chunks)

    // Try saving to documents.chunk_embeddings first (works for small/medium docs)
    const { error: updateError } = await adminSupabase
      .from('documents')
      .update({
        chunk_embeddings: embeddings,
        embeddings_generated_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    if (updateError) {
      console.warn(`[RAG] ⚠️ documents.chunk_embeddings update failed:`, normalizeSupabaseErrorMessage(updateError.message))
    }

    // Verify the save actually persisted (large JSONB payloads can silently fail or hit size limits)
    const { data: verify } = await adminSupabase
      .from('documents')
      .select('chunk_embeddings')
      .eq('id', documentId)
      .single()
    const savedCount = Array.isArray(verify?.chunk_embeddings) ? verify.chunk_embeddings.length : 0

    if (savedCount !== embeddings.length) {
      console.warn(`[RAG] ⚠️ Embeddings DB save mismatch: generated ${embeddings.length}, DB has ${savedCount}. Saving to document_chunk_embeddings table...`)
      const savedToTable = await saveEmbeddingsToChunkTable(adminSupabase, documentId, embeddings)
      if (savedToTable) {
        console.log(`[RAG] ✅ Saved ${embeddings.length} embeddings to document_chunk_embeddings for document ${documentId}`)
      } else {
        console.warn(`[RAG] ⚠️ Could not save to document_chunk_embeddings; in-memory embeddings will only work in this session.`)
      }
    } else {
      console.log(`[RAG] ✅ Cached ${chunks.length} chunks with ${embeddings.length} embeddings for document ${documentId}`)
    }
  } catch (error) {
    console.warn('[RAG] ⚠️ Failed to generate/save embeddings:', error)
  }
  return embeddings
}

/**
 * Save embeddings to document_chunk_embeddings table (one row per chunk).
 * Used when documents.chunk_embeddings JSONB is too large (e.g. 600+ chunks).
 * Retries on 5xx/connection failures. Returns true if all rows were saved.
 */
async function saveEmbeddingsToChunkTable(
  adminSupabase: any,
  documentId: string,
  embeddings: Embedding[]
): Promise<boolean> {
  const maxRetries = 3
  const delayMs = 2000

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { error: deleteError } = await adminSupabase
        .from('document_chunk_embeddings')
        .delete()
        .eq('document_id', documentId)
      if (deleteError && attempt === 1) {
        console.warn('[RAG] document_chunk_embeddings delete (may be first run):', normalizeSupabaseErrorMessage(deleteError.message))
      }

      const batchSize = 50
      let batchFailed = false
      for (let i = 0; i < embeddings.length; i += batchSize) {
        const batch = embeddings.slice(i, i + batchSize).map((embedding, idx) => ({
          document_id: documentId,
          chunk_index: i + idx,
          embedding,
        }))
        const { error } = await adminSupabase.from('document_chunk_embeddings').insert(batch)
        if (error) {
          const msg = normalizeSupabaseErrorMessage(error.message)
          console.warn(`[RAG] document_chunk_embeddings insert error (attempt ${attempt}/${maxRetries}):`, msg)
          batchFailed = true
          if (attempt < maxRetries && (msg.includes('520') || msg.includes('521') || msg.includes('5xx') || msg.includes('server'))) {
            console.log(`[RAG] Retrying in ${delayMs / 1000}s...`)
            await new Promise((r) => setTimeout(r, delayMs))
          }
          break
        }
      }
      if (!batchFailed) return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.warn(`[RAG] saveEmbeddingsToChunkTable error (attempt ${attempt}/${maxRetries}):`, normalizeSupabaseErrorMessage(msg))
      if (attempt < maxRetries) await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  return false
}

/**
 * Load embeddings from document_chunk_embeddings table (used when documents.chunk_embeddings is empty).
 * Returns array of embeddings in chunk_index order, or null if table missing or empty.
 */
async function loadEmbeddingsFromChunkTable(
  adminSupabase: any,
  documentId: string,
  expectedCount: number
): Promise<Embedding[] | null> {
  try {
    const { data, error } = await adminSupabase
      .from('document_chunk_embeddings')
      .select('chunk_index, embedding')
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true })

    if (error) {
      console.warn('[RAG] loadEmbeddingsFromChunkTable query error:', error.message)
      return null
    }
    if (!Array.isArray(data) || data.length === 0 || data.length !== expectedCount) {
      return null
    }
    return data.map((row: { embedding: Embedding }) => row.embedding)
  } catch (e) {
    console.warn('[RAG] loadEmbeddingsFromChunkTable error:', e)
    return null
  }
}

/**
 * Get document content from multiple documents (for exam generation)
 */
export async function getDocumentsContent(
  documentIds: string[],
  userId: string
): Promise<string> {
  const contents: string[] = []
  
  for (const documentId of documentIds) {
    try {
      const text = await getParsedDocumentText(documentId, userId, false)
      if (text) {
        contents.push(text)
      }
    } catch (error) {
      console.warn(`Failed to get content for document ${documentId}:`, error)
      // Continue with other documents
    }
  }
  
  return contents.join('\n\n---\n\n')
}

/**
 * Get relevant content from multiple documents for a query (for exam generation)
 * Uses cached RAG data (chunks and embeddings) from database for fast retrieval
 */
export async function getRelevantContentFromDocuments(
  documentIds: string[],
  userId: string,
  query: string,
  chunksPerDocument: number = 5
): Promise<string> {
  console.log(`[RAG] Getting relevant content from ${documentIds.length} document(s) for query: "${query}"`)
  const relevantChunks: string[] = []
  
  // Check document processing status first
  const { createAdminClient } = await import('@eduator/auth/supabase/admin')
  const adminSupabase = createAdminClient()
  
  const { data: docStatuses } = await adminSupabase
    .from('documents')
    .select('id, title, processing_status, extracted_text, text_chunks')
    .in('id', documentIds)
  
  const existingIds = docStatuses?.map(d => d.id) ?? []
  const missingIds = documentIds.filter(id => !existingIds.includes(id))
  if (missingIds.length > 0) {
    console.warn(`[RAG] ⚠️ Skipping ${missingIds.length} non-existent or inaccessible document(s):`, missingIds)
  }
  const documentIdsToProcess = existingIds.length > 0 ? existingIds : documentIds
  
  if (docStatuses) {
    const unprocessedDocs = docStatuses.filter(doc => 
      !doc.extracted_text || 
      doc.processing_status === 'processing' || 
      doc.processing_status === 'failed' ||
      !doc.text_chunks ||
      (Array.isArray(doc.text_chunks) && doc.text_chunks.length === 0)
    )
    
    if (unprocessedDocs.length > 0) {
      console.warn(`[RAG] ⚠️ ${unprocessedDocs.length} document(s) not fully processed yet:`, 
        unprocessedDocs.map(d => ({ id: d.id, title: d.title, status: d.processing_status }))
      )
    }
  }
  
  for (const documentId of documentIdsToProcess) {
    try {
      // Step 1: Get document text (checks DB for cached extracted_text first)
      console.log(`[RAG] Processing document ${documentId}...`)
      const documentText = await getParsedDocumentText(documentId, userId, false)
      if (!documentText) {
        console.warn(`[RAG] ⚠️ No text found for document ${documentId}, skipping`)
        continue
      }
      
      if (documentText.length < 50) {
        console.warn(`[RAG] ⚠️ Document ${documentId} has very short text (${documentText.length} chars), may not be useful`)
      }
      
      // Step 2: Get relevant chunks (checks DB for cached chunks and embeddings)
      // This will use cached chunks/embeddings if available, or create new ones
      const chunks = await getRelevantChunks(documentId, documentText, query, chunksPerDocument)
      console.log(`[RAG] ✅ Found ${chunks.length} relevant chunks for document ${documentId}`)
      
      if (chunks.length === 0) {
        console.warn(`[RAG] ⚠️ No relevant chunks found for document ${documentId} with query "${query}"`)
      }
      
      relevantChunks.push(...chunks)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`[RAG] ❌ Failed to get relevant chunks for document ${documentId}:`, errorMsg)
      if (error instanceof Error && error.stack) {
        console.error(`[RAG] Error stack:`, error.stack)
      }
      // Continue with other documents
    }
  }
  
  console.log(`[RAG] ✅ Total relevant chunks found: ${relevantChunks.length} from ${documentIdsToProcess.length} document(s)`)
  
  if (relevantChunks.length === 0) {
    console.warn(`[RAG] ⚠️ No relevant chunks found from any documents. This may indicate:`)
    console.warn(`[RAG]   1. Documents are still processing`)
    console.warn(`[RAG]   2. Documents don't contain content relevant to the query`)
    console.warn(`[RAG]   3. Documents failed to extract text properly`)
  }
  
  return relevantChunks.join('\n\n---\n\n')
}

/**
 * Estimate token count from text (approximate, using 1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  // This is a simplified approximation
  return Math.ceil(text.length / 4)
}

/**
 * Calculate chunk statistics
 */
function calculateChunkStats(chunks: string[]): {
  chunkCount: number
  avgChunkSize: number
  totalTokens: number
} {
  if (chunks.length === 0) {
    return { chunkCount: 0, avgChunkSize: 0, totalTokens: 0 }
  }
  
  const totalChars = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const avgChunkSize = Math.round(totalChars / chunks.length)
  const totalTokens = estimateTokens(chunks.join(' '))
  
  return {
    chunkCount: chunks.length,
    avgChunkSize,
    totalTokens
  }
}

/**
 * Update document statistics and optional quality fields in database
 */
async function updateDocumentStats(
  adminSupabase: any,
  documentId: string,
  documentText: string,
  chunks: string[],
  status: 'processing' | 'completed' | 'failed' = 'completed',
  quality?: { status: 'good' | 'low_quality' | 'failed'; message?: string | null }
): Promise<void> {
  try {
    const stats = calculateChunkStats(chunks)
    const totalTextTokens = estimateTokens(documentText)
    const payload: Record<string, unknown> = {
      total_tokens: totalTextTokens,
      chunk_count: stats.chunkCount,
      avg_chunk_size: stats.avgChunkSize,
      processing_status: status,
    }
    if (quality) {
      payload.quality_status = quality.status
      payload.quality_message = quality.message ?? null
      payload.processing_error_message = null
    }
    await adminSupabase
      .from('documents')
      .update(payload)
      .eq('id', documentId)
    console.log(`Updated stats for document ${documentId}: ${stats.chunkCount} chunks, ${totalTextTokens} tokens`)
  } catch (error) {
    console.warn('Failed to update document stats:', error)
  }
}

/** Queue for document processing: one job at a time to avoid concurrent PDF parse and duplicate TT warnings */
type QueuedJob = {
  documentId: string
  userId: string
  resolve: () => void
  reject: (err: unknown) => void
}
const documentProcessingQueue: QueuedJob[] = []
let documentQueueRunning = false

async function runDocumentProcessingQueue(): Promise<void> {
  if (documentQueueRunning || documentProcessingQueue.length === 0) return
  const job = documentProcessingQueue.shift()
  if (!job) return
  documentQueueRunning = true
  try {
    await processDocumentOnUploadInternal(job.documentId, job.userId)
    job.resolve()
  } catch (err) {
    job.reject(err)
  } finally {
    documentQueueRunning = false
    if (documentProcessingQueue.length > 0) {
      void runDocumentProcessingQueue()
    }
  }
}

/**
 * Internal: run extraction, chunking, embeddings for one document.
 * Called by the queue runner only.
 */
async function processDocumentOnUploadInternal(documentId: string, userId: string): Promise<void> {
  const { createAdminClient } = await import('@eduator/auth/supabase/admin')
  const adminSupabase = createAdminClient()
  const setFailed = async (message: string) => {
    const truncated = message.length > 500 ? message.slice(0, 497) + '...' : message
    await adminSupabase
      .from('documents')
      .update({
        processing_status: 'failed',
        processing_error_message: truncated,
      })
      .eq('id', documentId)
  }
  try {
    console.log(`Starting background processing for document ${documentId}`)
    await adminSupabase
      .from('documents')
      .update({ processing_status: 'processing', processing_error_message: null })
      .eq('id', documentId)

    const documentText = await getParsedDocumentText(documentId, userId, false)
    if (!documentText) {
      console.warn(`No text extracted for document ${documentId}, skipping processing`)
      await setFailed('No text could be extracted (e.g. scanned PDF or images only).')
      return
    }

    const { data: docRow } = await adminSupabase
      .from('documents')
      .select('title')
      .eq('id', documentId)
      .single()
    const title = docRow?.title ?? ''
    const qualityCheck = validateTextQuality(documentText, title)
    const quality =
      qualityCheck.isValid
        ? { status: 'good' as const, message: null as string | null }
        : { status: 'low_quality' as const, message: qualityCheck.reason ?? null }

    const { chunks } = await getDocumentChunks(documentId, documentText)

    // Detect and save the document's content language for cross-language RAG
    let detectedLanguage: string | null = null
    try {
      detectedLanguage = await detectDocumentLanguage(documentText)
      if (detectedLanguage) {
        console.log(`[RAG] 🌐 Detected document content language: ${detectedLanguage}`)
        await adminSupabase
          .from('documents')
          .update({ content_language: detectedLanguage })
          .eq('id', documentId)
      }
    } catch (langErr) {
      console.warn('[RAG] Language detection skipped:', langErr instanceof Error ? langErr.message : langErr)
    }

    await updateDocumentStats(adminSupabase, documentId, documentText, chunks, 'completed', quality)
    console.log(`Completed background processing for document ${documentId}${detectedLanguage ? ` (language: ${detectedLanguage})` : ''}`)
  } catch (error) {
    console.error(`Error processing document ${documentId} in background:`, error)
    const message = error instanceof Error ? error.message : String(error)
    try {
      await setFailed(message)
    } catch (updateError) {
      console.error('Failed to update processing status:', updateError)
    }
  }
}

/**
 * Process document immediately after upload (background processing).
 * Jobs are queued and processed one at a time to avoid concurrent PDF parsing
 * and overlapping uploads; the promise resolves when this document is done.
 */
export function processDocumentOnUpload(documentId: string, userId: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    documentProcessingQueue.push({ documentId, userId, resolve, reject })
    void runDocumentProcessingQueue()
  })
}
