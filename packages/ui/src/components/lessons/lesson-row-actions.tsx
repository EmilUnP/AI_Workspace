'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Eye, 
  Trash2, 
  Loader2,
  AlertTriangle,
  X,
} from 'lucide-react'

export interface LessonRowActionsLabels {
  viewLessonTitle?: string
  deleteLessonTitle?: string
  deleteConfirmTitle?: string
  deleteConfirmMessage?: string
  cancel?: string
  deleting?: string
}

export interface LessonRowActionsProps {
  lessonId: string
  isPublished: boolean
  lessonDetailPath?: string
  onDeleteLesson: (lessonId: string) => Promise<{ error?: string; success?: boolean }>
  labels?: LessonRowActionsLabels
}

const DEFAULT_ROW_ACTION_LABELS: LessonRowActionsLabels = {
  viewLessonTitle: 'View Lesson',
  deleteLessonTitle: 'Delete Lesson',
  deleteConfirmTitle: 'Delete Lesson',
  deleteConfirmMessage: 'Are you sure you want to delete this lesson?',
  cancel: 'Cancel',
  deleting: 'Deleting...',
}

export function LessonRowActions({ 
  lessonId, 
  lessonDetailPath = `/teacher/lessons/${lessonId}`,
  onDeleteLesson,
  labels = {},
}: LessonRowActionsProps) {
  const L = { ...DEFAULT_ROW_ACTION_LABELS, ...labels }
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [actionType, setActionType] = useState<'delete' | null>(null)

  const handleDelete = () => {
    setActionType('delete')
    startTransition(async () => {
      const result = await onDeleteLesson(lessonId)
      if (result.success) {
        setShowDeleteConfirm(false)
        router.refresh()
      }
      setActionType(null)
    })
  }

  return (
    <>
      <div className="flex items-center gap-1">
        {/* View */}
        <Link
          href={lessonDetailPath}
          className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          title={L.viewLessonTitle}
        >
          <Eye className="h-4 w-4" />
        </Link>

        {/* Delete */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isPending}
          className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
          title={L.deleteLessonTitle}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isPending && setShowDeleteConfirm(false)} 
          />
          
          {/* Dialog Container */}
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="relative w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Close Button */}
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isPending}
                  className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 z-10"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Content */}
                <div className="p-6 sm:p-8">
                  {/* Icon */}
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mb-5">
                    <AlertTriangle className="h-8 w-8" />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                    {L.deleteConfirmTitle}
                  </h3>

                  {/* Message */}
                  <p className="text-gray-600 text-center text-sm sm:text-base leading-relaxed">
                    {L.deleteConfirmMessage}
                  </p>
                </div>

                {/* Actions */}
                <div className="bg-gray-50 px-6 py-4 sm:px-8 flex flex-col-reverse sm:flex-row gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isPending}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors disabled:opacity-50"
                  >
                    {L.cancel}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-70"
                  >
                    {isPending && actionType === 'delete' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{L.deleting}</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        <span>{L.deleteConfirmTitle}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
