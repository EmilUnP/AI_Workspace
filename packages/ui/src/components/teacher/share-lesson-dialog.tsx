'use client'

import { useState, useTransition } from 'react'
import { 
  GraduationCap, 
  CheckCircle, 
  XCircle,
  Loader2,
  Search,
  CheckSquare,
  Square,
  Sparkles,
  Clock,
 } from 'lucide-react'

export interface Lesson {
  id: string
  title: string
  description?: string | null
  topic?: string | null
  duration_minutes?: number | null
  is_published: boolean
  created_at: string
}

export interface ShareLessonDialogLabels {
  shareButton: string
  modalTitle: string
  modalSubtitleSelect: string
  searchPlaceholder: string
  selectAll: string
  selected: string
  noLessonsAvailable: string
  noLessonsMatchSearch: string
  allLessonsShared: string
  published: string
  draft: string
  cancel: string
  share: string
  sharing: string
  shareSuccess: string
}

const DEFAULT_LESSON_LABELS: ShareLessonDialogLabels = {
  shareButton: 'Share Existing Lesson',
  modalTitle: 'Share Lessons with Class',
  modalSubtitleSelect: 'Select lessons to share with',
  searchPlaceholder: 'Search lessons...',
  selectAll: 'Select All',
  selected: 'selected',
  noLessonsAvailable: 'No lessons available',
  noLessonsMatchSearch: 'No lessons match your search.',
  allLessonsShared: 'All your lessons are already shared with this class.',
  published: 'Published',
  draft: 'Draft',
  cancel: 'Cancel',
  share: 'Share',
  sharing: 'Sharing...',
  shareSuccess: '{count} lesson(s) shared with {className}!',
}

export interface ShareLessonDialogProps {
  classId: string
  className: string
  availableLessons: Lesson[]
  onShareLessons: (lessonIds: string[], classId: string) => Promise<{ error?: string; count?: number }>
  labels?: Partial<ShareLessonDialogLabels>
}

export function ShareLessonDialog({ classId, className, availableLessons, onShareLessons, labels: labelsProp }: ShareLessonDialogProps) {
  const L = { ...DEFAULT_LESSON_LABELS, ...labelsProp }
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedLessons, setSelectedLessons] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const filteredLessons = availableLessons.filter(lesson =>
    lesson.title.toLowerCase().includes(search.toLowerCase()) ||
    lesson.description?.toLowerCase().includes(search.toLowerCase()) ||
    lesson.topic?.toLowerCase().includes(search.toLowerCase())
  )

  const toggleLesson = (lessonId: string) => {
    setSelectedLessons(prev =>
      prev.includes(lessonId)
        ? prev.filter(id => id !== lessonId)
        : [...prev, lessonId]
    )
  }

  const toggleAll = () => {
    if (selectedLessons.length === filteredLessons.length) {
      setSelectedLessons([])
    } else {
      setSelectedLessons(filteredLessons.map(l => l.id))
    }
  }

  const handleShare = () => {
    if (selectedLessons.length === 0) return

    startTransition(async () => {
      const result = await onShareLessons(selectedLessons, classId)
      
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: `${result.count} lesson(s) shared with ${className}!` })
        setTimeout(() => {
          setIsOpen(false)
          setSelectedLessons([])
          setMessage(null)
        }, 1500)
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm"
      >
        <GraduationCap className="h-4 w-4" />
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
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{L.modalTitle}</h2>
                  <p className="text-emerald-100 text-sm mt-0.5">
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                />
              </div>
              
              {filteredLessons.length > 0 && (
                <div className="flex items-center justify-between mt-3">
                  <button
                    onClick={toggleAll}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-600 transition-colors"
                  >
                    {selectedLessons.length === filteredLessons.length ? (
                      <CheckSquare className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    {L.selectAll} ({filteredLessons.length})
                  </button>
                  <span className="text-sm text-gray-500">
                    {selectedLessons.length} {L.selected}
                  </span>
                </div>
              )}
            </div>

            {/* Lesson List */}
            <div className="max-h-80 overflow-y-auto">
              {filteredLessons.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">{L.noLessonsAvailable}</h3>
                  <p className="text-sm text-gray-500">
                    {search ? L.noLessonsMatchSearch : L.allLessonsShared}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredLessons.map((lesson) => {
                    const isSelected = selectedLessons.includes(lesson.id)
                    
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => toggleLesson(lesson.id)}
                        className={`w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-emerald-50' : ''
                        }`}
                      >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${
                          lesson.is_published 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-yellow-100 text-yellow-600'
                        }`}>
                          <GraduationCap className="h-5 w-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 truncate">{lesson.title}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500">
                            {lesson.topic && (
                              <>
                                <span className="truncate max-w-[200px]">{lesson.topic}</span>
                                <span>•</span>
                              </>
                            )}
                            {lesson.duration_minutes && (
                              <>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {lesson.duration_minutes} min
                                </span>
                                <span>•</span>
                              </>
                            )}
                            <span>{new Date(lesson.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                        
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 flex-shrink-0 transition-colors ${
                          isSelected 
                            ? 'bg-emerald-600 border-emerald-600' 
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
                disabled={isPending || selectedLessons.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {L.sharing}
                  </>
                ) : (
                  <>
                    <GraduationCap className="h-4 w-4" />
                    {L.share} {selectedLessons.length > 0 ? `(${selectedLessons.length})` : ''}
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
