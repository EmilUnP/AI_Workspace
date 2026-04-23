'use client'

import { useState, useTransition } from 'react'
import { 
  FileText, 
  Share2, 
  CheckCircle, 
  XCircle, 
  Search,
  Loader2,
  CheckSquare,
  Square,
  Sparkles
} from 'lucide-react'

import type { Exam } from './teacher-dashboard-client'

export interface ShareExamDialogLabels {
  shareButton: string
  modalTitle: string
  modalSubtitleSelect: string
  searchPlaceholder: string
  selectAll: string
  selected: string
  noExamsAvailable: string
  noExamsMatchSearch: string
  allExamsShared: string
  published: string
  draft: string
  questions: string
  cancel: string
  share: string
  sharing: string
  shareSuccess: string
}

const DEFAULT_EXAM_LABELS: ShareExamDialogLabels = {
  shareButton: 'Share Existing Exam',
  modalTitle: 'Share Exams with Class',
  modalSubtitleSelect: 'Select exams to share with',
  searchPlaceholder: 'Search exams...',
  selectAll: 'Select All',
  selected: 'selected',
  noExamsAvailable: 'No exams available',
  noExamsMatchSearch: 'No exams match your search.',
  allExamsShared: 'All your exams are already shared with this class.',
  published: 'Published',
  draft: 'Draft',
  questions: 'questions',
  cancel: 'Cancel',
  share: 'Share',
  sharing: 'Sharing...',
  shareSuccess: '{count} exam(s) shared with {className}!',
}

export interface ShareExamDialogProps {
  classId: string
  className: string
  availableExams: Exam[]
  onShareExams: (examIds: string[], classId: string) => Promise<{ error?: string; count?: number }>
  labels?: Partial<ShareExamDialogLabels>
}

export function ShareExamDialog({ classId, className, availableExams, onShareExams, labels: labelsProp }: ShareExamDialogProps) {
  const L = { ...DEFAULT_EXAM_LABELS, ...labelsProp }
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedExams, setSelectedExams] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const filteredExams = availableExams.filter(exam =>
    exam.title.toLowerCase().includes(search.toLowerCase()) ||
    exam.description?.toLowerCase().includes(search.toLowerCase())
  )

  const toggleExam = (examId: string) => {
    setSelectedExams(prev =>
      prev.includes(examId)
        ? prev.filter(id => id !== examId)
        : [...prev, examId]
    )
  }

  const toggleAll = () => {
    if (selectedExams.length === filteredExams.length) {
      setSelectedExams([])
    } else {
      setSelectedExams(filteredExams.map(e => e.id))
    }
  }

  const handleShare = () => {
    if (selectedExams.length === 0) return

    startTransition(async () => {
      const result = await onShareExams(selectedExams, classId)
      
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: `${result.count} exam(s) shared with ${className}!` })
        setTimeout(() => {
          setIsOpen(false)
          setSelectedExams([])
          setMessage(null)
        }, 1500)
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors shadow-sm"
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
            <div className="bg-gradient-to-r from-violet-600 to-purple-700 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{L.modalTitle}</h2>
                  <p className="text-violet-100 text-sm mt-0.5">
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
                  placeholder="Search exams..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all"
                />
              </div>
              
              {filteredExams.length > 0 && (
                <div className="flex items-center justify-between mt-3">
                  <button
                    onClick={toggleAll}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-violet-600 transition-colors"
                  >
                    {selectedExams.length === filteredExams.length ? (
                      <CheckSquare className="h-4 w-4 text-violet-600" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    {L.selectAll} ({filteredExams.length})
                  </button>
                  <span className="text-sm text-gray-500">
                    {selectedExams.length} {L.selected}
                  </span>
                </div>
              )}
            </div>

            {/* Exam List */}
            <div className="max-h-80 overflow-y-auto">
              {filteredExams.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">{L.noExamsAvailable}</h3>
                  <p className="text-sm text-gray-500">
                    {search ? L.noExamsMatchSearch : L.allExamsShared}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredExams.map((exam) => {
                    const isSelected = selectedExams.includes(exam.id)
                    const questionCount = exam.questions?.length || 0
                    
                    return (
                      <button
                        key={exam.id}
                        onClick={() => toggleExam(exam.id)}
                        className={`w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-violet-50' : ''
                        }`}
                      >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${
                          exam.is_published 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-yellow-100 text-yellow-600'
                        }`}>
                          <FileText className="h-5 w-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 truncate">{exam.title}</p>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {questionCount} {L.questions}
                          </p>
                        </div>
                        
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 flex-shrink-0 transition-colors ${
                          isSelected 
                            ? 'bg-violet-600 border-violet-600' 
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
                disabled={isPending || selectedExams.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {L.sharing}
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    {L.share} {selectedExams.length > 0 ? `(${selectedExams.length})` : ''}
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
