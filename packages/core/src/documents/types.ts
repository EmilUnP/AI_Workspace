export interface QuickUploadInput {
  organizationId: string
  file: File
}

export interface UpdateDocumentInput {
  documentId: string
  title: string
  description?: string | null
  tags?: string[] | null
}
