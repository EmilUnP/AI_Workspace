'use client'

import { useRouter } from 'next/navigation'
import { useTransition, useState } from 'react'
import { Pencil, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { toggleCoursePublished, deleteCourse } from '../actions'

export interface CourseActionsLabels {
  edit?: string
  delete?: string
  editCourseTitle?: string
  deleteCourseTitle?: string
  publish?: string
  unpublish?: string
  publishCourse?: string
  unpublishCourse?: string
  deleteConfirmTitle?: string
  deleteConfirmWithContent?: string
  deleteConfirmEmpty?: string
  oneFinalExam?: string
  noFinalExam?: string
  cancel?: string
  deleting?: string
}

interface CourseActionsProps {
  courseId: string
  isPublished: boolean
  totalLessons?: number
  hasFinalExam?: boolean
  labels?: CourseActionsLabels
}

const DEFAULT_LABELS: CourseActionsLabels = {
  edit: 'Edit',
  delete: 'Delete',
  editCourseTitle: 'Edit Course',
  deleteCourseTitle: 'Delete Course',
  publish: 'Publish',
  unpublish: 'Unpublish',
  publishCourse: 'Publish Course',
  unpublishCourse: 'Unpublish Course',
  deleteConfirmTitle: 'Delete Course',
  deleteConfirmWithContent: 'This course has {lessons} lesson(s) and {finalExam}. Deleting will remove the course and all of them from your list. This cannot be undone.',
  deleteConfirmEmpty: 'Are you sure you want to delete this course? This action cannot be undone. The course will be archived and hidden from your course list.',
  oneFinalExam: '1 final exam',
  noFinalExam: 'no final exam',
  cancel: 'Cancel',
  deleting: 'Deleting...',
}

export function CourseActions({ courseId, isPublished, totalLessons = 0, hasFinalExam = false, labels = {} }: CourseActionsProps) {
  const L = { ...DEFAULT_LABELS, ...labels }
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [actionType, setActionType] = useState<'publish' | 'delete' | null>(null)

  const handleTogglePublish = () => {
    setActionType('publish')
    startTransition(async () => {
      const result = await toggleCoursePublished(courseId, !isPublished)
      if (result.success) {
        router.refresh()
      }
      setActionType(null)
    })
  }

  const handleDelete = () => {
    setActionType('delete')
    startTransition(async () => {
      const result = await deleteCourse(courseId)
      if (result.success) {
        router.push('/teacher/courses')
        router.refresh()
      } else {
        if (result.error && typeof window !== 'undefined' && window.alert) {
          window.alert(result.error)
        }
        setActionType(null)
        setShowDeleteConfirm(false)
      }
    })
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => router.push(`/teacher/courses/${courseId}/edit`)}
          disabled={isPending}
          className="inline-flex items-center gap-2 justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 sm:px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50"
          title={L.editCourseTitle}
        >
          <Pencil className="h-4 w-4" />
          <span className="hidden sm:inline">{L.edit}</span>
        </button>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isPending}
          className="inline-flex items-center gap-2 justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 sm:px-4 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
          title={L.deleteCourseTitle}
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">{L.delete}</span>
        </button>

        <button
          onClick={handleTogglePublish}
          disabled={isPending}
          className={`inline-flex items-center gap-2 justify-center rounded-xl border px-3 py-2 sm:px-4 text-sm font-medium transition-colors disabled:opacity-50 ${
            isPublished
              ? 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
              : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
          }`}
          title={isPublished ? L.unpublishCourse : L.publishCourse}
        >
          {isPending && actionType === 'publish' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPublished ? (
            <XCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {isPublished ? L.unpublish : L.publish}
          </span>
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isPending && setShowDeleteConfirm(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {L.deleteConfirmTitle}
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {totalLessons > 0 || hasFinalExam
                  ? L.deleteConfirmWithContent!.replace('{lessons}', String(totalLessons)).replace('{finalExam}', hasFinalExam ? L.oneFinalExam! : L.noFinalExam!)
                  : L.deleteConfirmEmpty}
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setActionType(null)
                  }}
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {L.cancel}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isPending && actionType === 'delete' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {L.deleting}
                    </>
                  ) : (
                    L.deleteConfirmTitle
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
