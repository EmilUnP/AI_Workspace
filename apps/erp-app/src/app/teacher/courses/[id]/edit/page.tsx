import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getCourseById } from '../../actions'
import { CourseEditForm } from './course-edit-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditCoursePage({ params }: PageProps) {
  const { id } = await params
  const [result, t] = await Promise.all([
    getCourseById(id),
    getTranslations('teacherCourseEdit'),
  ])
  
  if (result.error || !result.course) {
    notFound()
  }
  
  const course = result.course
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href={`/teacher/courses/${course.id}`}
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
          </div>
        </div>
        
        <CourseEditForm course={course} labels={{
          courseTitleLabel: t('courseTitleLabel'),
          descriptionLabel: t('descriptionLabel'),
          subjectLabel: t('subjectLabel'),
          gradeLevelLabel: t('gradeLevelLabel'),
          titlePlaceholder: t('titlePlaceholder'),
          descriptionPlaceholder: t('descriptionPlaceholder'),
          subjectPlaceholder: t('subjectPlaceholder'),
          gradeLevelPlaceholder: t('gradeLevelPlaceholder'),
          save: t('save'),
          saving: t('saving'),
          successMessage: t('successMessage'),
          styleSerious: t('styleSerious'),
          styleFun: t('styleFun'),
          cancel: t('cancel'),
          difficultyLevelLabel: t('difficultyLevelLabel'),
          courseStyleLabel: t('courseStyleLabel'),
          languageLabel: t('languageLabel'),
          accessCodeLabel: t('accessCodeLabel'),
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
        }} />
      </div>
    </div>
  )
}
