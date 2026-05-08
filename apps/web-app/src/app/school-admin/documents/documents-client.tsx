'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DocumentUploadZone } from './document-upload-zone'
import { DocumentsExplorer } from './documents-explorer'
import { useDocumentsList } from './documents-list-state'
import { quickUploadDocument, updateDocument, deleteDocument } from '@/app/school-admin/documents/actions'

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
  content_language?: string | null
  created_at: string
  classes?: { id: string; name: string; class_code?: string | null } | null
}

interface DocumentsClientProps {
  workspaceId: string
  initialDocuments: Document[]
  uploadTranslations?: Record<string, string>
  explorerTranslations?: Record<string, string>
}

export function DocumentsClient({ workspaceId, initialDocuments, uploadTranslations, explorerTranslations }: DocumentsClientProps) {
  void explorerTranslations
  const router = useRouter()
  const { documents, addDocument } = useDocumentsList(initialDocuments)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const handleUploadSuccess = (uploadedDocument: Record<string, unknown>) => {
    if (
      typeof uploadedDocument.id !== 'string' ||
      typeof uploadedDocument.title !== 'string' ||
      typeof uploadedDocument.file_name !== 'string' ||
      typeof uploadedDocument.file_url !== 'string' ||
      typeof uploadedDocument.file_size !== 'number' ||
      typeof uploadedDocument.file_type !== 'string' ||
      typeof uploadedDocument.created_at !== 'string'
    ) {
      return
    }

    // Add document optimistically to the list immediately
    addDocument({
      ...uploadedDocument,
      id: uploadedDocument.id,
      title: uploadedDocument.title,
      file_name: uploadedDocument.file_name,
      file_url: uploadedDocument.file_url,
      file_size: uploadedDocument.file_size,
      file_type: uploadedDocument.file_type as Document['file_type'],
      created_at: uploadedDocument.created_at,
    } as Document)
    // Router refresh is already called in DocumentUploadZone
    // This will update the list when server data comes back
  }

  // Poll for document status updates when documents are processing
  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    const hasProcessingDocuments = documents.some(
      (doc) => {
        const status = String(doc.processing_status || '').toLowerCase()
        return status === '' || status === 'pending' || status === 'uploaded' || status === 'processing'
      }
    )

    if (hasProcessingDocuments) {
      // Start polling every 3 seconds
      pollingIntervalRef.current = setInterval(() => {
        router.refresh()
      }, 3000)
    }

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [documents, router])

  return (
    <div className="space-y-8">
      {/* Upload Zone */}
      <DocumentUploadZone
        workspaceId={workspaceId}
        onUpload={quickUploadDocument}
        onUploadSuccess={handleUploadSuccess}
        translations={uploadTranslations}
      />

      {/* Documents Explorer */}
      <DocumentsExplorer
        documents={documents}
        onUpdate={updateDocument}
        onDelete={deleteDocument}
        translations={explorerTranslations}
      />
    </div>
  )
}
