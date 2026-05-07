'use client'

import { useState, type ReactNode } from 'react'

type AnyProps = Record<string, any>

function Placeholder({ children }: { children?: ReactNode }) {
  return <>{children ?? null}</>
}

export function AppErrorBoundary({ error, reset }: { error: Error; reset: () => void; variant?: string }) {
  return (
    <div className="mx-auto max-w-xl rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="mt-2 text-sm">{error?.message || 'Unexpected application error'}</p>
      <button type="button" onClick={reset} className="mt-4 rounded-md bg-red-700 px-3 py-2 text-sm text-white">
        Try again
      </button>
    </div>
  )
}

export function GlobalErrorBoundary({ error, reset }: { error: Error; reset: () => void; variant?: string }) {
  return <AppErrorBoundary error={error} reset={reset} />
}

export function PaginationFooter(_props: AnyProps) {
  return null
}

export function LessonRowActions() { return null }
export function EducationPlanRowActions() { return null }
export function EducationPlanCreateForm() { return null }
export function EducationPlanEditForm() { return null }
export function AITutor() { return null }
export function LessonTabs() { return null }
export function AudioPlayer() { return null }
export function LessonActions() { return null }
export function RichTextWithMath({ children }: { children?: ReactNode }) { return <>{children ?? null}</> }
export function ExamCreator(props: AnyProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [isPublished, setIsPublished] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [questionCount, setQuestionCount] = useState(10)
  const [generateLanguage, setGenerateLanguage] = useState('en')
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])

  const documents = Array.isArray(props?.documents) ? props.documents : []

  const handleCreate = async () => {
    if (!props?.onCreateExam || typeof props.onCreateExam !== 'function') {
      setError('Create action is unavailable.')
      return
    }

    if (!title.trim()) {
      setError('Title is required.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      const payload = {
        organizationId: String(props?.organizationId || 'global'),
        title: title.trim(),
        description: description.trim() || null,
        durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : 60,
        isPublished,
        questions: [],
        language: 'en',
      }

      const result = await props.onCreateExam(payload)
      if (result?.success) {
        setMessage('Exam created successfully.')
        if (result?.data?.id) {
          window.location.href = `/school-admin/exams/${String(result.data.id)}`
          return
        }
      } else {
        setError(String(result?.error || 'Failed to create exam.'))
      }
    } catch {
      setError('Failed to create exam.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGenerate = async () => {
    if (!props?.onGenerateExam || typeof props.onGenerateExam !== 'function') {
      setError('Generate action is unavailable.')
      return
    }
    if (selectedDocumentIds.length === 0) {
      setError('Please select at least one document.')
      return
    }

    setIsGenerating(true)
    setError(null)
    setMessage(null)
    try {
      const result = await props.onGenerateExam({
        documentIds: selectedDocumentIds,
        organizationId: String(props?.organizationId || 'global'),
        questionCount,
        difficulty: 'mixed',
        language: generateLanguage,
      })
      if (result?.error) {
        setError(String(result.error))
        return
      }
      if (result?.examId) {
        window.location.href = `/school-admin/exams/${String(result.examId)}`
        return
      }
      setMessage('Questions generated. You can now save exam.')
    } catch {
      setError('Failed to generate exam.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900">Exam Creator</h2>
      <p className="mt-1 text-sm text-gray-500">Generate from documents or create manually.</p>

      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-800">AI Generate</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">Source documents</label>
            <div className="max-h-32 overflow-auto rounded-lg border border-gray-200 bg-white p-2">
              {documents.length === 0 ? (
                <p className="text-xs text-gray-500">No documents available.</p>
              ) : (
                <div className="space-y-1">
                  {documents.map((doc: AnyProps) => {
                    const id = String(doc?.id || '')
                    const checked = selectedDocumentIds.includes(id)
                    return (
                      <label key={id} className="flex items-center gap-2 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setSelectedDocumentIds((prev) =>
                              e.target.checked ? [...prev, id] : prev.filter((x) => x !== id)
                            )
                          }}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="truncate">{String(doc?.title || 'Untitled')}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Questions</label>
            <input
              type="number"
              min={1}
              max={50}
              value={questionCount}
              onChange={(e) => setQuestionCount(Math.max(1, Math.min(50, Number(e.target.value || 10))))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <label className="mb-1 mt-2 block text-xs font-medium text-gray-600">Language</label>
            <input
              value={generateLanguage}
              onChange={(e) => setGenerateLanguage(e.target.value || 'en')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {isGenerating ? 'Generating...' : 'Generate with AI'}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter exam title"
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="min-h-[96px] w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Duration (minutes)</label>
          <input
            type="number"
            min={5}
            max={300}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value || 60))}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-end">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Publish immediately
          </label>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
        Available documents: <span className="font-medium text-gray-800">{documents.length}</span>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-emerald-600">{message}</p> : null}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={handleCreate}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Creating...' : 'Create Exam'}
        </button>
      </div>
    </div>
  )
}

export async function exportQuestionsToCsv(_questions: unknown[], _fileName?: string) {
  return
}

export type QuestionType = string
export type Question = Record<string, any>
export type ExamCreatorTranslations = Record<string, string>
export type ExamCreatorProps = AnyProps
export const DEFAULT_EXAM_CREATOR_TRANSLATIONS: ExamCreatorTranslations = {}

export type DocumentUploadTranslations = Record<string, string>
export type DocumentsExplorerTranslations = Record<string, string>

export function useDocumentsList(initialDocuments: any[] = []) {
  const [documents, setDocuments] = useState<any[]>(initialDocuments)

  return {
    documents,
    addDocument: (doc: any) => {
      setDocuments((prev) => [doc, ...prev])
    },
    updateDocument: (id: string, doc: any) => {
      setDocuments((prev) => prev.map((item) => (String(item?.id) === id ? { ...item, ...doc } : item)))
    },
    removeDocument: (id: string) => {
      setDocuments((prev) => prev.filter((item) => String(item?.id) !== id))
    },
  }
}

export function DocumentUploadZone(props: AnyProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const submit = async () => {
    if (!props?.onUpload || typeof props.onUpload !== 'function') return
    setIsSubmitting(true)
    setMessage(null)
    try {
      const payload = {
        title: title.trim() || file?.name || 'Untitled document',
        description: description.trim() || undefined,
        file: file ?? undefined,
      }
      const result = await props.onUpload(payload)
      if (result?.success) {
        setTitle('')
        setDescription('')
        setFile(null)
        setMessage('Document created successfully.')
        if (props?.onUploadSuccess) {
          props.onUploadSuccess(result.data || payload)
        }
      } else {
        setMessage(result?.error || 'Upload failed.')
      }
    } catch {
      setMessage('Upload failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900">Upload Document</h3>
      <p className="mt-1 text-sm text-gray-600">Add files and create document records in the new backend.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Document title"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
        />
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="mt-3 min-h-[88px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={isSubmitting}
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Uploading...' : 'Upload'}
        </button>
        {message ? <p className="text-sm text-gray-600">{message}</p> : null}
      </div>
    </div>
  )
}

export function DocumentsExplorer(props: AnyProps) {
  const docs = Array.isArray(props?.initialDocuments) ? props.initialDocuments : []
  const totalSize = docs.reduce((acc: number, doc: Record<string, unknown>) => acc + Number(doc.file_size || 0), 0)
  const formatBytes = (value: number) => {
    if (!value) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    let size = value
    let i = 0
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024
      i += 1
    }
    return `${size.toFixed(size >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900">Documents</h3>
      <p className="mt-1 text-xs text-gray-500">
        {docs.length} file{docs.length === 1 ? '' : 's'} - {formatBytes(totalSize)}
      </p>
      {docs.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">No documents found.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {docs.map((doc: Record<string, unknown>) => (
            <div key={String(doc.id || Math.random())} className="rounded-md border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{String(doc.title || 'Untitled')}</p>
                  <p className="mt-1 truncate text-xs text-gray-500">{String(doc.file_name || doc.fileName || '')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{String(doc.file_type || 'text').toUpperCase()}</p>
                  <p className="text-xs text-gray-500">{formatBytes(Number(doc.file_size || 0))}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function Card({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-gray-200 bg-white ${className}`}>{children}</div>
}

export function CardHeader({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <div className={`p-4 ${className}`}>{children}</div>
}

export function CardTitle({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <h3 className={`text-base font-semibold ${className}`}>{children}</h3>
}

export function CardDescription({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <p className={`text-sm text-gray-500 ${className}`}>{children}</p>
}

export function CardContent({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <div className={`p-4 pt-0 ${className}`}>{children}</div>
}

export function Button({ children, className = '', ...props }: AnyProps) {
  return (
    <button {...props} className={`rounded-md bg-gray-900 px-3 py-2 text-sm text-white hover:bg-gray-800 ${className}`}>
      {children}
    </button>
  )
}

export function BarChart(_props: AnyProps) { return <Placeholder /> }
export function LineChart(_props: AnyProps) { return <Placeholder /> }
export function HorizontalBarChart(_props: AnyProps) { return <Placeholder /> }
