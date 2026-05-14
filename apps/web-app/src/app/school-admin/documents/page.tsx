import { getAccessToken, getCurrentUser } from '@/lib/backend-auth'
import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'
import { redirect } from 'next/navigation'
import { DocumentsClient } from './documents-client'
import { getTranslations } from 'next-intl/server'

type DocumentFileType = 'pdf' | 'markdown' | 'text' | 'doc' | 'docx'

function normalizeFileType(value: unknown): DocumentFileType {
  const raw = String(value || '').toLowerCase()
  if (raw.includes('pdf')) return 'pdf'
  if (raw.includes('markdown') || raw.includes('md')) return 'markdown'
  if (raw.includes('docx')) return 'docx'
  if (raw.includes('msword') || raw === 'doc') return 'doc'
  return 'text'
}

function normalizeProcessingStatus(value: unknown): 'pending' | 'processing' | 'completed' | 'failed' {
  const raw = String(value || '').toLowerCase().trim()
  if (raw === 'ready' || raw === 'completed') return 'completed'
  if (raw === 'failed' || raw === 'error') return 'failed'
  if (raw === 'processing' || raw === 'uploaded') return 'processing'
  return 'pending'
}

async function getDocuments() {
  const accessToken = await getAccessToken()
  if (!accessToken) return []

  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'
  try {
    const response = await fetch(`${backendBase}/v1/documents`, {
      headers: webAppBackendAuthHeaders(accessToken),
      cache: 'no-store',
    })
    if (!response.ok) return []
    const payload = (await response.json()) as { items?: Array<Record<string, unknown>> }
    const items = payload.items || []

    return items.map((doc) => {
      const docId = String(doc.id || '')
      return {
        id: docId,
        title: String(doc.title || ''),
        description: String((doc.metadata as Record<string, unknown> | undefined)?.description || ''),
        file_name: String(doc.file_name || doc.fileName || ''),
        file_url: `/api/school-admin/documents/${docId}/file`,
        file_size: Number(doc.file_size || doc.fileSize || 0),
        file_type: normalizeFileType(doc.file_type || doc.fileType),
        tags: ((doc.metadata as Record<string, unknown> | undefined)?.tags as string[] | undefined) || [],
        processing_status: normalizeProcessingStatus(doc.status),
        processing_error_message: doc.processing_error_message
          ? String(doc.processing_error_message)
          : null,
        quality_status: String(doc.quality_status || ''),
        quality_message: String(doc.quality_message || ''),
        total_tokens: Number(doc.total_tokens || 0),
        chunk_count: Number(doc.chunk_count || 0),
        avg_chunk_size: Number(doc.avg_chunk_size || 0),
        content_language: String(doc.content_language || ''),
        created_at: String(doc.created_at || doc.createdAt || new Date().toISOString()),
      }
    })
  } catch {
    return []
  }
}


export default async function SchoolAdminDocumentsPage() {
  const t = await getTranslations('schoolAdmin')
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/login')
  }
  if (user.role !== 'admin' && user.role !== 'operator') {
    redirect('/app')
  }

  const documents = await getDocuments()

  const uploadTranslations = {
    dropFileHere: t('dropFileHere'),
    dragDropFile: t('dragDropFile'),
    uploadOr: t('uploadOr'),
    browseLabel: t('browseLabel'),
    browseToUpload: t('browseToUpload'),
    uploadFileTypes: t('uploadFileTypes'),
    uploading: t('uploading'),
    uploadSuccess: t('uploadSuccess'),
    uploadFailed: t('uploadFailed'),
    clickToRetry: t('clickToRetry'),
    uploadInvalidType: t('uploadInvalidType'),
    uploadTooLarge: t('uploadTooLarge'),
  }
  const explorerTranslations = {
    allDocuments: t('allDocuments'),
    noDocumentsYet: t('noDocumentsYet'),
    noDocumentsHint: t('noDocumentsHint'),
    groupBy: t('groupBy'),
    groupNone: t('groupNone'),
    groupDate: t('groupDate'),
    sortBy: t('sortBy'),
    sortName: t('sortName'),
    sortDate: t('sortDate'),
    sortType: t('sortType'),
    sortSize: t('sortSize'),
    statusReady: t('statusReady'),
    statusProcessing: t('statusProcessing'),
    statusFailed: t('statusFailed'),
    statusPending: t('statusPending'),
    documentInfoQuality: t('documentInfoQuality'),
    view: t('view'),
    qualityDocumentInfo: t('qualityDocumentInfo'),
    qualityDocument: t('qualityDocument'),
    qualityContentLanguage: t('qualityContentLanguage'),
    qualityContentLanguageHint: t('qualityContentLanguageHint'),
    qualityProcessing: t('qualityProcessing'),
    qualityGood: t('qualityGood'),
    qualityGoodDescription: t('qualityGoodDescription'),
    qualityLow: t('qualityLow'),
    qualityLowDescription: t('qualityLowDescription'),
    qualityFailedLimited: t('qualityFailedLimited'),
    qualityFailedDescription: t('qualityFailedDescription'),
    qualityProcessingStatus: t('qualityProcessingStatus'),
    qualityProcessingHint: t('qualityProcessingHint'),
    qualityPendingUnknown: t('qualityPendingUnknown'),
    qualityRagStats: t('qualityRagStats'),
    qualityTokens: t('qualityTokens'),
    qualityChunks: t('qualityChunks'),
    qualityTokensPerChunk: t('qualityTokensPerChunk'),
    editDocument: t('editDocument'),
    editTitle: t('editTitle'),
    editDescription: t('editDescription'),
    editDeleteDocument: t('editDeleteDocument'),
    editCancel: t('editCancel'),
    editSaving: t('editSaving'),
    editSaveChanges: t('editSaveChanges'),
    editDeleteTitle: t('editDeleteTitle'),
    editDeleteConfirm: t('editDeleteConfirm'),
    editDeleting: t('editDeleting'),
  }

  return (
    <div className="min-h-[60vh]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('documentsTitle')}</h1>
      </div>

      {/* Upload + Explorer */}
      <DocumentsClient
        workspaceId="global"
        initialDocuments={documents}
        uploadTranslations={uploadTranslations}
        explorerTranslations={explorerTranslations}
      />
    </div>
  )
}

