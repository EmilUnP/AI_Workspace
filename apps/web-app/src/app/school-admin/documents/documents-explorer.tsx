'use client'

import { useEffect, useMemo, useState, type ReactElement } from 'react'
import {
  FileText,
  File,
  FileCode,
  Eye,
  Info,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowDownAZ,
  Folder,
  Globe,
} from 'lucide-react'
import { EditDocumentDialog } from './edit-document-dialog'
import { DocumentQualityModal } from './document-quality-modal'
import type { DocItem } from './documents-list-state'

type GroupBy = 'none' | 'date' | 'class'
type SortBy = 'name' | 'date' | 'type' | 'size'
type SortDir = 'asc' | 'desc'
type DocumentStatusLevel = 'ok' | 'issues' | 'critical'
type ExplorerItem = DocItem & { classes?: { id: string; name: string; class_code?: string | null } | null }

function getFileIcon(fileType: string): ReactElement {
  if (fileType === 'pdf') return <FileText className="h-5 w-5 text-red-500" />
  if (fileType === 'markdown') return <FileCode className="h-5 w-5 text-blue-500" />
  return <File className="h-5 w-5 text-gray-500" />
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getDateGroupKey(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return 'This week'
  if (diffDays < 30) return 'This month'
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function getDocumentStatusLevel(doc: ExplorerItem): DocumentStatusLevel {
  if (doc.processing_status === 'failed') return 'critical'
  const q = String(doc.quality_status || '').toLowerCase()
  if (['failed', 'error', 'critical'].some((v) => q.includes(v))) return 'critical'
  if (doc.processing_status === 'processing') return 'issues'
  if (['warning', 'degraded', 'low'].some((v) => q.includes(v))) return 'issues'
  if (doc.quality_message && !q) return 'issues'
  return 'ok'
}

function getStatusPillClasses(status: DocumentStatusLevel): string {
  if (status === 'critical') return 'bg-red-50 text-red-700 border-red-200'
  if (status === 'issues') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-emerald-50 text-emerald-700 border-emerald-200'
}

function getInfoButtonClasses(status: DocumentStatusLevel): string {
  const base = 'p-1.5 rounded-md transition-colors'
  if (status === 'critical') return `${base} text-red-500 hover:text-red-600 hover:bg-red-50`
  if (status === 'issues') return `${base} text-amber-500 hover:text-amber-600 hover:bg-amber-50`
  return `${base} text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50`
}

function sortDocuments(docs: ExplorerItem[], sortBy: SortBy, dir: SortDir): ExplorerItem[] {
  const sorted = [...docs].sort((a, b) => {
    let cmp = 0
    if (sortBy === 'name') cmp = (a.title || a.file_name).localeCompare(b.title || b.file_name, undefined, { sensitivity: 'base' })
    if (sortBy === 'date') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (sortBy === 'type') cmp = (a.file_type || '').localeCompare(b.file_type || '')
    if (sortBy === 'size') cmp = (a.file_size || 0) - (b.file_size || 0)
    return dir === 'asc' ? cmp : -cmp
  })
  return sorted
}

export function DocumentsExplorer({
  documents,
  onUpdate,
  onDelete,
}: {
  documents: ExplorerItem[]
  onUpdate: (input: { documentId: string; title: string; description?: string | null; tags?: string[] | null }) => Promise<{ error?: string; success?: boolean }>
  onDelete: (documentId: string) => Promise<{ error?: string; success?: boolean }>
}) {
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [qualityModalDocument, setQualityModalDocument] = useState<ExplorerItem | null>(null)

  const sorted = useMemo(() => sortDocuments(documents, sortBy, sortDir), [documents, sortBy, sortDir])

  const grouped = useMemo(() => {
    if (groupBy === 'none') return [{ key: '_', label: 'All documents', documents: sorted }]

    const map = new Map<string, ExplorerItem[]>()
    for (const doc of sorted) {
      let key = '_'
      if (groupBy === 'date') key = getDateGroupKey(doc.created_at)
      else if (groupBy === 'class') key = doc.classes?.id ?? '_none'
      if (!map.has(key)) map.set(key, [])
      map.get(key)?.push(doc)
    }

    return Array.from(map.entries()).map(([key, groupDocs]) => {
      let label = key
      if (groupBy === 'class') label = key === '_none' ? 'No class' : (groupDocs[0]?.classes?.name ?? key)
      return { key, label, documents: groupDocs }
    })
  }, [sorted, groupBy])

  useEffect(() => {
    if (groupBy === 'none') setExpandedGroups(new Set())
    else setExpandedGroups(new Set(grouped.map((g) => g.key)))
  }, [groupBy]) // eslint-disable-line react-hooks/exhaustive-deps

  if (documents.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200/80 bg-white p-16 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
          <FolderOpen className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-gray-900">No documents yet</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">Drag and drop a file above to upload your first document.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200/80 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">Group by</label>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700">
            <option value="none">None</option>
            <option value="date">Date</option>
            <option value="class">Class</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">Sort by</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700">
            <option value="name">Name</option>
            <option value="date">Date</option>
            <option value="type">Type</option>
            <option value="size">Size</option>
          </select>
          <button type="button" onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))} className="rounded-lg border border-gray-200 bg-gray-50 p-1.5 text-gray-600 hover:bg-gray-100">
            {sortDir === 'asc' ? <ArrowUpDown className="h-4 w-4" /> : <ArrowDownAZ className="h-4 w-4" />}
          </button>
        </div>
      </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
          {grouped.map(({ key, label, documents: groupDocs }) => {
            const shouldShowHeader = groupBy !== 'none'
            const isExpanded = groupBy === 'none' || expandedGroups.has(key) || expandedGroups.size === 0
            const isCollapsed = shouldShowHeader && !expandedGroups.has(key) && expandedGroups.size > 0
            return (
              <div key={key} className="border-b border-gray-100 last:border-b-0">
                {shouldShowHeader ? (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedGroups((prev) => {
                        const next = new Set(prev)
                        if (next.has(key)) next.delete(key)
                        else next.add(key)
                        return next
                      })
                    }
                    className="flex w-full items-center gap-2 bg-gray-50/80 px-4 py-3 text-left transition-colors hover:bg-gray-100/80"
                  >
                    {isCollapsed ? <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-500" /> : <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-500" />}
                    <Folder className="h-4 w-4 flex-shrink-0 text-amber-500" />
                    <span className="font-medium text-gray-800">{label}</span>
                    <span className="text-sm text-gray-500">({groupDocs.length})</span>
                  </button>
                ) : null}
                {isExpanded ? (
                  <div className="divide-y divide-gray-100">
                    {groupDocs.map((doc) => (
                      <DocumentRow
                        key={doc.id}
                        doc={doc}
                        onInfo={() => setQualityModalDocument(doc)}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>

      {qualityModalDocument ? <DocumentQualityModal document={qualityModalDocument} onClose={() => setQualityModalDocument(null)} /> : null}
    </div>
  )
}

function DocumentRow({
  doc,
  onInfo,
  onUpdate,
  onDelete,
}: {
  doc: ExplorerItem
  onInfo: () => void
  onUpdate: (input: { documentId: string; title: string; description?: string | null; tags?: string[] | null }) => Promise<{ error?: string; success?: boolean }>
  onDelete: (documentId: string) => Promise<{ error?: string; success?: boolean }>
}) {
  const statusLevel = getDocumentStatusLevel(doc)
  const statusLabel =
    doc.processing_status === 'completed' ? 'Ready' :
    doc.processing_status === 'processing' ? 'Processing' :
    doc.processing_status === 'failed' ? 'Failed' : 'Pending'

  return (
    <div className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-gray-50/80">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200/80 bg-gray-100">
        {getFileIcon(doc.file_type)}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-medium text-gray-900" title={doc.title}>{doc.title}</h3>
        {doc.description ? <p className="mt-0.5 line-clamp-1 text-sm text-gray-500" title={doc.description}>{doc.description}</p> : null}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
          <span className="capitalize">{doc.file_type}</span>
          <span>·</span>
          <span>{formatFileSize(doc.file_size)}</span>
          <span>·</span>
          <span>{getDateGroupKey(doc.created_at)}</span>
          {doc.content_language ? (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium capitalize text-blue-700">
                <Globe className="h-3 w-3" />
                {doc.content_language}
              </span>
            </>
          ) : null}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <span className={`hidden items-center rounded-md border px-2 py-0.5 text-xs font-medium sm:inline-flex ${getStatusPillClasses(statusLevel)}`}>{statusLabel}</span>
        <button type="button" onClick={onInfo} className={getInfoButtonClasses(statusLevel)} title="Document info & quality">
          <Info className="h-4 w-4" />
        </button>
        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="View">
          <Eye className="h-4 w-4" />
        </a>
        <EditDocumentDialog document={doc} onUpdate={onUpdate} onDelete={onDelete} />
      </div>
    </div>
  )
}

