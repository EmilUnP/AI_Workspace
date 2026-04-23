'use client'

import { CoursesList } from '@eduator/ui/components/courses/courses-list'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { BookOpen, Search, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toggleCoursePublished, deleteCourse } from './actions'

interface CoursesListWrapperProps {
  courses: Array<{
    id: string
    title: string
    description?: string | null
    total_lessons: number
    access_code: string
    difficulty_level?: string | null
    is_published: boolean
    language?: string | null
    metadata?: { final_exam_id?: string } | null
  }>
}

export function CoursesListWrapper({ courses }: CoursesListWrapperProps) {
  type Course = CoursesListWrapperProps['courses'][number]
  const t = useTranslations('teacherCourses')

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_class' | 'unused'>('all')
  const [sortBy, setSortBy] = useState<'title_asc' | 'lessons_desc'>('title_asc')

  const stats = useMemo(() => {
    const total = courses.length
    const inClass = courses.filter((c) => c.is_published).length
    const unused = total - inClass
    const lessons = courses.reduce((sum, c) => sum + (c.total_lessons || 0), 0)
    return { total, inClass, unused, lessons }
  }, [courses])

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase()

    let list: Course[] = courses

    if (statusFilter === 'in_class') list = list.filter((c) => c.is_published)
    if (statusFilter === 'unused') list = list.filter((c) => !c.is_published)

    if (q) {
      list = list.filter((c) => {
        const haystack = `${c.title} ${c.description ?? ''} ${c.access_code}`.toLowerCase()
        return haystack.includes(q)
      })
    }

    if (sortBy === 'title_asc') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title))
    } else if (sortBy === 'lessons_desc') {
      list = [...list].sort((a, b) => (b.total_lessons || 0) - (a.total_lessons || 0))
    }

    return list
  }, [courses, query, sortBy, statusFilter])

  return (
    <div className="space-y-5">
      {/* Overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-gray-500">{t('totalCourses')}</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50/60 p-4 shadow-sm">
          <div className="text-xs font-medium text-green-700">{t('inClass')}</div>
          <div className="mt-1 text-2xl font-bold text-green-800">{stats.inClass}</div>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50/60 p-4 shadow-sm">
          <div className="text-xs font-medium text-yellow-700">{t('unused')}</div>
          <div className="mt-1 text-2xl font-bold text-yellow-800">{stats.unused}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm">
          <div className="text-xs font-medium text-blue-700">{t('totalLessons')}</div>
          <div className="mt-1 text-2xl font-bold text-blue-800">{stats.lessons}</div>
        </div>
      </div>

      {/* Controls */}
      {courses.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t('all')}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('in_class')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === 'in_class'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t('inClass')}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('unused')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === 'unused'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t('unused')}
                </button>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              >
                <option value="title_asc">{t('sortTitleAZ')}</option>
                <option value="lessons_desc">{t('sortLessonsHigh')}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {courses.length === 0 ? (
        <CoursesList
          courses={courses}
          onTogglePublished={async (courseId, isPublished) => {
            const result = await toggleCoursePublished(courseId, isPublished)
            return { success: !!result.success, error: result.error }
          }}
          onDelete={async (courseId) => {
            const result = await deleteCourse(courseId)
            return { success: !!result.success, error: result.error }
          }}
          labels={{
            noCoursesYet: t('noCoursesYet'),
            createFirstHint: t('createFirstHint'),
            createFirstCourse: t('createFirstCourse'),
            viewCourse: t('viewCourse'),
            editCourse: t('editCourse'),
            deleteCourse: t('deleteCourse'),
            publish: t('publish'),
            unpublish: t('unpublish'),
            deleteConfirmTitle: t('deleteConfirmTitle'),
            deleteConfirmWithContent: t('deleteConfirmWithContent', { lessons: '{lessons}', finalExam: '{finalExam}' }),
            deleteConfirmEmpty: t('deleteConfirmEmpty'),
            oneFinalExam: t('oneFinalExam'),
            noFinalExam: t('noFinalExam'),
            cancel: t('cancel'),
            deleting: t('deleting'),
            lessonsCount: t('lessonsCount', { count: '{count}' }),
            code: t('code'),
            inClass: t('inClass'),
            unused: t('unused'),
            grade1: t('grade1'),
            grade2: t('grade2'),
            grade3: t('grade3'),
            grade4: t('grade4'),
            grade5: t('grade5'),
            grade6: t('grade6'),
            grade7: t('grade7'),
            grade8: t('grade8'),
            grade9: t('grade9'),
            grade10: t('grade10'),
            grade11: t('grade11'),
            grade12: t('grade12'),
            undergraduate: t('undergraduate'),
            graduate: t('graduate'),
            phd: t('phd'),
          }}
        />
      ) : filteredCourses.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">{t('noMatching')}</h3>
          <p className="mt-2 text-sm text-gray-500">
            {t('noMatchingHint')}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setStatusFilter('all')
                setSortBy('title_asc')
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t('clear')}
            </button>
            <Link
              href="/teacher/courses/create"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              {t('createCourse')}
            </Link>
          </div>
        </div>
      ) : (
        <CoursesList
          courses={filteredCourses}
          onTogglePublished={async (courseId, isPublished) => {
            const result = await toggleCoursePublished(courseId, isPublished)
            return { success: !!result.success, error: result.error }
          }}
          onDelete={async (courseId) => {
            const result = await deleteCourse(courseId)
            return { success: !!result.success, error: result.error }
          }}
          labels={{
            noCoursesYet: t('noCoursesYet'),
            createFirstHint: t('createFirstHint'),
            createFirstCourse: t('createFirstCourse'),
            viewCourse: t('viewCourse'),
            editCourse: t('editCourse'),
            deleteCourse: t('deleteCourse'),
            publish: t('publish'),
            unpublish: t('unpublish'),
            deleteConfirmTitle: t('deleteConfirmTitle'),
            deleteConfirmWithContent: t('deleteConfirmWithContent', { lessons: '{lessons}', finalExam: '{finalExam}' }),
            deleteConfirmEmpty: t('deleteConfirmEmpty'),
            oneFinalExam: t('oneFinalExam'),
            noFinalExam: t('noFinalExam'),
            cancel: t('cancel'),
            deleting: t('deleting'),
            lessonsCount: t('lessonsCount', { count: '{count}' }),
            code: t('code'),
            inClass: t('inClass'),
            unused: t('unused'),
            grade1: t('grade1'),
            grade2: t('grade2'),
            grade3: t('grade3'),
            grade4: t('grade4'),
            grade5: t('grade5'),
            grade6: t('grade6'),
            grade7: t('grade7'),
            grade8: t('grade8'),
            grade9: t('grade9'),
            grade10: t('grade10'),
            grade11: t('grade11'),
            grade12: t('grade12'),
            undergraduate: t('undergraduate'),
            graduate: t('graduate'),
            phd: t('phd'),
          }}
        />
      )}
    </div>
  )
}
