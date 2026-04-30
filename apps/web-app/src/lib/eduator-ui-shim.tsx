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

export function PaginationFooter() {
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
export function ExamCreator() { return null }

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
