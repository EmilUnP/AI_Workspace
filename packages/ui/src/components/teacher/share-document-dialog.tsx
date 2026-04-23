'use client'

import { useState, useTransition } from 'react'
import { 
  FolderOpen, 
  Share2, 
  CheckCircle, 
  XCircle, 
  Search,
  Loader2,
  CheckSquare,
  Square,
  Sparkles,
  FileText,
  File
} from 'lucide-react'

export interface Document {
  id: string
  title: string
  description?: string | null
  file_type: string
  file_size: number
  created_at: string
}

export interface ShareDocumentDialogLabels {
  shareButton: string
  modalTitle: string
  modalSubtitleSelect: string
  searchPlaceholder: string
  selectAll: string
  selected: string
  noDocumentsAvailable: string
  noDocumentsMatchSearch: string
  allDocumentsShared: string
  cancel: string
  share: string
  sharing: string
  shareSuccess: string
}

const DEFAULT_DOCUMENT_LABELS: ShareDocumentDialogLabels = {
  shareButton: 'Share Existing Document',
  modalTitle: 'Share Documents with Class',
  modalSubtitleSelect: 'Select documents to share with',
  searchPlaceholder: 'Search documents...',
  selectAll: 'Select All',
  selected: 'selected',
  noDocumentsAvailable: 'No documents available',
  noDocumentsMatchSearch: 'No documents match your search.',
  allDocumentsShared: 'All your documents are already shared with this class.',
  cancel: 'Cancel',
  share: 'Share',
  sharing: 'Sharing...',
  shareSuccess: '{count} document(s) shared with {className}!',
}

export interface ShareDocumentDialogProps {
  classId: string
  className: string
  availableDocuments: Document[]
  onShareDocuments: (documentIds: string[], classId: string) => Promise<{ error?: string; count?: number }>
  labels?: Partial<ShareDocumentDialogLabels>
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(fileType: string) {
  switch (fileType) {
    case 'pdf':
      return <FileText className="h-5 w-5" />
    case 'markdown':
      return <File className="h-5 w-5" />
    default:
      return <FolderOpen className="h-5 w-5" />
  }
}

function getFileColor(fileType: string) {
  switch (fileType) {
    case 'pdf':
      return 'bg-red-100 text-red-600'
    case 'markdown':
      return 'bg-blue-100 text-blue-600'
    default:
      return 'bg-amber-100 text-amber-600'
  }
}

export function ShareDocumentDialog({ classId, className, availableDocuments, onShareDocuments, labels: labelsProp }: ShareDocumentDialogProps) {
  const L = { ...DEFAULT_DOCUMENT_LABELS, ...labelsProp }
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const filteredDocs = availableDocuments.filter(doc =>
    doc.title.toLowerCase().includes(search.toLowerCase()) ||
    doc.description?.toLowerCase().includes(search.toLowerCase())
  )

  const toggleDoc = (docId: string) => {
    setSelectedDocs(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    )
  }

  const toggleAll = () => {
    if (selectedDocs.length === filteredDocs.length) {
      setSelectedDocs([])
    } else {
      setSelectedDocs(filteredDocs.map(d => d.id))
    }
  }

  const handleShare = () => {
    if (selectedDocs.length === 0) return

    startTransition(async () => {
      const result = await onShareDocuments(selectedDocs, classId)
      
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: L.shareSuccess.replace('{count}', String(result.count ?? 0)).replace('{className}', className) })
        setTimeout(() => {
          setIsOpen(false)
          setSelectedDocs([])
          setMessage(null)
        }, 1500)
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors shadow-sm"
      >
        <Share2 className="h-4 w-4" />
        {L.shareButton}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isPending && setIsOpen(false)}
          />
          
          {/* Dialog Container */}
          <div className="min-h-full flex items-center justify-center p-4">
          {/* Dialog */}
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <FolderOpen className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{L.modalTitle}</h2>
                  <p className="text-amber-100 text-sm mt-0.5">
                    {L.modalSubtitleSelect} <span className="font-medium">{className}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={L.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                />
              </div>
              
              {filteredDocs.length > 0 && (
                <div className="flex items-center justify-between mt-3">
                  <button
                    onClick={toggleAll}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-amber-600 transition-colors"
                  >
                    {selectedDocs.length === filteredDocs.length ? (
                      <CheckSquare className="h-4 w-4 text-amber-600" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    {L.selectAll} ({filteredDocs.length})
                  </button>
                  <span className="text-sm text-gray-500">
                    {selectedDocs.length} {L.selected}
                  </span>
                </div>
              )}
            </div>

            {/* Document List */}
            <div className="max-h-80 overflow-y-auto">
              {filteredDocs.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">{L.noDocumentsAvailable}</h3>
                  <p className="text-sm text-gray-500">
                    {search ? L.noDocumentsMatchSearch : L.allDocumentsShared}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredDocs.map((doc) => {
                    const isSelected = selectedDocs.includes(doc.id)
                    
                    return (
                      <button
                        key={doc.id}
                        onClick={() => toggleDoc(doc.id)}
                        className={`w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-amber-50' : ''
                        }`}
                      >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${getFileColor(doc.file_type)}`}>
                          {getFileIcon(doc.file_type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 truncate">{doc.title}</p>
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 uppercase">
                              {doc.file_type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 flex-shrink-0 transition-colors ${
                          isSelected 
                            ? 'bg-amber-600 border-amber-600' 
                            : 'border-gray-300'
                        }`}>
                          {isSelected && <CheckCircle className="h-4 w-4 text-white" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Message */}
            {message && (
              <div className={`mx-4 mb-4 p-3 rounded-lg flex items-center gap-2 ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-700' 
                  : 'bg-red-50 text-red-700'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                <span className="text-sm font-medium">{message.text}</span>
              </div>
            )}

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 p-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                {L.cancel}
              </button>
              <button
                onClick={handleShare}
                disabled={isPending || selectedDocs.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {L.sharing}
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    {L.share} {selectedDocs.length > 0 ? `(${selectedDocs.length})` : ''}
                  </>
                )}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </>
  )
}
