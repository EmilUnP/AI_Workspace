import { createClient } from '@eduator/auth/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getTranslations, getLocale } from 'next-intl/server'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Clock, 
  FileText, 
  CheckCircle, 
  Award,
  Calendar,
  BookOpen
} from 'lucide-react'
import { ExamActions } from './exam-actions'
import { ExportExamCsvButton } from './export-exam-csv-button'
import { ExamLanguageSelector } from './exam-language-selector'
import { normalizeExamQuestionsForUi } from '@eduator/core/utils/exam-question-normalize'

async function getTeacherInfo() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single()
  
  if (!profile?.organization_id) return null
  
  return { teacherId: profile.id, organizationId: profile.organization_id }
}

async function getExam(examId: string, teacherId: string) {
  const supabase = await createClient()
  
  const { data: exam, error } = await supabase
    .from('exams')
    .select('*')
    .eq('id', examId)
    .eq('created_by', teacherId)
    .single()
  
  if (error || !exam) {
    return null
  }

  // Get class info if assigned
  let classInfo = null
  if (exam.class_id) {
    const { data: cls } = await supabase
      .from('classes')
      .select('id, name, class_code')
      .eq('id', exam.class_id)
      .single()
    classInfo = cls
  }

  return { ...exam, classInfo }
}

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ fromCourse?: string; fromRun?: string }>
}

export default async function ExamDetailPage({ params, searchParams }: PageProps) {
  const { id: examId } = await params
  const { fromCourse, fromRun } = await searchParams
  const teacherData = await getTeacherInfo()
  
  if (!teacherData) {
    redirect('/auth/login')
  }
  
  const [exam, t, locale] = await Promise.all([
    getExam(examId, teacherData.teacherId),
    getTranslations('teacherExams'),
    getLocale(),
  ])
  
  if (!exam) {
    notFound()
  }

  const questions = normalizeExamQuestionsForUi(exam.questions).map((q) => ({
    id: q.id,
    type: q.type as 'multiple_choice' | 'true_false' | 'multiple_select' | 'fill_blank',
    text: q.text,
    options: q.options,
    correctAnswer: q.correctAnswer,
    points: 1,
    explanation: q.explanation,
    difficulty: q.difficulty as 'easy' | 'medium' | 'hard' | undefined,
    topics: q.topics,
  }))

  const primaryLanguage = exam.language || 'en'
  const translationsRaw = (exam.translations || {}) as Record<string, unknown>
  const translations = Object.fromEntries(
    Object.entries(translationsRaw).map(([lang, qs]) => [
      lang,
      normalizeExamQuestionsForUi(qs).map((q) => ({
        id: q.id,
        type: q.type as 'multiple_choice' | 'true_false' | 'multiple_select' | 'fill_blank',
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: 1,
        explanation: q.explanation,
        difficulty: q.difficulty as 'easy' | 'medium' | 'hard' | undefined,
        topics: q.topics,
      })),
    ])
  ) as Record<string, typeof questions>

  const backHref = fromCourse
    ? fromRun === '1'
      ? `/teacher/courses/${fromCourse}/run`
      : `/teacher/courses/${fromCourse}`
    : '/teacher/exams'
  const backLabel = fromCourse ? t('backToCourse') : t('backToExams')

  return (
    <div className="space-y-6 sm:space-y-8">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className={`px-6 py-6 sm:px-8 sm:py-7 ${exam.is_published ? 'bg-emerald-50/80 ring-1 ring-emerald-100' : 'bg-gray-50/80 ring-1 ring-gray-100'}`}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">{exam.title}</h1>
                {exam.is_published ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200/50">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {t('inClass')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200/50">
                    <Clock className="h-3.5 w-3.5" />
                    {t('unused')}
                  </span>
                )}
              </div>
              {exam.description && (
                <p className="mt-2 max-w-2xl text-sm text-gray-600">{exam.description}</p>
              )}
              {exam.classInfo && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                  <BookOpen className="h-4 w-4 text-gray-400" />
                  <span>{exam.classInfo.name}</span>
                  {exam.classInfo.class_code && (
                    <span className="text-gray-400">({exam.classInfo.class_code})</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ExportExamCsvButton
                questions={questions}
                examTitle={exam.title}
                languageCode={primaryLanguage}
              />
              <ExamActions examId={exam.id} isPublished={exam.is_published} fromCourse={fromCourse} fromRun={fromRun} />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-white px-6 py-4 sm:px-8">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 ring-1 ring-violet-200/50">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{exam.duration_minutes || 60}</p>
                <p className="text-xs text-gray-500">{t('minutesLabel')}</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>
                {t('createdLabel')} {new Date(exam.created_at).toLocaleDateString(locale, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Language Selector & Questions */}
      <ExamLanguageSelector 
        examId={exam.id}
        examTitle={exam.title}
        primaryLanguage={primaryLanguage}
        questions={questions}
        translations={translations}
      />
    </div>
  )
}
