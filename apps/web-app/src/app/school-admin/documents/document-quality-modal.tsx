'use client'

import { X } from 'lucide-react'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentQualityModal({
  document,
  onClose,
}: {
  document: {
    title: string
    file_type: string
    file_size: number
    processing_status?: string | null
    quality_status?: string | null
    quality_message?: string | null
    total_tokens?: number | null
    chunk_count?: number | null
    avg_chunk_size?: number | null
    content_language?: string | null
  }
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Document info & quality</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2 px-4 py-4 text-sm text-gray-700">
          <p><span className="font-medium">Document:</span> {document.title}</p>
          <p><span className="font-medium">Type:</span> {document.file_type.toUpperCase()}</p>
          <p><span className="font-medium">Size:</span> {formatFileSize(document.file_size)}</p>
          <p><span className="font-medium">Status:</span> {document.processing_status || 'pending'}</p>
          <p><span className="font-medium">Quality:</span> {document.quality_status || 'unknown'}</p>
          {document.quality_message ? <p><span className="font-medium">Quality note:</span> {document.quality_message}</p> : null}
          {document.content_language ? <p><span className="font-medium">Language:</span> {document.content_language}</p> : null}
          {document.total_tokens != null ? <p><span className="font-medium">Tokens:</span> {document.total_tokens}</p> : null}
          {document.chunk_count != null ? <p><span className="font-medium">Chunks:</span> {document.chunk_count}</p> : null}
          {document.avg_chunk_size != null ? <p><span className="font-medium">Avg chunk size:</span> {document.avg_chunk_size}</p> : null}
        </div>
      </div>
    </div>
  )
}

