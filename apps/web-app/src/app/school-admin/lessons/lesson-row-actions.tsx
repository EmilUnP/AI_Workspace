'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, Trash2, Loader2, AlertTriangle, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface LessonRowActionsProps {
  lessonId: string
}

export function LessonRowActions({ lessonId }: LessonRowActionsProps) {
  const t = useTranslations('teacherLessons')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = () => {
    startTransition(() => {
      router.push(`/school-admin/lessons/delete/${lessonId}`)
    })
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Link
          href={`/school-admin/lessons/${lessonId}`}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          title={t('viewLesson')}
        >
          <Eye className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isPending}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-60"
          title={t('deleteLesson')}
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
                aria-label={t('close')}
              >
                <X className="h-5 w-5" />
              </button>
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-700 ring-1 ring-gray-200/70">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-gray-900">{t('deleteLessonTitle')}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {t('deleteLessonConfirm')}
                </p>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isPending}
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-70"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('deleting')}</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>{t('deleteLesson')}</span>
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
