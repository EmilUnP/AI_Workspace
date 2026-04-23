'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  FileText, 
  FolderOpen, 
  Eye, 
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
  File,
  Globe,
  Unlink,
  GraduationCap,
  Clock,
  PlayCircle,
} from 'lucide-react'

export interface SharedExam {
  id: string
  title: string
  description?: string | null
  questions?: unknown[]
  is_published: boolean
  created_at: string
  language?: string
  translations?: Record<string, any>
}

export interface SharedDocument {
  id: string
  title: string
  description?: string | null
  file_type: string
  file_size: number
  file_url: string
  created_at: string
}

export interface SharedLesson {
  id: string
  title: string
  description?: string | null
  topic?: string | null
  duration_minutes?: number | null
  is_published: boolean
  created_at: string
}

export interface SharedContentListLabels {
  removeExamTitle: string
  removeDocumentTitle: string
  removeLessonTitle: string
  removeConfirmMessage: string
  typeExam: string
  typeDocument: string
  typeLesson: string
  keep: string
  remove: string
  removing: string
  examRemovedFromClass: string
  documentRemovedFromClass: string
  lessonRemovedFromClass: string
  sharedExams: string
  sharedDocuments: string
  sharedLessons: string
  examCount: string
  documentCount: string
  lessonCount: string
  noExamsSharedYet: string
  noDocumentsSharedYet: string
  noLessonsSharedYet: string
  useShareExamButtonAbove: string
  useShareDocumentButtonAbove: string
  useShareLessonButtonAbove: string
  view: string
  viewExam: string
  viewLesson: string
  open: string
  removeFromClass: string
  published: string
  draft: string
  questions: string
}

const DEFAULT_SHARED_CONTENT_LABELS: SharedContentListLabels = {
  removeExamTitle: 'Remove Exam',
  removeDocumentTitle: 'Remove Document',
  removeLessonTitle: 'Remove Lesson',
  removeConfirmMessage: 'Remove "{title}" from this class? The {type} won\'t be deleted, just unlinked from this class.',
  typeExam: 'exam',
  typeDocument: 'document',
  typeLesson: 'lesson',
  keep: 'Keep',
  remove: 'Remove',
  removing: 'Removing...',
  examRemovedFromClass: 'Exam removed from class',
  documentRemovedFromClass: 'Document removed from class',
  lessonRemovedFromClass: 'Lesson removed from class',
  sharedExams: 'Shared Exams',
  sharedDocuments: 'Shared Documents',
  sharedLessons: 'Shared Lessons',
  examCount: 'exam(s)',
  documentCount: 'document(s)',
  lessonCount: 'lesson(s)',
  noExamsSharedYet: 'No exams shared yet',
  noDocumentsSharedYet: 'No documents shared yet',
  noLessonsSharedYet: 'No lessons shared yet',
  useShareExamButtonAbove: 'Use the "Share Existing Exam" button above to add exams to this class.',
  useShareDocumentButtonAbove: 'Use the "Share Existing Document" button above to add documents to this class.',
  useShareLessonButtonAbove: 'Use the "Share Existing Lesson" button above to add lessons to this class.',
  view: 'View',
  viewExam: 'View exam',
  viewLesson: 'View lesson',
  open: 'Open',
  removeFromClass: 'Remove from class',
  published: 'Published',
  draft: 'Draft',
  questions: 'questions',
}

export interface SharedContentListProps {
  classId: string
  sharedExams: SharedExam[]
  sharedDocuments: SharedDocument[]
  sharedLessons?: SharedLesson[]
  onRemoveExam?: (examId: string, classId: string) => Promise<{ error?: string; success?: boolean }>
  onRemoveDocument?: (documentId: string, classId: string) => Promise<{ error?: string; success?: boolean }>
  onRemoveLesson?: (lessonId: string, classId: string) => Promise<{ error?: string; success?: boolean }>
  labels?: Partial<SharedContentListLabels>
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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

// Language to country code mapping for flags
const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  en: 'gb',
  az: 'az',
  ru: 'ru',
  tr: 'tr',
  de: 'de',
  fr: 'fr',
  es: 'es',
  it: 'it',
  pt: 'pt',
  zh: 'cn',
  ja: 'jp',
  ko: 'kr',
  ar: 'sa',
}

// Language names for tooltips
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  az: 'Azərbaycan',
  ru: 'Русский',
  tr: 'Türkçe',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  ar: 'العربية',
}

