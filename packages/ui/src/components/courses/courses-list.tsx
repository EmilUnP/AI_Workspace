'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, BookOpen, Key, Eye, Pencil, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LANGUAGES_WITH_FLAGS, LANGUAGE_TO_COUNTRY_CODE, SUPPORTED_LANGUAGES } from '@eduator/config/constants'

interface Course {
  id: string
  title: string
  description?: string | null
  total_lessons: number
  access_code: string
  difficulty_level?: string | null
  is_published: boolean
  language?: string | null
  metadata?: { final_exam_id?: string } | null
}

export interface CoursesListLabels {
  noCoursesYet?: string
  createFirstHint?: string
  createFirstCourse?: string
  viewCourse?: string
  editCourse?: string
  deleteCourse?: string
  publish?: string
  unpublish?: string
  deleteConfirmTitle?: string
  deleteConfirmWithContent?: string
  deleteConfirmEmpty?: string
  oneFinalExam?: string
  noFinalExam?: string
  cancel?: string
  deleting?: string
  lessonsCount?: string
  code?: string
  inClass?: string
  unused?: string
  /** Optional grade/difficulty labels (e.g. grade1, grade2, ... grade12, undergraduate, graduate, phd) */
  grade1?: string
  grade2?: string
  grade3?: string
  grade4?: string
  grade5?: string
  grade6?: string
  grade7?: string
  grade8?: string
  grade9?: string
  grade10?: string
  grade11?: string
  grade12?: string
  undergraduate?: string
  graduate?: string
  phd?: string
}

export interface CoursesListProps {
  courses: Course[]
  basePath?: string
  onTogglePublished?: (courseId: string, isPublished: boolean) => Promise<{ success: boolean; error?: string }>
  onDelete?: (courseId: string) => Promise<{ success: boolean; error?: string }>
  labels?: CoursesListLabels
}

const DEFAULT_LIST_LABELS: CoursesListLabels = {
  noCoursesYet: 'No courses yet',
  createFirstHint: 'Create your first self-paced course using AI',
  createFirstCourse: 'Create Your First Course',
  viewCourse: 'View Course',
  editCourse: 'Edit Course',
  deleteCourse: 'Delete Course',
  publish: 'Publish',
  unpublish: 'Unpublish',
  deleteConfirmTitle: 'Delete Course',
  deleteConfirmWithContent: 'This course has {lessons} lesson(s) and {finalExam}. Deleting will remove the course and all of them from your list. This cannot be undone.',
  deleteConfirmEmpty: 'Are you sure you want to delete this course? This action cannot be undone. The course will be archived and hidden from your course list.',
  oneFinalExam: '1 final exam',
  noFinalExam: 'no final exam',
  cancel: 'Cancel',
  deleting: 'Deleting...',
  lessonsCount: '{count} lessons',
  code: 'Code:',
  inClass: 'In Class',
  unused: 'Unused',
}

