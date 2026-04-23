import { createClient } from '@eduator/auth/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Question as UiQuestion, QuestionType } from '@eduator/ui'
import { createExam, updateExam } from '../../new/actions'
import { generateExamFromDocuments, translateExam } from '../../new/ai-actions'
import { normalizeExamQuestionsForUi } from '@eduator/core/utils/exam-question-normalize'
import { ExamCreatorWithIntl } from '../../exam-creator-with-intl'

function coerceQuestionType(type: string): QuestionType {
  switch (type) {
    case 'multiple_choice':
    case 'true_false':
    case 'multiple_select':
    case 'fill_blank':
      return type
    default:
      return 'multiple_choice'
  }
}

function toUiQuestions(input: unknown): UiQuestion[] {
  return normalizeExamQuestionsForUi(input).map((q) => ({
    id: q.id,
    type: coerceQuestionType(q.type),
    text: q.text,
    options: q.options,
    correctAnswer: q.correctAnswer,
    points: 1,
    explanation: q.explanation,
    difficulty: q.difficulty as UiQuestion['difficulty'],
    topics: q.topics,
  }))
}

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

async function getTeacherDocuments(teacherId: string, organizationId: string) {
  const supabase = await createClient()
  
  const { data: documents } = await supabase
    .from('documents')
    .select('id, title, file_type, file_name')
    .eq('organization_id', organizationId)
    .eq('created_by', teacherId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
  
  return documents || []
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

  return exam
}

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ fromCourse?: string; fromRun?: string }>
}

export default async function EditExamPage({ params, searchParams }: PageProps) {
  const { id: examId } = await params
  const { fromCourse, fromRun } = await searchParams
  const teacherData = await getTeacherInfo()
  
  if (!teacherData) {
    redirect('/auth/login')
  }
  
  const { teacherId, organizationId } = teacherData
  
  const [exam, documents, t] = await Promise.all([
    getExam(examId, teacherId),
    getTeacherDocuments(teacherId, organizationId),
    getTranslations('teacherExamEdit'),
  ])

  if (!exam) {
    notFound()
  }

  // Prepare initial data for the editor
  const examSettings = (exam.settings || {}) as { show_correct_answers?: boolean; show_explanations?: boolean }
  const initialData = {
    id: exam.id,
    title: exam.title,
    description: exam.description,
    subject: exam.subject,
    grade_level: exam.grade_level,
    duration_minutes: exam.duration_minutes || 60,
    questions: toUiQuestions(exam.questions),
    language: exam.language || 'en',
    translations: Object.fromEntries(
      Object.entries((exam.translations || {}) as Record<string, unknown>).map(([lang, qs]) => [
        lang,
        toUiQuestions(qs),
      ])
    ),
    is_published: exam.is_published,
    settings: {
      show_correct_answers: examSettings.show_correct_answers !== false,
      show_explanations: examSettings.show_explanations !== false,
    },
  }

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

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">{t('title')}</h1>
        <p className="mt-1.5 text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      {/* Exam Creator – translations resolved on client via useTranslations('teacherExamCreator') */}
      <ExamCreatorWithIntl
        organizationId={organizationId}
        documents={documents}
        examId={examId}
        initialData={initialData}
        onCreateExam={createExam}
        onUpdateExam={updateExam}
        onGenerateExam={generateExamFromDocuments}
        onTranslateExam={translateExam}
      />
    </div>
  )
}