export function SharedContentList({ 
  classId, 
  sharedExams, 
  sharedDocuments, 
  sharedLessons = [],
  onRemoveExam,
  onRemoveDocument,
  onRemoveLesson,
  labels: labelsProp
}: SharedContentListProps) {
  const L = { ...DEFAULT_SHARED_CONTENT_LABELS, ...labelsProp }
  const [isPending, startTransition] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    type: 'exam' | 'document' | 'lesson'
    id: string
    title: string
  }>({ isOpen: false, type: 'exam', id: '', title: '' })

  const openRemoveExamDialog = (examId: string, examTitle: string) => {
    setConfirmDialog({ isOpen: true, type: 'exam', id: examId, title: examTitle })
  }

  const openRemoveDocumentDialog = (docId: string, docTitle: string) => {
    setConfirmDialog({ isOpen: true, type: 'document', id: docId, title: docTitle })
  }

  const openRemoveLessonDialog = (lessonId: string, lessonTitle: string) => {
    setConfirmDialog({ isOpen: true, type: 'lesson', id: lessonId, title: lessonTitle })
  }

  const handleConfirmRemove = async () => {
    const { type, id } = confirmDialog
    setRemovingId(id)
    
    startTransition(async () => {
      let result
      if (type === 'exam' && onRemoveExam) {
        result = await onRemoveExam(id, classId)
      } else if (type === 'lesson' && onRemoveLesson) {
        result = await onRemoveLesson(id, classId)
      } else if (type === 'document' && onRemoveDocument) {
        result = await onRemoveDocument(id, classId)
      } else {
        result = { error: 'Remove action not provided' }
      }
      
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        const text = type === 'exam' ? L.examRemovedFromClass : type === 'lesson' ? L.lessonRemovedFromClass : L.documentRemovedFromClass
        setMessage({ type: 'success', text })
      }
      setRemovingId(null)
      setConfirmDialog({ isOpen: false, type: 'exam', id: '', title: '' })
      setTimeout(() => setMessage(null), 3000)
    })
  }

  const getAvailableLanguages = (exam: SharedExam) => {
    const languages = [exam.language || 'en']
    if (exam.translations) {
      languages.push(...Object.keys(exam.translations))
    }
    return [...new Set(languages)]
  }

  const getRemoveTitle = () => {
    if (confirmDialog.type === 'exam') return L.removeExamTitle
    if (confirmDialog.type === 'lesson') return L.removeLessonTitle
    return L.removeDocumentTitle
  }
  const getTypeForMessage = () => {
    if (confirmDialog.type === 'exam') return L.typeExam
    if (confirmDialog.type === 'lesson') return L.typeLesson
    return L.typeDocument
  }

  return (
    <div className="space-y-6">
      {/* Confirm Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => !isPending && setConfirmDialog({ isOpen: false, type: 'exam', id: '', title: '' })}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100">
                <Unlink className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{getRemoveTitle()}</h3>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500">
                {L.removeConfirmMessage.replace('{title}', confirmDialog.title).replace('{type}', getTypeForMessage())}
              </p>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                onClick={() => setConfirmDialog({ isOpen: false, type: 'exam', id: '', title: '' })}
                disabled={isPending}
              >
                {L.keep}
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                onClick={handleConfirmRemove}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {L.removing}
                  </>
                ) : (
                  L.remove
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Toast */}
      {message && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 shadow-xl animate-in slide-in-from-bottom-4 duration-300 ${
          message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Shared Exams Section */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 truncate">{L.sharedExams}</h2>
              <p className="text-xs text-gray-500">{sharedExams.length} {L.examCount}</p>
            </div>
          </div>
        </div>

        {sharedExams.length === 0 ? (
          <div className="p-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-violet-300" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">{L.noExamsSharedYet}</h3>
            <p className="text-sm text-gray-500">
              {L.useShareExamButtonAbove}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sharedExams.map((exam) => {
              const questionCount = exam.questions?.length || 0
              const languages = getAvailableLanguages(exam)
              const isRemoving = removingId === exam.id
              
              return (
                <div key={exam.id} className="flex items-center gap-2 sm:gap-3 p-3 sm:p-3 hover:bg-gray-50/80 transition-colors">
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                    exam.is_published ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                  }`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-medium text-gray-900 truncate text-sm sm:text-base" title={exam.title}>{exam.title}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                      <span>{questionCount} {L.questions}</span>
                      {languages.length > 0 && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <Globe className="h-3 w-3" />
                            <div className="flex items-center gap-0.5">
                              {languages.slice(0, 3).map((lang) => {
                                const countryCode = LANGUAGE_TO_COUNTRY[lang] || 'un'
                                return (
                                  <span
                                    key={lang}
                                    className="inline-flex h-4 w-5 sm:h-4 sm:w-6 items-center justify-center rounded overflow-hidden"
                                    title={LANGUAGE_NAMES[lang] || lang}
                                  >
                                    <Image
                                      src={`https://flagcdn.com/w40/${countryCode}.png`}
                                      alt=""
                                      width={24}
                                      height={16}
                                      className="object-cover w-full h-full"
                                      unoptimized
                                    />
                                  </span>
                                )
                              })}
                              {languages.length > 3 && (
                                <span className="text-gray-400">+{languages.length - 3}</span>
                              )}
                            </div>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <Link
                      href={`/teacher/exams/${exam.id}`}
                      className="inline-flex items-center justify-center rounded-lg bg-gray-100 p-2 sm:px-2.5 sm:py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                      title={L.viewExam}
                    >
                      <Eye className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">{L.view}</span>
                    </Link>
                    {onRemoveExam && (
                      <button
                        onClick={() => openRemoveExamDialog(exam.id, exam.title)}
                        disabled={isRemoving}
                        className="inline-flex items-center justify-center rounded-lg bg-red-50 p-2 sm:px-2.5 sm:py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                        title={L.removeFromClass}
                      >
                        {isRemoving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Unlink className="h-4 w-4 sm:mr-1" />
                        )}
                        <span className="hidden sm:inline">{L.remove}</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Shared Documents Section */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <FolderOpen className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 truncate">{L.sharedDocuments}</h2>
              <p className="text-xs text-gray-500">{sharedDocuments.length} {L.documentCount}</p>
            </div>
          </div>
        </div>

        {sharedDocuments.length === 0 ? (
          <div className="p-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
              <FolderOpen className="h-8 w-8 text-amber-300" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">{L.noDocumentsSharedYet}</h3>
            <p className="text-sm text-gray-500">
              {L.useShareDocumentButtonAbove}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sharedDocuments.map((doc) => {
              const isRemoving = removingId === doc.id
              
              return (
                <div key={doc.id} className="flex items-center gap-2 sm:gap-3 p-3 hover:bg-gray-50/80 transition-colors">
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${getFileColor(doc.file_type)}`}>
                    {doc.file_type === 'pdf' ? <FileText className="h-4 w-4" /> : <File className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-medium text-gray-900 truncate text-sm sm:text-base" title={doc.title}>{doc.title}</p>
                      <span className="flex-shrink-0 inline-flex rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 uppercase">
                        {doc.file_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span className="text-gray-300">·</span>
                      <span>{new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-lg bg-gray-100 p-2 sm:px-2.5 sm:py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                      title={L.open}
                    >
                      <ExternalLink className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">{L.open}</span>
                    </a>
                    {onRemoveDocument && (
                      <button
                        onClick={() => openRemoveDocumentDialog(doc.id, doc.title)}
                        disabled={isRemoving}
                        className="inline-flex items-center justify-center rounded-lg bg-red-50 p-2 sm:px-2.5 sm:py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                        title={L.removeFromClass}
                      >
                        {isRemoving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Unlink className="h-4 w-4 sm:mr-1" />
                        )}
                        <span className="hidden sm:inline">{L.remove}</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Shared Lessons Section */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 truncate">{L.sharedLessons}</h2>
              <p className="text-xs text-gray-500">{sharedLessons.length} {L.lessonCount}</p>
            </div>
          </div>
        </div>

        {sharedLessons.length === 0 ? (
          <div className="p-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <GraduationCap className="h-8 w-8 text-emerald-300" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">{L.noLessonsSharedYet}</h3>
            <p className="text-sm text-gray-500">
              {L.useShareLessonButtonAbove}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sharedLessons.map((lesson) => {
              const isRemoving = removingId === lesson.id
              
              return (
                <div key={lesson.id} className="flex items-center gap-2 sm:gap-3 p-3 hover:bg-gray-50/80 transition-colors">
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                    lesson.is_published ? 'bg-emerald-100 text-emerald-600' : 'bg-yellow-100 text-yellow-600'
                  }`}>
                    <PlayCircle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-medium text-gray-900 truncate text-sm sm:text-base" title={lesson.title}>{lesson.title}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                      {lesson.duration_minutes != null && (
                        <span className="flex items-center gap-0.5 flex-shrink-0">
                          <Clock className="h-3 w-3" />
                          {lesson.duration_minutes} min
                        </span>
                      )}
                      {lesson.duration_minutes != null && lesson.created_at && <span className="text-gray-300">·</span>}
                      {lesson.created_at && (
                        <span>{new Date(lesson.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <Link
                      href={`/teacher/lessons/${lesson.id}`}
                      className="inline-flex items-center justify-center rounded-lg bg-gray-100 p-2 sm:px-2.5 sm:py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                      title={L.viewLesson}
                    >
                      <Eye className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">{L.view}</span>
                    </Link>
                    {onRemoveLesson && (
                      <button
                        onClick={() => openRemoveLessonDialog(lesson.id, lesson.title)}
                        disabled={isRemoving}
                        className="inline-flex items-center justify-center rounded-lg bg-red-50 p-2 sm:px-2.5 sm:py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                        title={L.removeFromClass}
                      >
                        {isRemoving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Unlink className="h-4 w-4 sm:mr-1" />
                        )}
                        <span className="hidden sm:inline">{L.remove}</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
