import { getAccessToken, getCurrentUser } from '@/lib/backend-auth'
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
  const user = await getCurrentUser()
  if (!user) return null
  if (user.role !== 'admin' && user.role !== 'operator') return null
  return { teacherId: user.id, organizationId: 'global' }
}

async function getExam(examId: string, _teacherId: string) {
  const token = await getAccessToken()
  if (!token) return null
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'
  const response = await fetch(`${backendBase}/v1/exams/${examId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!response.ok) return null
  const payload = (await response.json()) as { exam?: ExamRow }
  return payload.exam ?? null
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
  const tl = (key: string, fallback: string) => {
    const value = t(key as never)
    return value === key ? fallback : value
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
  const backLabel = tl('backToExams', 'Back to exams')

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
                    {tl('inClass', 'In class')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200/50">
                    <Clock className="h-3.5 w-3.5" />
                    {tl('unused', 'Unused')}
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
                <p className="text-xs text-gray-500">{tl('minutesLabel', 'minutes')}</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>
                {tl('createdLabel', 'Created')} {new Date(exam.created_at).toLocaleDateString(locale, {
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

