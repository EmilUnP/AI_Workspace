'use server'

import { getAccessToken } from '@/lib/backend-auth'

type QuickUploadInput = {
  organizationId?: string
  file?: File
  title?: string
  description?: string
}

type UpdateDocumentInput = {
  documentId: string
  title?: string
  description?: string | null
  tags?: string[] | null
}

const getBackendBase = () => process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'
const getFileProxyBase = () => process.env.NEXT_PUBLIC_APP_URL || ''

type NormalizedFileType = 'pdf' | 'markdown' | 'text' | 'doc' | 'docx'

function normalizeFileType(fileName: string, mimeType?: string): NormalizedFileType {
  const extension = fileName.split('.').pop()?.toLowerCase()
  if (extension === 'pdf' || mimeType?.includes('pdf')) return 'pdf'
  if (extension === 'md' || extension === 'markdown' || mimeType?.includes('markdown')) return 'markdown'
  if (extension === 'docx' || mimeType?.includes('officedocument.wordprocessingml.document')) return 'docx'
  if (extension === 'doc' || mimeType?.includes('msword')) return 'doc'
  return 'text'
}

function fallbackMimeType(fileType: NormalizedFileType): string {
  if (fileType === 'pdf') return 'application/pdf'
  if (fileType === 'markdown') return 'text/markdown'
  if (fileType === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (fileType === 'doc') return 'application/msword'
  return 'text/plain'
}

function normalizeTitle(inputTitle?: string, fileName?: string): string {
  const raw = (inputTitle || '').trim()
  if (raw) return raw
  const fallback = (fileName || 'Untitled document').trim()
  return fallback.replace(/\.[^/.]+$/, '')
}

function normalizeProcessingStatus(value: unknown): 'pending' | 'processing' | 'completed' | 'failed' {
  const raw = String(value || '').toLowerCase().trim()
  if (raw === 'ready' || raw === 'completed') return 'completed'
  if (raw === 'failed' || raw === 'error') return 'failed'
  if (raw === 'processing' || raw === 'uploaded') return 'processing'
  return 'pending'
}

export async function quickUploadDocument(input: QuickUploadInput) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: 'Not authenticated' }

  const fileName = (input.file?.name || input.title || 'untitled.txt').trim()
  const fileType = normalizeFileType(fileName, input.file?.type)
  const mimeType = input.file?.type || fallbackMimeType(fileType)
  const title = normalizeTitle(input.title, fileName)
  const fileSize = input.file?.size || 0
  const contentBase64 = input.file
    ? Buffer.from(await input.file.arrayBuffer()).toString('base64')
    : undefined

  try {
    const response = await fetch(`${getBackendBase()}/v1/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        fileName,
        fileType: mimeType,
        fileSize,
        contentBase64,
        metadata: {
          description: input.description || '',
          detectedFileType: fileType,
          originalMimeType: mimeType,
          organizationId: input.organizationId || null,
          source: 'web-app-legacy-documents-screen',
        },
      }),
      cache: 'no-store',
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      return { success: false, error: payload.error || 'Failed to create document record' }
    }

    const payload = (await response.json()) as { document?: Record<string, unknown> }
    if (!payload.document) {
      return { success: false, error: 'Document created but backend returned empty payload.' }
    }

    return {
      success: true,
      data: {
        id: String(payload.document.id || ''),
        title: String(payload.document.title || title),
        description: String((payload.document.metadata as Record<string, unknown> | undefined)?.description || ''),
        file_name: String(payload.document.file_name || payload.document.fileName || fileName),
        file_size: Number(payload.document.file_size || payload.document.fileSize || fileSize),
        file_type: normalizeFileType(
          String(payload.document.file_name || payload.document.fileName || fileName),
          String(payload.document.file_type || payload.document.fileType || mimeType)
        ),
        file_url: `${getFileProxyBase()}/api/school-admin/documents/${String(payload.document.id || '')}/file`,
        processing_status: normalizeProcessingStatus(payload.document.status),
        processing_error_message: payload.document.processing_error_message
          ? String(payload.document.processing_error_message)
          : null,
        quality_status: payload.document.quality_status || null,
        quality_message: payload.document.quality_message || null,
        total_tokens: Number(payload.document.total_tokens || 0),
        chunk_count: Number(payload.document.chunk_count || 0),
        avg_chunk_size: Number(payload.document.avg_chunk_size || 0),
        content_language: String(payload.document.content_language || ''),
        created_at: String(payload.document.created_at || payload.document.createdAt || new Date().toISOString()),
      },
    }
  } catch {
    return { success: false, error: 'Backend unavailable. Start backend and try again.' }
  }
}

export async function updateDocument(_input: UpdateDocumentInput) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: 'Not authenticated' }
  try {
    const response = await fetch(`${getBackendBase()}/v1/documents/${_input.documentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: (_input.title || '').trim(),
        description: _input.description ?? null,
        tags: _input.tags ?? [],
      }),
      cache: 'no-store',
    })
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      return { success: false, error: payload.error || 'Failed to update document' }
    }
    return { success: true }
  } catch {
    return { success: false, error: 'Backend unavailable. Start backend and try again.' }
  }
}

export async function deleteDocument(documentId: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: 'Not authenticated' }
  try {
    const response = await fetch(`${getBackendBase()}/v1/documents/${documentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      return { success: false, error: payload.error || 'Failed to delete document' }
    }
    return { success: true }
  } catch {
    return { success: false, error: 'Backend unavailable. Start backend and try again.' }
  }
}
