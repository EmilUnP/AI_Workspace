import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, ArrowLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getTeacherCourses } from './actions'
import { CoursesListWrapper } from './courses-list-wrapper'

export const dynamic = 'force-dynamic'

export default async function TeacherCoursesPage() {
  const [result, t] = await Promise.all([
    getTeacherCourses(),
    getTranslations('teacherCourses'),
  ])
  
  if (result.error) {
    redirect('/auth/login')
  }
  
  const courses = result.courses || []

  return (
    <div className="space-y-6">
      {/* Breadcrumb / Back to Teaching Studio */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/teacher/teaching-studio"
          className="inline-flex items-center gap-2 text-xs font-medium text-blue-700 hover:text-blue-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t('breadcrumb')}</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-gray-500">
            {t('subtitle')}
          </p>
        </div>
        
        <Link
          href="/teacher/courses/create"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          {t('createNew')}
        </Link>
      </div>

      {/* Courses List */}
      <CoursesListWrapper courses={courses} />
    </div>
  )
}