export function CoursesList({ 
  courses, 
  basePath = '/teacher/courses',
  onTogglePublished,
  onDelete,
  labels = {},
}: CoursesListProps) {
  const L = { ...DEFAULT_LIST_LABELS, ...labels }

  const getDifficultyLabel = (level: string): string => {
    const key = level.replace(/^grade_/, 'grade').replace(/_/g, '') as keyof CoursesListLabels
    const label = L[key]
    if (typeof label === 'string') return label
    return level.replace(/_/g, ' ')
  }

  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingCourseId, setPendingCourseId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'publish' | 'delete' | null>(null)

  const getLanguageDisplay = (language?: string | null) => {
    if (!language) return null

    const languageKey = language.trim().toLowerCase()

    const resolvedLanguageCode =
      SUPPORTED_LANGUAGES.find(
        (l) => l.code === languageKey || l.name.toLowerCase() === languageKey
      )?.code ??
      LANGUAGES_WITH_FLAGS.find(
        (l) => l.code === languageKey || l.name.toLowerCase() === languageKey
      )?.code ??
      languageKey

    const languageInfo = LANGUAGES_WITH_FLAGS.find((l) => l.code === resolvedLanguageCode)
    const countryCode =
      languageInfo?.countryCode ??
      LANGUAGE_TO_COUNTRY_CODE[resolvedLanguageCode] ??
      'un'

    return {
      countryCode: countryCode.toLowerCase(),
      label: languageInfo?.name ?? language,
    }
  }

  const handleTogglePublish = (courseId: string, currentStatus: boolean) => {
    if (!onTogglePublished) return
    
    setPendingCourseId(courseId)
    setActionType('publish')
    startTransition(async () => {
      const result = await onTogglePublished(courseId, !currentStatus)
      if (result.success) {
        router.refresh()
      }
      setPendingCourseId(null)
      setActionType(null)
    })
  }

  const handleDelete = (courseId: string) => {
    if (!onDelete) return
    
    setPendingCourseId(courseId)
    setActionType('delete')
    startTransition(async () => {
      const result = await onDelete(courseId)
      if (result.success) {
        setShowDeleteConfirm(null)
        router.refresh()
      } else {
        setShowDeleteConfirm(null)
        if (result.error) {
          if (typeof window !== 'undefined' && window.alert) window.alert(result.error)
        }
      }
      setPendingCourseId(null)
      setActionType(null)
    })
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {courses.length === 0 ? (
        <div className="p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">{L.noCoursesYet}</h3>
          <p className="mt-2 text-sm text-gray-500">
            {L.createFirstHint}
          </p>
          <div className="mt-6">
            <Link
              href={`${basePath}/create`}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              <Sparkles className="h-4 w-4" />
              {L.createFirstCourse}
            </Link>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {courses.map((course) => (
            <div key={course.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{course.title}</h3>
                    {course.is_published ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                        {L.inClass ?? 'In Class'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700">
                        {L.unused ?? 'Unused'}
                      </span>
                    )}
                  </div>
                  {course.description && (
                    <p className="text-sm text-gray-600 mb-3">{course.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {L.lessonsCount?.replace('{count}', String(course.total_lessons || 0))}
                    </span>
                    <span className="flex items-center gap-1">
                      <Key className="h-4 w-4" />
                      {L.code} <span className="font-mono font-semibold text-blue-600">{course.access_code}</span>
                    </span>
                    {course.difficulty_level && (
                      <span className="capitalize">{getDifficultyLabel(course.difficulty_level)}</span>
                    )}
                    {course.language && (() => {
                      const languageDisplay = getLanguageDisplay(course.language)
                      if (!languageDisplay) return null

                      return (
                        <span className="flex items-center gap-1.5">
                          <Image
                            src={`https://flagcdn.com/w40/${languageDisplay.countryCode}.png`}
                            alt={languageDisplay.label}
                            width={20}
                            height={15}
                            className="rounded-sm object-cover flex-shrink-0"
                            unoptimized
                          />
                          <span className="text-xs text-gray-500">
                            {languageDisplay.label}
                          </span>
                        </span>
                      )
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* View */}
                  <Link
                    href={`${basePath}/${course.id}`}
                    className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    title={L.viewCourse}
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  
                  {/* Edit */}
                  <Link
                    href={`${basePath}/${course.id}/edit`}
                    className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    title={L.editCourse}
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  
                  {/* Publish/Unpublish */}
                  {onTogglePublished && (
                    <button
                      onClick={() => handleTogglePublish(course.id, course.is_published)}
                      disabled={isPending && pendingCourseId === course.id}
                      className={`rounded-lg p-2 transition-colors disabled:opacity-50 ${
                        course.is_published
                          ? 'text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700'
                          : 'text-green-600 hover:bg-green-50 hover:text-green-700'
                      }`}
                      title={course.is_published ? (L.unpublish ?? 'Unpublish') : (L.publish ?? 'Publish')}
                    >
                      {isPending && pendingCourseId === course.id && actionType === 'publish' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : course.is_published ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  
                  {/* Delete */}
                  {onDelete && (
                    <button
                      onClick={() => setShowDeleteConfirm(course.id)}
                      disabled={isPending && pendingCourseId === course.id}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                      title={L.deleteCourse}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && onDelete && (() => {
        const courseToDelete = courses.find((c) => c.id === showDeleteConfirm)
        const lessonCount = courseToDelete?.total_lessons ?? 0
        const hasFinalExam = !!(courseToDelete?.metadata as { final_exam_id?: string } | undefined)?.final_exam_id
        return (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isPending && setShowDeleteConfirm(null)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {L.deleteConfirmTitle}
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {lessonCount > 0 || hasFinalExam
                  ? L.deleteConfirmWithContent!
                      .replace('{lessons}', String(lessonCount))
                      .replace('{finalExam}', hasFinalExam ? (L.oneFinalExam ?? '1 final exam') : (L.noFinalExam ?? 'no final exam'))
                  : L.deleteConfirmEmpty}
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(null)
                    setActionType(null)
                  }}
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {L.cancel}
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
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
        )
      })()}
    </div>
  )
}
