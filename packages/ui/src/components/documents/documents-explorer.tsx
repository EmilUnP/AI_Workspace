'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  FileText,
  File,
  FileCode,
  Download,
  Eye,
  Info,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowDownAZ,
  Folder,
  LayoutGrid,
  List,
  HardDrive,
  CheckCircle2,
  Loader2,
  XCircle,
  Clock,
  Tag,
  Globe,
} from 'lucide-react'
import { EditDocumentDialog } from './edit-document-dialog'
import { DocumentQualityModal } from './document-quality-modal'
import { useDocumentsList } from './documents-list'

export interface DocumentExplorerItem {
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

export interface DocumentsExplorerTranslations {
  // Empty state
  noDocumentsYet: string
  noDocumentsDescription: string
  // Stats
  statsDocuments: string
  statsTotalSize: string
  statsByType: string
  statsRagIndex: string
  statsTokens: string
  statsChunks: string
  statsStatus: string
  statsMetadata: string
  statsTagged: string
  statsWithDescription: string
  // Status labels
  statusReady: string
  statusProcessing: string
  statusFailed: string
  statusPending: string
  statusReadyForAi: string
  // Type labels
  typePdf: string
  typeMarkdown: string
  typeText: string
  typeWord: string
  // Toolbar
  filterByTag: string
  allDocuments: string
  groupByLabel: string
  groupNone: string
  groupType: string
  groupDate: string
  groupClass: string
  groupTags: string
  sortByLabel: string
  sortName: string
  sortDate: string
  sortType: string
  sortSize: string
  sortAscending: string
  sortDescending: string
  listView: string
  gridView: string
  // Toolbar count
  documentsCount: string
  documentsOfCount: string
  // Group labels
  groupNoClass: string
  groupUntagged: string
  // Date labels
  dateToday: string
  dateYesterday: string
  dateThisWeek: string
  dateThisMonth: string
  // Empty filter
  noDocumentsWithTag: string
  noDocumentsWithTagHint: string
  clearFilter: string
  // Document row
  docInfoQuality: string
  docView: string
  docDownload: string
  // Upload zone
  dropFileHere: string
  dragDropFile: string
  browseToUpload: string
  uploadFileTypes: string
  uploading: string
  uploadSuccess: string
  uploadFailed: string
  clickToRetry: string
  uploadInvalidType: string
  uploadTooLarge: string
  // Edit dialog
  editDocument: string
  editTitle: string
  editDescription: string
  editTags: string
  editTagsPlaceholder: string
  editDeleteDocument: string
  editCancel: string
  editSaving: string
  editSaveChanges: string
  editDeleteTitle: string
  editDeleteConfirm: string
  editDeleting: string
  // Quality modal
  qualityDocumentInfo: string
  qualityDocument: string
  qualityContentLanguage: string
  qualityContentLanguageHint: string
  qualityProcessing: string
  qualityGood: string
  qualityGoodDescription: string
  qualityLow: string
  qualityLowDescription: string
  qualityFailedLimited: string
  qualityFailedDescription: string
  qualityProcessingStatus: string
  qualityProcessingHint: string
  qualityPendingUnknown: string
  qualityRagStats: string
  qualityTokens: string
  qualityChunks: string
  qualityTokensPerChunk: string
}

export const DEFAULT_DOCUMENTS_TRANSLATIONS: DocumentsExplorerTranslations = {
  noDocumentsYet: 'No documents yet',
  noDocumentsDescription: 'Drag and drop a file above to upload your first document',
  statsDocuments: 'Documents',
  statsTotalSize: 'Total size',
  statsByType: 'By type',
  statsRagIndex: 'RAG index',
  statsTokens: 'tokens',
  statsChunks: 'chunks',
  statsStatus: 'Status',
  statsMetadata: 'Metadata',
  statsTagged: 'Tagged',
  statsWithDescription: 'With description',
  statusReady: 'Ready',
  statusProcessing: 'Processing',
  statusFailed: 'Failed',
  statusPending: 'Pending',
  statusReadyForAi: 'Ready for AI',
  typePdf: 'PDF',
  typeMarkdown: 'Markdown',
  typeText: 'Text',
  typeWord: 'Word',
  filterByTag: 'Filter by tag',
  allDocuments: 'All documents',
  groupByLabel: 'Group by',
  groupNone: 'None',
  groupType: 'Type',
  groupDate: 'Date',
  groupClass: 'Class',
  groupTags: 'Tags',
  sortByLabel: 'Sort by',
  sortName: 'Name',
  sortDate: 'Date',
  sortType: 'Type',
  sortSize: 'Size',
  sortAscending: 'Ascending',
  sortDescending: 'Descending',
  listView: 'List view',
  gridView: 'Grid view',
  documentsCount: 'document',
  documentsOfCount: 'of',
  groupNoClass: 'No class',
  groupUntagged: 'Untagged',
  dateToday: 'Today',
  dateYesterday: 'Yesterday',
  dateThisWeek: 'This week',
  dateThisMonth: 'This month',
  noDocumentsWithTag: 'No documents with tag',
  noDocumentsWithTagHint: 'Try another tag or clear the filter above.',
  clearFilter: 'Clear filter',
  docInfoQuality: 'Document info & quality',
  docView: 'View',
  docDownload: 'Download',
  dropFileHere: 'Drop file here',
  dragDropFile: 'Drag & drop a file here',
  browseToUpload: 'or {browse} to upload',
  uploadFileTypes: 'PDF, Word (.doc, .docx), Markdown, or Text up to 15MB',
  uploading: 'Uploading...',
  uploadSuccess: 'Upload successful!',
  uploadFailed: 'Upload failed',
  clickToRetry: 'Click to try again',
  uploadInvalidType: 'Please upload a PDF, Word (.doc, .docx), Markdown (.md), or Text (.txt) file',
  uploadTooLarge: 'File size must be 15MB or less',
  editDocument: 'Edit Document',
  editTitle: 'Title',
  editDescription: 'Description',
  editTags: 'Tags',
  editTagsPlaceholder: 'Comma-separated tags',
  editDeleteDocument: 'Delete Document',
  editCancel: 'Cancel',
  editSaving: 'Saving...',
  editSaveChanges: 'Save Changes',
  editDeleteTitle: 'Delete Document',
  editDeleteConfirm: 'Are you sure you want to delete "#TITLE#"? This action cannot be undone and the file will be permanently removed.',
  editDeleting: 'Deleting...',
  qualityDocumentInfo: 'Document info',
  qualityDocument: 'Document',
  qualityContentLanguage: 'Content language',
  qualityContentLanguageHint: 'Detected automatically. Used for cross-language RAG query translation.',
  qualityProcessing: 'Quality & processing',
  qualityGood: 'Good',
  qualityGoodDescription: 'Text was extracted and chunked successfully. This document is suitable for exams and lessons.',
  qualityLow: 'Low quality',
  qualityLowDescription: 'AI-generated content may be less accurate. Prefer documents with selectable text and fewer images.',
  qualityFailedLimited: 'Failed / limited',
  qualityFailedDescription: 'This document may not be used reliably for generating exams or lessons. Try re-uploading a PDF with selectable text.',
  qualityProcessingStatus: 'Processing…',
  qualityProcessingHint: 'Quality will be available shortly.',
  qualityPendingUnknown: 'Pending or unknown.',
  qualityRagStats: 'RAG stats',
  qualityTokens: 'Tokens',
  qualityChunks: 'Chunks',
  qualityTokensPerChunk: '~Tokens/chunk',
}

export interface DocumentsExplorerProps {
  initialDocuments: DocumentExplorerItem[]
  onUpdate: (input: {
    documentId: string
    title: string
    description?: string | null
    tags?: string[] | null
  }) => Promise<{ error?: string; success?: boolean; data?: any }>
  onDelete: (documentId: string) => Promise<{ error?: string; success?: boolean }>
  translations?: Partial<DocumentsExplorerTranslations>
}

type GroupBy = 'none' | 'type' | 'date' | 'class' | 'tags'
type SortBy = 'name' | 'date' | 'type' | 'size'
type SortDir = 'asc' | 'desc'
type ViewMode = 'list' | 'grid'

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

interface DocumentStats {
  totalCount: number
  totalSizeBytes: number
  byType: { pdf: number; markdown: number; text: number; doc: number; docx: number }
  byTypeSize: { pdf: number; markdown: number; text: number; doc: number; docx: number }
  ready: number
  processing: number
  failed: number
  pending: number
  totalTokens: number
  totalChunks: number
  taggedCount: number
  withDescriptionCount: number
  uniqueTags: string[]
}

function computeDocumentStats(docs: DocumentExplorerItem[]): DocumentStats {
  let totalSizeBytes = 0
  const byType = { pdf: 0, markdown: 0, text: 0, doc: 0, docx: 0 }
  const byTypeSize = { pdf: 0, markdown: 0, text: 0, doc: 0, docx: 0 }
  let ready = 0
  let processing = 0
  let failed = 0
  let pending = 0
  let totalTokens = 0
  let totalChunks = 0
  let taggedCount = 0
  let withDescriptionCount = 0
  const tagSet = new Set<string>()

  for (const doc of docs) {
    totalSizeBytes += doc.file_size ?? 0
    const t = (doc.file_type || 'text').toLowerCase()
    if (t === 'pdf') {
      byType.pdf += 1
      byTypeSize.pdf += doc.file_size ?? 0
    } else if (t === 'markdown') {
      byType.markdown += 1
      byTypeSize.markdown += doc.file_size ?? 0
    } else if (t === 'doc') {
      byType.doc += 1
      byTypeSize.doc += doc.file_size ?? 0
    } else if (t === 'docx') {
      byType.docx += 1
      byTypeSize.docx += doc.file_size ?? 0
    } else {
      byType.text += 1
      byTypeSize.text += doc.file_size ?? 0
    }

    const status = doc.processing_status ?? null
    if (status === 'completed') ready += 1
    else if (status === 'processing') processing += 1
    else if (status === 'failed') failed += 1
    else pending += 1

    if (doc.total_tokens) totalTokens += doc.total_tokens
    if (doc.chunk_count) totalChunks += doc.chunk_count

    if (doc.tags && doc.tags.length > 0) {
      taggedCount += 1
      doc.tags.forEach((tag) => tagSet.add(tag.trim()))
    }
    if (doc.description && String(doc.description).trim().length > 0) {
      withDescriptionCount += 1
    }
  }

  return {
    totalCount: docs.length,
    totalSizeBytes,
    byType,
    byTypeSize,
    ready,
    processing,
    failed,
    pending,
    totalTokens,
    totalChunks,
    taggedCount,
    withDescriptionCount,
    uniqueTags: Array.from(tagSet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
  }
}

function createFormatDate(t: DocumentsExplorerTranslations) {
  return function formatDate(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return t.dateToday
    if (diffDays === 1) return t.dateYesterday
    if (diffDays < 7) return t.dateThisWeek
    if (diffDays < 30) return t.dateThisMonth
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }
}

function createGetDateGroupKey(t: DocumentsExplorerTranslations) {
  return function getDateGroupKey(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return t.dateToday
    if (diffDays === 1) return t.dateYesterday
    if (diffDays < 7) return t.dateThisWeek
    if (diffDays < 30) return t.dateThisMonth
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }
}

type DocumentStatusLevel = 'ok' | 'issues' | 'critical'

function getDocumentStatusLevel(doc: DocumentExplorerItem): DocumentStatusLevel {
  if (doc.processing_status === 'failed') return 'critical'
  const q = (doc.quality_status ?? '').toLowerCase()
  if (['failed', 'error', 'critical'].some((s) => q.includes(s))) return 'critical'
  if (doc.processing_status === 'processing') return 'issues'
  if (['warning', 'degraded', 'low'].some((s) => q.includes(s))) return 'issues'
  if (doc.quality_message && !q) return 'issues'
  return 'ok'
}

function getStatusPillClasses(status: DocumentStatusLevel): string {
  switch (status) {
    case 'critical':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'issues':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    default:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  }
}

function getInfoButtonClasses(status: DocumentStatusLevel): string {
  const base = 'p-1.5 rounded-md transition-colors'
  switch (status) {
    case 'critical':
      return `${base} text-red-500 hover:text-red-600 hover:bg-red-50`
    case 'issues':
      return `${base} text-amber-500 hover:text-amber-600 hover:bg-amber-50`
    default:
      return `${base} text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50`
  }
}

function createGroupOrder(t: DocumentsExplorerTranslations): Record<string, number> {
  return {
    [t.dateToday]: 0,
    [t.dateYesterday]: 1,
    [t.dateThisWeek]: 2,
    [t.dateThisMonth]: 3,
    pdf: 0,
    markdown: 1,
    text: 2,
  }
}

function sortDocuments(
  docs: DocumentExplorerItem[],
  sortBy: SortBy,
  dir: SortDir
): DocumentExplorerItem[] {
  const sorted = [...docs].sort((a, b) => {
    let cmp = 0
    switch (sortBy) {
      case 'name':
        cmp = (a.title || a.file_name).localeCompare(b.title || b.file_name, undefined, { sensitivity: 'base' })
        break
      case 'date':
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        break
      case 'type':
        cmp = (a.file_type || '').localeCompare(b.file_type || '')
        break
      case 'size':
        cmp = (a.file_size || 0) - (b.file_size || 0)
        break
      default:
        cmp = 0
    }
    return dir === 'asc' ? cmp : -cmp
  })
  return sorted
}

function groupDocuments(
  docs: DocumentExplorerItem[],
  groupBy: GroupBy,
  t: DocumentsExplorerTranslations,
  getDateGroupKey: (d: string) => string
): { key: string; label: string; documents: DocumentExplorerItem[] }[] {
  if (groupBy === 'none') {
    return [{ key: '_', label: t.allDocuments, documents: docs }]
  }
  const map = new Map<string, DocumentExplorerItem[]>()
  for (const doc of docs) {
    let key: string
    if (groupBy === 'type') {
      key = doc.file_type || 'other'
    } else if (groupBy === 'date') {
      key = getDateGroupKey(doc.created_at)
    } else if (groupBy === 'class') {
      key = doc.classes?.id ?? '_none'
    } else if (groupBy === 'tags') {
      const tags = doc.tags?.filter((tg) => String(tg).trim()).map((tg) => String(tg).trim()) ?? []
      key = tags.length > 0 ? tags.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))[0]! : '_untagged'
    } else {
      key = '_'
    }
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(doc)
  }
  const GROUP_ORDER = createGroupOrder(t)
  const entries = Array.from(map.entries()).map(([key, documents]) => {
    let label: string
    if (groupBy === 'date') label = key
    else if (groupBy === 'class') label = key === '_none' ? t.groupNoClass : (documents[0]?.classes?.name ?? key)
    else if (groupBy === 'tags') label = key === '_untagged' ? t.groupUntagged : `#${key}`
    else label = key.charAt(0).toUpperCase() + key.slice(1)
    return { key, label, documents }
  })
  if (groupBy === 'date') {
    entries.sort((a, b) => (GROUP_ORDER[a.key] ?? 99) - (GROUP_ORDER[b.key] ?? 99))
  }
  if (groupBy === 'type') {
    entries.sort((a, b) => (GROUP_ORDER[a.key] ?? 99) - (GROUP_ORDER[b.key] ?? 99))
  }
  if (groupBy === 'tags') {
    entries.sort((a, b) => (a.key === '_untagged' ? 1 : b.key === '_untagged' ? -1 : a.key.localeCompare(b.key)))
  }
  return entries
}

