'use client'

import { useState, useEffect } from 'react'
import { FileText, File, FileCode, Download, Eye, FolderOpen, Info } from 'lucide-react'
import { EditDocumentDialog } from './edit-document-dialog'
import { DocumentQualityModal } from './document-quality-modal'

interface Document {
  id: string
  title: string
  description?: string | null
  file_name: string
  file_url: string
  file_size: number
  file_type: 'pdf' | 'markdown' | 'text' | 'doc' | 'docx'
  tags?: string[] | null
  processing_status?: string | null
  processing_error_message?: string | null
  quality_status?: string | null
  quality_message?: string | null
  total_tokens?: number | null
  chunk_count?: number | null
  avg_chunk_size?: number | null
  created_at: string
  classes?: { id: string; name: string; class_code?: string | null } | null
}

interface DocumentsListProps {
  initialDocuments: Document[]
  onUpdate: (input: {
    documentId: string
    title: string
    description?: string | null
    tags?: string[] | null
  }) => Promise<{ error?: string; success?: boolean; data?: any }>
  onDelete: (documentId: string) => Promise<{ error?: string; success?: boolean }>
}

function getFileIcon(fileType: string) {
  switch (fileType) {
    case 'pdf':
      return <FileText className="h-5 w-5 text-red-500" />
    case 'markdown':
      return <FileCode className="h-5 w-5 text-blue-500" />
    case 'text':
      return <File className="h-5 w-5 text-gray-500" />
    default:
      return <File className="h-5 w-5 text-gray-500" />
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Document status for info icon: ok (green), issues (yellow), critical (red) */
type DocumentStatusLevel = 'ok' | 'issues' | 'critical'

function getDocumentStatusLevel(doc: Document): DocumentStatusLevel {
  if (doc.processing_status === 'failed') return 'critical'
  const q = (doc.quality_status ?? '').toLowerCase()
  if (['failed', 'error', 'critical'].some((s) => q.includes(s))) return 'critical'
  if (doc.processing_status === 'processing') return 'issues'
  if (['warning', 'degraded', 'low'].some((s) => q.includes(s))) return 'issues'
  if (doc.quality_message && !q) return 'issues'
  return 'ok'
}

function getInfoButtonClasses(status: DocumentStatusLevel): string {
  const base = 'p-1.5 rounded transition-colors'
  switch (status) {
    case 'critical':
      return `${base} text-red-500 hover:text-red-600 hover:bg-red-50`
    case 'issues':
      return `${base} text-amber-500 hover:text-amber-600 hover:bg-amber-50`
    case 'ok':
    default:
      return `${base} text-green-600 hover:text-green-700 hover:bg-green-50`
  }
}

export function DocumentsList({ initialDocuments, onUpdate, onDelete }: DocumentsListProps) {
  const { documents } = useDocumentsList(initialDocuments)
  const [qualityModalDocument, setQualityModalDocument] = useState<Document | null>(null)

  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <FolderOpen className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No documents yet</h3>
        <p className="mt-2 text-sm text-gray-500">
          Drag and drop a file above to upload your first document
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Table Header */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
        <div className="col-span-4">Name</div>
        <div className="col-span-1">Type</div>
        <div className="col-span-1">Size</div>
        <div className="col-span-2">RAG Stats</div>
        <div className="col-span-2">Date</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      {/* Document Rows */}
      <div className="divide-y divide-gray-100">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="group grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 px-4 py-3 hover:bg-gray-50 transition-colors items-center"
          >
            {/* Name Column */}
            <div className="lg:col-span-4 flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors">
                {getFileIcon(doc.file_type)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-gray-900 truncate" title={doc.title}>
                  {doc.title}
                </h3>
                {doc.description && (
                  <p className="text-sm text-gray-500 truncate" title={doc.description}>
                    {doc.description}
                  </p>
                )}
                {/* Tags - shown inline on mobile */}
                {doc.tags && doc.tags.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {doc.tags.slice(0, 2).map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500"
                      >
                        #{tag}
                      </span>
                    ))}
                    {doc.tags.length > 2 && (
                      <span className="text-xs text-gray-400">+{doc.tags.length - 2}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Type Column */}
            <div className="lg:col-span-1 flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 uppercase">
                {doc.file_type}
              </span>
            </div>

            {/* Size Column */}
            <div className="lg:col-span-1 text-sm text-gray-500">
              {formatFileSize(doc.file_size)}
            </div>

            {/* RAG Stats Column */}
            <div className="lg:col-span-2">
              {doc.processing_status === 'completed' && doc.total_tokens ? (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-50 border border-green-200">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <span className="text-xs font-semibold text-green-700">Ready</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="text-gray-500 font-medium">Tokens</span>
                      <span className="text-gray-900 font-semibold text-sm">{doc.total_tokens.toLocaleString()}</span>
                    </div>
                    {doc.chunk_count && doc.chunk_count > 0 && (
                      <div className="flex flex-col">
                        <span className="text-gray-500 font-medium">Chunks</span>
                        <span className="text-gray-900 font-semibold text-sm">{doc.chunk_count}</span>
                      </div>
                    )}
                  </div>
                  {doc.avg_chunk_size && doc.avg_chunk_size > 0 && (
                    <div className="text-xs text-gray-500">
                      ~{Math.round(doc.avg_chunk_size / 4).toLocaleString()} tokens/chunk
                    </div>
                  )}
                </div>
              ) : doc.processing_status === 'processing' ? (
                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-blue-50 border border-blue-200">
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="text-xs font-medium text-blue-700">Processing...</span>
                </div>
              ) : doc.processing_status === 'failed' ? (
                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-red-50 border border-red-200">
                  <div className="h-2 w-2 rounded-full bg-red-500"></div>
                  <span className="text-xs font-medium text-red-700">Failed</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-gray-50 border border-gray-200">
                  <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                  <span className="text-xs font-medium text-gray-600">Pending</span>
                </div>
              )}
            </div>

            {/* Date Column */}
            <div className="lg:col-span-2 text-sm text-gray-500">
              {formatDate(doc.created_at)}
            </div>

            {/* Actions Column */}
            <div className="lg:col-span-2 flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => setQualityModalDocument(doc)}
                className={getInfoButtonClasses(getDocumentStatusLevel(doc))}
                title="Document info & quality"
              >
                <Info className="h-4 w-4" />
              </button>
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50 transition-colors"
                title="View"
              >
                <Eye className="h-4 w-4" />
              </a>
              <a
                href={doc.file_url}
                download={doc.file_name}
                className="text-gray-400 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50 transition-colors"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </a>
              <EditDocumentDialog 
                document={doc} 
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            </div>
          </div>
        ))}
      </div>

      {qualityModalDocument && (
        <DocumentQualityModal
          document={qualityModalDocument}
          onClose={() => setQualityModalDocument(null)}
        />
      )}
    </div>
  )
}

// Hook to manage documents list with add functionality
export function useDocumentsList(initialDocuments: Document[]) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)

  useEffect(() => {
    setDocuments(initialDocuments)
  }, [initialDocuments])

  const addDocument = (newDocument: Document) => {
    setDocuments(prev => {
      // Check if document already exists (from server refresh)
      if (prev.some(doc => doc.id === newDocument.id)) {
        return prev
      }
      // Add new document at the beginning
      return [newDocument, ...prev]
    })
  }

  return { documents, addDocument }
}

