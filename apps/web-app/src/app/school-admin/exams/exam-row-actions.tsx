'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { 
  Eye, 
  Trash2, 
  Loader2,
  AlertTriangle,
  X,
} from 'lucide-react'
import { deleteExam } from './new/actions'

interface ExamRowActionsProps {
  examId: string
  isPublished: boolean
}

export function ExamRowActions({ examId, isPublished: _isPublished }: ExamRowActionsProps) {
  const t = useTranslations('teacherExams')
  const tl = (key: string, fallback: string) => {
    const value = t(key as never)
    return value === key ? fallback : value
  }
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [actionType, setActionType] = useState<'delete' | null>(null)

  const handleDelete = () => {
    setActionType('delete')
    startTransition(async () => {
      const result = await deleteExam(examId)
      if (result.success) {
        setShowDeleteConfirm(false)
        router.refresh()
      }
      setActionType(null)
    })
  }

  return (
    <>
      <div className="flex items-center gap-0.5">
        <Link
          href={`/school-admin/exams/${examId}`}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          title={tl('viewExam', 'View exam')}
        >
          <Eye className="h-4 w-4" />
        </Link>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isPending}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
          title={tl('deleteExam', 'Delete exam')}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => !isPending && setShowDeleteConfirm(false)}
            aria-hidden
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 ring-1 ring-gray-200 sm:p-8">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isPending}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                aria-label={tl('close', 'Close')}
              >
                <X className="h-5 w-5" />
              </button>
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-700 ring-1 ring-gray-200/70">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-gray-900">{tl('deleteExam', 'Delete exam')}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{tl('deleteExamConfirm', 'Are you sure you want to delete this exam?')}</p>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isPending}
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  {tl('cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-70"
                >
                  {isPending && actionType === 'delete' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{tl('deleting', 'Deleting...')}</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>{tl('deleteExam', 'Delete exam')}</span>
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