export function DocumentsExplorer({
  initialDocuments,
  onUpdate,
  onDelete,
  translations,
}: DocumentsExplorerProps) {
  const t: DocumentsExplorerTranslations = { ...DEFAULT_DOCUMENTS_TRANSLATIONS, ...translations }
  const { documents } = useDocumentsList(initialDocuments)
  const [groupBy, setGroupBy] = useState<GroupBy>('type')
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [qualityModalDocument, setQualityModalDocument] = useState<DocumentExplorerItem | null>(null)

  const formatDate = useMemo(() => createFormatDate(t), [t])
  const getDateGroupKey = useMemo(() => createGetDateGroupKey(t), [t])

  const filteredDocuments = useMemo(() => {
    if (!tagFilter) return documents
    return documents.filter((d) => d.tags?.some((tg) => String(tg).trim() === tagFilter))
  }, [documents, tagFilter])

  const sorted = useMemo(
    () => sortDocuments(filteredDocuments, sortBy, sortDir),
    [filteredDocuments, sortBy, sortDir]
  )
  const grouped = useMemo(
    () => groupDocuments(sorted, groupBy, t, getDateGroupKey),
    [sorted, groupBy, t, getDateGroupKey]
  )

  const stats = useMemo(() => computeDocumentStats(documents), [documents])

  // When switching group-by, expand all groups. Don't run when documents/grouped change (e.g. polling).
  useEffect(() => {
    if (groupBy !== 'none') {
      setExpandedGroups(new Set(grouped.map((g) => g.key)))
    } else {
      setExpandedGroups(new Set())
    }
  }, [groupBy]) // eslint-disable-line react-hooks/exhaustive-deps -- intentional: only when groupBy changes

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleSortDir = () => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))

  if (documents.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200/80 bg-white p-16 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
          <FolderOpen className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-gray-900">{t.noDocumentsYet}</h3>
        <p className="mt-2 max-w-sm mx-auto text-sm text-gray-500">
          {t.noDocumentsDescription}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="rounded-xl border border-gray-200/80 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <Folder className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">{t.statsDocuments}</span>
          </div>
          <p className="mt-1.5 text-xl font-bold text-gray-900 tabular-nums">{stats.totalCount}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{t.statsStatus}</span>
            {stats.ready > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700" title={t.statusReadyForAi}>
                <CheckCircle2 className="h-3.5 w-3.5" /> {stats.ready}
              </span>
            )}
            {stats.processing > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700" title={t.statusProcessing}>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {stats.processing}
              </span>
            )}
            {stats.pending > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600" title={t.statusPending}>
                <Clock className="h-3.5 w-3.5" /> {stats.pending}
              </span>
            )}
            {stats.failed > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700" title={t.statusFailed}>
                <XCircle className="h-3.5 w-3.5" /> {stats.failed}
              </span>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200/80 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <HardDrive className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">{t.statsTotalSize}</span>
          </div>
          <p className="mt-1.5 text-xl font-bold text-gray-900 tabular-nums">
            {formatFileSize(stats.totalSizeBytes)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200/80 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <FileText className="h-4 w-4 text-red-500" />
            <span className="text-xs font-medium uppercase tracking-wide">{t.statsByType}</span>
          </div>
          <div className="mt-1.5 space-y-1 text-sm">
            {stats.byType.pdf > 0 && (
              <p className="flex justify-between gap-2 text-gray-700">
                <span>{t.typePdf}</span>
                <span className="tabular-nums text-gray-900 font-medium">{stats.byType.pdf} ({formatFileSize(stats.byTypeSize.pdf)})</span>
              </p>
            )}
            {stats.byType.markdown > 0 && (
              <p className="flex justify-between gap-2 text-gray-700">
                <span>{t.typeMarkdown}</span>
                <span className="tabular-nums text-gray-900 font-medium">{stats.byType.markdown} ({formatFileSize(stats.byTypeSize.markdown)})</span>
              </p>
            )}
            {stats.byType.text > 0 && (
              <p className="flex justify-between gap-2 text-gray-700">
                <span>{t.typeText}</span>
                <span className="tabular-nums text-gray-900 font-medium">{stats.byType.text} ({formatFileSize(stats.byTypeSize.text)})</span>
              </p>
            )}
            {(stats.byType.doc > 0 || stats.byType.docx > 0) && (
              <p className="flex justify-between gap-2 text-gray-700">
                <span>{t.typeWord}</span>
                <span className="tabular-nums text-gray-900 font-medium">{stats.byType.doc + stats.byType.docx} ({formatFileSize(stats.byTypeSize.doc + stats.byTypeSize.docx)})</span>
              </p>
            )}
            {stats.byType.pdf === 0 && stats.byType.markdown === 0 && stats.byType.text === 0 && stats.byType.doc === 0 && stats.byType.docx === 0 && (
              <p className="text-gray-500">—</p>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200/80 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <Tag className="h-4 w-4 text-violet-500" />
            <span className="text-xs font-medium uppercase tracking-wide">{t.statsMetadata}</span>
          </div>
          <div className="mt-1.5 space-y-1 text-sm text-gray-700">
            <p className="flex items-center justify-between gap-2">
              <span>{t.statsTagged}</span>
              <span className="tabular-nums font-medium text-gray-900">{stats.taggedCount}</span>
            </p>
            <p className="flex items-center justify-between gap-2">
              <span>{t.statsWithDescription}</span>
              <span className="tabular-nums font-medium text-gray-900">{stats.withDescriptionCount}</span>
            </p>
            {stats.uniqueTags.length > 0 && (
              <p className="text-xs text-gray-500 truncate" title={stats.uniqueTags.map((t) => `#${t}`).join(', ')}>
                {stats.uniqueTags.slice(0, 3).map((t) => `#${t}`).join(', ')}
                {stats.uniqueTags.length > 3 ? ` +${stats.uniqueTags.length - 3}` : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200/80 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Folder className="h-4 w-4 text-gray-500" />
          <span>
            {tagFilter ? (
              <>
                {filteredDocuments.length} {t.documentsOfCount} {documents.length} {t.documentsCount}{documents.length !== 1 ? 's' : ''}
                <span className="ml-1 rounded bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-700">#{tagFilter}</span>
              </>
            ) : (
              <>{documents.length} {t.documentsCount}{documents.length !== 1 ? 's' : ''}</>
            )}
          </span>
        </div>
        <div className="h-4 w-px bg-gray-200" />
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">{t.filterByTag}</label>
          <select
            value={tagFilter ?? ''}
            onChange={(e) => setTagFilter(e.target.value || null)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">{t.allDocuments}</option>
            {stats.uniqueTags.map((tag) => (
              <option key={tag} value={tag}>
                #{tag}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">{t.groupByLabel}</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="none">{t.groupNone}</option>
            <option value="type">{t.groupType}</option>
            <option value="date">{t.groupDate}</option>
            <option value="class">{t.groupClass}</option>
            <option value="tags">{t.groupTags}</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">{t.sortByLabel}</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="name">{t.sortName}</option>
            <option value="date">{t.sortDate}</option>
            <option value="type">{t.sortType}</option>
            <option value="size">{t.sortSize}</option>
          </select>
          <button
            type="button"
            onClick={toggleSortDir}
            className="rounded-lg border border-gray-200 bg-gray-50 p-1.5 text-gray-600 hover:bg-gray-100 transition-colors"
            title={sortDir === 'asc' ? t.sortAscending : t.sortDescending}
          >
            {sortDir === 'asc' ? (
              <ArrowUpDown className="h-4 w-4" />
            ) : (
              <ArrowDownAZ className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`rounded-lg p-2 transition-colors ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
            title={t.listView}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`rounded-lg p-2 transition-colors ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
            title={t.gridView}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Empty filter state */}
      {filteredDocuments.length === 0 && tagFilter && (
        <div className="rounded-2xl border border-gray-200/80 bg-white px-6 py-10 text-center shadow-sm">
          <Tag className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-700">{t.noDocumentsWithTag} #{tagFilter}</p>
          <p className="mt-1 text-sm text-gray-500">{t.noDocumentsWithTagHint}</p>
          <button
            type="button"
            onClick={() => setTagFilter(null)}
            className="mt-4 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {t.clearFilter}
          </button>
        </div>
      )}

      {/* Grouped content */}
      {filteredDocuments.length > 0 && (
      <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
        {grouped.map(({ key, label, documents: groupDocs }) => {
          const isExpanded = groupBy === 'none' || expandedGroups.has(key) || expandedGroups.size === 0
          const shouldShowHeader = groupBy !== 'none'
          const isCollapsed = shouldShowHeader && !expandedGroups.has(key) && expandedGroups.size > 0

          return (
            <div key={key} className="border-b border-gray-100 last:border-b-0">
              {shouldShowHeader && (
                <button
                  type="button"
                  onClick={() => toggleGroup(key)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left bg-gray-50/80 hover:bg-gray-100/80 transition-colors"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  )}
                  <Folder className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <span className="font-medium text-gray-800">{label}</span>
                  <span className="text-sm text-gray-500">({groupDocs.length})</span>
                </button>
              )}
              {(isExpanded || !shouldShowHeader) && (
                <div
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4'
                      : 'divide-y divide-gray-100'
                  }
                >
                  {groupDocs.map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      viewMode={viewMode}
                      onInfo={() => setQualityModalDocument(doc)}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      getFileIcon={getFileIcon}
                      formatFileSize={formatFileSize}
                      formatDate={formatDate}
                      getDocumentStatusLevel={getDocumentStatusLevel}
                      getStatusPillClasses={getStatusPillClasses}
                      getInfoButtonClasses={getInfoButtonClasses}
                      translations={t}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      )}

      {qualityModalDocument && (
        <DocumentQualityModal
          document={qualityModalDocument}
          onClose={() => setQualityModalDocument(null)}
          translations={t}
        />
      )}
    </div>
  )
}

function DocumentRow({
  doc,
  viewMode,
  onInfo,
  onUpdate,
  onDelete,
  getFileIcon,
  formatFileSize,
  formatDate,
  getDocumentStatusLevel,
  getStatusPillClasses,
  getInfoButtonClasses,
  translations: t,
}: {
  doc: DocumentExplorerItem
  viewMode: ViewMode
  onInfo: () => void
  onUpdate: DocumentsExplorerProps['onUpdate']
  onDelete: DocumentsExplorerProps['onDelete']
  getFileIcon: (ft: string) => React.ReactElement
  formatFileSize: (b: number) => string
  formatDate: (d: string) => string
  getDocumentStatusLevel: (d: DocumentExplorerItem) => DocumentStatusLevel
  getStatusPillClasses: (s: DocumentStatusLevel) => string
  getInfoButtonClasses: (s: DocumentStatusLevel) => string
  translations: DocumentsExplorerTranslations
}) {
  const statusLevel = getDocumentStatusLevel(doc)
  const statusLabel =
    doc.processing_status === 'completed'
      ? t.statusReady
      : doc.processing_status === 'processing'
        ? t.statusProcessing
        : doc.processing_status === 'failed'
          ? t.statusFailed
          : t.statusPending

  if (viewMode === 'grid') {
    return (
      <div className="group flex flex-col rounded-xl border border-gray-100 bg-gray-50/50 p-4 hover:border-gray-200 hover:bg-white hover:shadow-md transition-all">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm">
            {getFileIcon(doc.file_type)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-gray-900 truncate" title={doc.title}>
              {doc.title}
            </h3>
            {doc.description && String(doc.description).trim() && (
              <p className="text-xs text-gray-500 line-clamp-2 mt-0.5" title={doc.description}>
                {doc.description}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize bg-white border-gray-200 text-gray-600">
                {doc.file_type}
              </span>
              <span className="text-xs text-gray-500">{formatFileSize(doc.file_size)}</span>
              <span className="text-xs text-gray-500">{formatDate(doc.created_at)}</span>
              {doc.content_language && (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-medium text-blue-700 capitalize">
                  <Globe className="h-3 w-3" />
                  {doc.content_language}
                </span>
              )}
            </div>
            {doc.tags && doc.tags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {doc.tags.slice(0, 4).map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded bg-violet-50 px-1.5 py-0.5 text-xs font-medium text-violet-700"
                  >
                    #{String(tag).trim()}
                  </span>
                ))}
                {doc.tags.length > 4 && (
                  <span className="text-xs text-gray-400">+{doc.tags.length - 4}</span>
                )}
              </div>
            )}
            <div className="mt-2 flex items-center gap-1">
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getStatusPillClasses(statusLevel)}`}
              >
                {statusLabel}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={onInfo}
            className={getInfoButtonClasses(statusLevel)}
            title={t.docInfoQuality}
          >
            <Info className="h-4 w-4" />
          </button>
          <a
            href={doc.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title={t.docView}
          >
            <Eye className="h-4 w-4" />
          </a>
          <a
            href={doc.file_url}
            download={doc.file_name}
            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title={t.docDownload}
          >
            <Download className="h-4 w-4" />
          </a>
          <EditDocumentDialog document={doc} onUpdate={onUpdate} onDelete={onDelete} translations={t} />
        </div>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-4 px-4 py-3 hover:bg-gray-50/80 transition-colors">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 border border-gray-200/80">
        {getFileIcon(doc.file_type)}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-medium text-gray-900 truncate" title={doc.title}>
          {doc.title}
        </h3>
        {doc.description && String(doc.description).trim() && (
          <p className="mt-0.5 text-sm text-gray-500 line-clamp-1" title={doc.description}>
            {doc.description}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
          <span className="capitalize">{doc.file_type}</span>
          <span>·</span>
          <span>{formatFileSize(doc.file_size)}</span>
          <span>·</span>
          <span>{formatDate(doc.created_at)}</span>
          {doc.content_language && (
            <>
              <span className="text-gray-300">·</span>
              <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700 capitalize">
                <Globe className="h-3 w-3" />
                {doc.content_language}
              </span>
            </>
          )}
          {doc.tags && doc.tags.length > 0 && (
            <>
              <span className="text-gray-300">·</span>
              <span className="flex flex-wrap gap-1">
                {doc.tags.slice(0, 3).map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded bg-violet-50 px-1.5 py-0.5 text-xs font-medium text-violet-700"
                  >
                    #{String(tag).trim()}
                  </span>
                ))}
                {doc.tags.length > 3 && (
                  <span className="text-xs text-gray-400">+{doc.tags.length - 3}</span>
                )}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={`hidden sm:inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getStatusPillClasses(statusLevel)}`}
        >
          {statusLabel}
        </span>
        <button
          type="button"
          onClick={onInfo}
          className={getInfoButtonClasses(statusLevel)}
          title={t.docInfoQuality}
        >
          <Info className="h-4 w-4" />
        </button>
        <a
          href={doc.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          title={t.docView}
        >
          <Eye className="h-4 w-4" />
        </a>
        <a
          href={doc.file_url}
          download={doc.file_name}
          className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          title={t.docDownload}
        >
          <Download className="h-4 w-4" />
        </a>
        <EditDocumentDialog document={doc} onUpdate={onUpdate} onDelete={onDelete} translations={t} />
      </div>
    </div>
  )
}
