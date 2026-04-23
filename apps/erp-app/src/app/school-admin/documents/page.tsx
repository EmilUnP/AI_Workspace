import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { DocumentsClient } from './documents-client'

async function getTeacherInfo() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single()
  
  if (!profile?.organization_id) return null
  
  return { teacherId: profile.id, organizationId: profile.organization_id }
}

// Columns needed for list view only; excludes heavy columns to avoid statement timeouts
const DOCUMENTS_LIST_SELECT =
  'id, title, description, file_name, file_url, file_size, file_type, tags, processing_status, processing_error_message, quality_status, quality_message, total_tokens, chunk_count, avg_chunk_size, content_language, created_at, class_id, organization_id, created_by, is_archived'

function isRetryableSupabaseError(error: unknown): boolean {
  const obj = typeof error === 'object' && error !== null ? (error as { message?: unknown; code?: unknown }) : null
  const msg = obj && 'message' in obj ? String(obj.message) : String(error)
  const code = obj && 'code' in obj ? String(obj.code) : ''
  return (
    code === '57014' ||
    msg.includes('statement timeout') ||
    msg.includes('<!DOCTYPE') ||
    msg.includes('520') ||
    msg.includes('500') ||
    msg.includes('Web server is returning') ||
    msg.includes('Internal server error') ||
    msg.includes('Unexpected end of JSON input')
  )
}

