'use client'

import { useEffect, useState } from 'react'

export type DocItem = {
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
}

export function useDocumentsList(initialDocuments: DocItem[]) {
  const [documents, setDocuments] = useState<DocItem[]>(initialDocuments)

  useEffect(() => {
    setDocuments(initialDocuments)
  }, [initialDocuments])

  const addDocument = (newDocument: DocItem) => {
    setDocuments((prev) => (prev.some((d) => d.id === newDocument.id) ? prev : [newDocument, ...prev]))
  }

  return { documents, addDocument }
}

