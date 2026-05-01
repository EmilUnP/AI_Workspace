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
import { normalizeExamQuestionsForUi } from '@/lib/eduator-exam-normalize-shim'

type AuthUser = { id: string }
type ProfileRow = { id: string; organization_id: string | null }
type AnyQuestion = Record<string, unknown>
type ExamRow = {
  id: string
  created_by: string
  title: string
  description?: string | null
  language?: string | null
  translations?: Record<string, unknown> | null
  questions?: AnyQuestion[] | null
  is_published?: boolean | null
  duration_minutes?: number | null
  created_at: string
  classInfo?: { name?: string | null; class_code?: string | null } | null
}

type UiQuestion = {
  id: string
  type: 'multiple_choice' | 'true_false' | 'multiple_select' | 'fill_blank'
  text: string
  options: string[]
  correctAnswer: string | string[]
  points: number
  explanation?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  topics?: string[]
}

async function getTeacherInfo() {
  const supabase = await createClient()
  const authUser = (await supabase.auth.getUser()).data.user as AuthUser | null
  if (!authUser) return null
  
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', authUser.id)
    .single()
  const profile = profileData as ProfileRow | null
  
  if (!profile?.organization_id) return null
  
  return { teacherId: profile.id, organizationId: profile.organization_id }
}

async function getExam(examId: string, teacherId: string) {
  const supabase = await createClient()
  
  const { data: examData, error } = await supabase
    .from('exams')
    .select('*')
    .eq('id', examId)
    .eq('created_by', teacherId)
    .single()
  const exam = examData as ExamRow | null
  
  if (error || !exam) {
    return null
  }

  return exam
}

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ fromCourse?: string; fromRun?: string }>
}

export default async function ExamDetailPage({ params, searchParams }: PageProps) {
  const { id: examId } = await params
  const { fromCourse: _fromCourse, fromRun: _fromRun } = await searchParams
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

  const questions: UiQuestion[] = normalizeExamQuestionsForUi((exam.questions ?? []) as AnyQuestion[]).map((q) => ({
    id: String(q.id ?? ''),
    type: (q.type as UiQuestion['type']) ?? 'multiple_choice',
    text: String(q.text ?? ''),
    options: Array.isArray(q.options) ? (q.options as unknown[]).map((item) => String(item)) : [],
    correctAnswer: Array.isArray(q.correctAnswer)
      ? (q.correctAnswer as unknown[]).map((item) => String(item))
      : String(q.correctAnswer ?? ''),
    points: 1,
    explanation: typeof q.explanation === 'string' ? q.explanation : undefined,
    difficulty: q.difficulty as UiQuestion['difficulty'],
    topics: Array.isArray(q.topics) ? (q.topics as unknown[]).map((item) => String(item)) : [],
  }))

  const primaryLanguage = exam.language || 'en'
  const translationsRaw = (exam.translations || {}) as Record<string, unknown>
  const translations = Object.fromEntries(
    Object.entries(translationsRaw).map(([lang, qs]) => [
      lang,
      normalizeExamQuestionsForUi((Array.isArray(qs) ? qs : []) as AnyQuestion[]).map((q) => ({
        id: String(q.id ?? ''),
        type: (q.type as UiQuestion['type']) ?? 'multiple_choice',
        text: String(q.text ?? ''),
        options: Array.isArray(q.options) ? (q.options as unknown[]).map((item) => String(item)) : [],
        correctAnswer: Array.isArray(q.correctAnswer)
          ? (q.correctAnswer as unknown[]).map((item) => String(item))
          : String(q.correctAnswer ?? ''),
        points: 1,
        explanation: typeof q.explanation === 'string' ? q.explanation : undefined,
        difficulty: q.difficulty as UiQuestion['difficulty'],
        topics: Array.isArray(q.topics) ? (q.topics as unknown[]).map((item) => String(item)) : [],
      })),
    ])
  ) as Record<string, UiQuestion[]>

  const backHref = '/school-admin/exams'
  const backLabel = t('backToExams')

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
              <ExamActions examId={exam.id} isPublished={Boolean(exam.is_published)} />
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

