'use client'

import { useMemo, useState } from 'react'
import { Download, Eye, FileCode, FileText, File as FileIcon, Info } from 'lucide-react'
import { EditDocumentDialog } from './edit-document-dialog'
import { DocumentQualityModal } from './document-quality-modal'
import type { DocItem } from './documents-list-state'

const iconForType = (type: string) => {
  if (type === 'pdf') return <FileText className="h-4 w-4 text-red-500" />
  if (type === 'markdown') return <FileCode className="h-4 w-4 text-blue-500" />
  return <FileIcon className="h-4 w-4 text-gray-500" />
}

const bytes = (v: number) => (v < 1024 ? `${v} B` : v < 1024 * 1024 ? `${(v / 1024).toFixed(1)} KB` : `${(v / (1024 * 1024)).toFixed(1)} MB`)

export function DocumentsExplorer({
  documents,
  onUpdate,
  onDelete,
}: {
  documents: DocItem[]
  onUpdate: (input: { documentId: string; title: string; description?: string | null; tags?: string[] | null }) => Promise<{ error?: string; success?: boolean }>
  onDelete: (documentId: string) => Promise<{ error?: string; success?: boolean }>
}) {
  const [query, setQuery] = useState('')
  const [qualityDoc, setQualityDoc] = useState<DocItem | null>(null)

  const filtered = useMemo(
    () =>
      documents.filter((d) =>
        `${d.title} ${d.file_name}`.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [documents, query]
  )

  if (documents.length === 0) {
    return <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">No documents yet.</div>
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents..."
            className="w-full max-w-xs rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
          <p className="text-xs text-gray-500">{filtered.length} document(s)</p>
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {filtered.map((doc) => (
          <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded border border-gray-200 bg-gray-50">{iconForType(doc.file_type)}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{doc.title}</p>
              <p className="truncate text-xs text-gray-500">
                {doc.file_type} - {bytes(doc.file_size)} - {new Date(doc.created_at).toLocaleDateString('en-US')}
              </p>
            </div>
            <button type="button" onClick={() => setQualityDoc(doc)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100" title="Info">
              <Info className="h-4 w-4" />
            </button>
            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="rounded p-1.5 text-gray-500 hover:bg-gray-100" title="View">
              <Eye className="h-4 w-4" />
            </a>
            <a href={doc.file_url} download={doc.file_name} className="rounded p-1.5 text-gray-500 hover:bg-gray-100" title="Download">
              <Download className="h-4 w-4" />
            </a>
            <EditDocumentDialog document={doc} onUpdate={onUpdate} onDelete={onDelete} />
          </div>
        ))}
      </div>

      {qualityDoc ? <DocumentQualityModal document={qualityDoc} onClose={() => setQualityDoc(null)} /> : null}
    </div>
  )
}

