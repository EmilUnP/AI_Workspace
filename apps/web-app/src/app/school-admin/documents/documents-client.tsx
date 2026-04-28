'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  DocumentUploadZone,
  DocumentsExplorer,
  useDocumentsList,
  type DocumentUploadTranslations,
  type DocumentsExplorerTranslations,
} from '@eduator/ui'
import { quickUploadDocument, updateDocument, deleteDocument } from './actions'

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
  uploadTranslations?: Partial<DocumentUploadTranslations>
  explorerTranslations?: Partial<DocumentsExplorerTranslations>
}

export function DocumentsClient({ workspaceId, initialDocuments, uploadTranslations, explorerTranslations }: DocumentsClientProps) {
  const router = useRouter()
  const { documents, addDocument } = useDocumentsList(initialDocuments)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const handleUploadSuccess = (uploadedDocument: Document) => {
    // Add document optimistically to the list immediately
    addDocument(uploadedDocument)
    // Router refresh is already called in DocumentUploadZone
    // This will update the list when server data comes back
  }

  // Poll for document status updates when documents are processing
  useEffect(() => {
    const hasProcessingDocuments = documents.some(
      doc => doc.processing_status === 'processing' || doc.processing_status === null
    )

    if (hasProcessingDocuments) {
      // Start polling every 3 seconds
      pollingIntervalRef.current = setInterval(() => {
        router.refresh()
      }, 3000)
    } else {
      // Stop polling if no documents are processing
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
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
        organizationId={workspaceId}
        onUpload={quickUploadDocument}
        onUploadSuccess={handleUploadSuccess}
        translations={uploadTranslations}
      />

      {/* Documents Explorer (file-explorer style with grouping & sorting) */}
      <DocumentsExplorer
        initialDocuments={documents}
        onUpdate={updateDocument}
        onDelete={deleteDocument}
        translations={explorerTranslations}
      />
    </div>
  )
}