async function getDocuments(teacherId: string, organizationId: string, retried = false) {
  const supabase = await createServerClient()

  const { data: documents, error: documentsError } = await supabase
    .from('documents')
    .select(DOCUMENTS_LIST_SELECT)
    .eq('organization_id', organizationId)
    .eq('created_by', teacherId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (documentsError) {
    if (isRetryableSupabaseError(documentsError) && !retried) {
      console.warn('Supabase temporarily unavailable (e.g. 520/JSON), retrying in 2s...')
      await new Promise((r) => setTimeout(r, 2000))
      return getDocuments(teacherId, organizationId, true)
    }
    const logMsg = isRetryableSupabaseError(documentsError)
      ? 'Supabase temporarily unavailable; documents list may be incomplete.'
      : 'Error fetching documents:'
    console.error(logMsg, retried ? JSON.stringify(documentsError, null, 2) : documentsError)
    return []
  }
  
  if (!documents || documents.length === 0) {
    return []
  }
  
  // Get class info for documents
  const classIds = documents
    .map(doc => doc.class_id)
    .filter((id): id is string => id !== null)
  
  let classesMap: Record<string, { id: string; name: string; class_code?: string | null }> = {}
  if (classIds.length > 0) {
    const { data: classes } = await supabase
      .from('classes')
      .select('id, name, class_code')
      .in('id', classIds)
    
    if (classes) {
      classesMap = classes.reduce((acc, cls) => {
        acc[cls.id] = cls
        return acc
      }, {} as Record<string, { id: string; name: string; class_code?: string | null }>)
    }
  }
  
  return documents.map(doc => ({
    ...doc,
    classes: doc.class_id ? classesMap[doc.class_id] || null : null
  }))
}


export default async function TeacherDocumentsPage() {
  const t = await getTranslations('teacherDocuments')

  const teacherData = await getTeacherInfo()
  
  if (!teacherData) {
    redirect('/auth/login')
  }
  
  const { teacherId, organizationId } = teacherData
  const documents = await getDocuments(teacherId, organizationId)

  const uploadTranslations = {
    dropFileHere: t('uploadDropFileHere'),
    dragDropFile: t('uploadDragDropFile'),
    browseLabel: t('uploadBrowseLabel'),
    browseToUpload: t('uploadBrowseToUpload'),
    uploadFileTypes: t('uploadFileTypes'),
    uploading: t('uploadUploading'),
    uploadSuccess: t('uploadSuccess'),
    uploadFailed: t('uploadFailed'),
    clickToRetry: t('uploadClickToRetry'),
    uploadInvalidType: t('uploadInvalidType'),
    uploadTooLarge: t('uploadTooLarge'),
  }

  const explorerTranslations = {
    noDocumentsYet: t('explorerNoDocumentsYet'),
    noDocumentsDescription: t('explorerNoDocumentsDescription'),
    statsDocuments: t('explorerStatsDocuments'),
    statsTotalSize: t('explorerStatsTotalSize'),
    statsByType: t('explorerStatsByType'),
    statsRagIndex: t('explorerStatsRagIndex'),
    statsTokens: t('explorerStatsTokens'),
    statsChunks: t('explorerStatsChunks'),
    statsStatus: t('explorerStatsStatus'),
    statsMetadata: t('explorerStatsMetadata'),
    statsTagged: t('explorerStatsTagged'),
    statsWithDescription: t('explorerStatsWithDescription'),
    statusReady: t('explorerStatusReady'),
    statusProcessing: t('explorerStatusProcessing'),
    statusFailed: t('explorerStatusFailed'),
    statusPending: t('explorerStatusPending'),
    statusReadyForAi: t('explorerStatusReadyForAi'),
    typePdf: t('explorerTypePdf'),
    typeMarkdown: t('explorerTypeMarkdown'),
    typeText: t('explorerTypeText'),
    typeWord: t('explorerTypeWord'),
    filterByTag: t('explorerFilterByTag'),
    allDocuments: t('explorerAllDocuments'),
    groupByLabel: t('explorerGroupByLabel'),
    groupNone: t('explorerGroupNone'),
    groupType: t('explorerGroupType'),
    groupDate: t('explorerGroupDate'),
    groupClass: t('explorerGroupClass'),
    groupTags: t('explorerGroupTags'),
    sortByLabel: t('explorerSortByLabel'),
    sortName: t('explorerSortName'),
    sortDate: t('explorerSortDate'),
    sortType: t('explorerSortType'),
    sortSize: t('explorerSortSize'),
    sortAscending: t('explorerSortAscending'),
    sortDescending: t('explorerSortDescending'),
    listView: t('explorerListView'),
    gridView: t('explorerGridView'),
    documentsCount: t('explorerDocumentsCount'),
    documentsOfCount: t('explorerDocumentsOfCount'),
    groupNoClass: t('explorerGroupNoClass'),
    groupUntagged: t('explorerGroupUntagged'),
    dateToday: t('explorerDateToday'),
    dateYesterday: t('explorerDateYesterday'),
    dateThisWeek: t('explorerDateThisWeek'),
    dateThisMonth: t('explorerDateThisMonth'),
    noDocumentsWithTag: t('explorerNoDocumentsWithTag'),
    noDocumentsWithTagHint: t('explorerNoDocumentsWithTagHint'),
    clearFilter: t('explorerClearFilter'),
    docInfoQuality: t('explorerDocInfoQuality'),
    docView: t('explorerDocView'),
    docDownload: t('explorerDocDownload'),
    browseToUpload: t('explorerBrowseToUpload', { browse: t('uploadBrowseLabel') }),
    editDocument: t('explorerEditDocument'),
    editTitle: t('explorerEditTitle'),
    editDescription: t('explorerEditDescription'),
    editTags: t('explorerEditTags'),
    editTagsPlaceholder: t('explorerEditTagsPlaceholder'),
    editDeleteDocument: t('explorerEditDeleteDocument'),
    editCancel: t('explorerEditCancel'),
    editSaving: t('explorerEditSaving'),
    editSaveChanges: t('explorerEditSaveChanges'),
    editDeleteTitle: t('explorerEditDeleteTitle'),
    editDeleteConfirm: t('explorerEditDeleteConfirm'),
    editDeleting: t('explorerEditDeleting'),
    qualityDocumentInfo: t('explorerQualityDocumentInfo'),
    qualityDocument: t('explorerQualityDocument'),
    qualityContentLanguage: t('explorerQualityContentLanguage'),
    qualityContentLanguageHint: t('explorerQualityContentLanguageHint'),
    qualityProcessing: t('explorerQualityProcessing'),
    qualityGood: t('explorerQualityGood'),
    qualityGoodDescription: t('explorerQualityGoodDescription'),
    qualityLow: t('explorerQualityLow'),
    qualityLowDescription: t('explorerQualityLowDescription'),
    qualityFailedLimited: t('explorerQualityFailedLimited'),
    qualityFailedDescription: t('explorerQualityFailedDescription'),
    qualityProcessingStatus: t('explorerQualityProcessingStatus'),
    qualityProcessingHint: t('explorerQualityProcessingHint'),
    qualityPendingUnknown: t('explorerQualityPendingUnknown'),
    qualityRagStats: t('explorerQualityRagStats'),
    qualityTokens: t('explorerQualityTokens'),
    qualityChunks: t('explorerQualityChunks'),
    qualityTokensPerChunk: t('explorerQualityTokensPerChunk'),
    dropFileHere: t('uploadDropFileHere'),
    dragDropFile: t('uploadDragDropFile'),
    uploadFileTypes: t('uploadFileTypes'),
    uploading: t('uploadUploading'),
    uploadSuccess: t('uploadSuccess'),
    uploadFailed: t('uploadFailed'),
    clickToRetry: t('uploadClickToRetry'),
    uploadInvalidType: t('uploadInvalidType'),
    uploadTooLarge: t('uploadTooLarge'),
  }

  return (
    <div className="min-h-[60vh]">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/school-admin"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t('breadcrumb')}</span>
        </Link>
      </div>

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('title')}</h1>
            <p className="mt-0.5 text-gray-500">
              {t('subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Upload + Explorer */}
      <DocumentsClient
        organizationId={organizationId}
        initialDocuments={documents}
        uploadTranslations={uploadTranslations}
        explorerTranslations={explorerTranslations}
      />
    </div>
  )
}

