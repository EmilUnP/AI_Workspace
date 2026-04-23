import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { getTranslations, getMessages } from 'next-intl/server'
import { StudentExamTakeClient } from '@eduator/ui'
import type { StudentExamTakeClientTranslations } from '@eduator/ui'
import { getStudentExamDetail } from '@eduator/core/utils/student-exam-detail'
import { computeExamScore } from '@eduator/core/utils/student-exam-submit'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'

async function getStudentId(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single()
  
  if (!profile?.organization_id) return null
  
  return { studentId: profile.id, organizationId: profile.organization_id }
}

async function submitExam(
  examId: string,
  answers: Record<string, string | string[]>,
  finalExamId?: string | null
) {
  'use server'

  const supabase = await createServerClient()
  const studentData = await getStudentId(supabase)
  if (!studentData) {
    return { success: false, error: 'SESSION_EXPIRED' }
  }

  const score = await computeExamScore(
    supabase,
    examId,
    studentData.studentId,
    studentData.organizationId,
    answers,
    finalExamId ?? null
  )
  const scoreForInsert = typeof score === 'number' ? score : 0

  // final_exam_id in exam_submissions references final_exams.id (not exams.id).
  // Course-run passes the exam id; only set final_exam_id when it exists in final_exams (e.g. calendar).
  let submissionFinalExamId: string | undefined
  if (finalExamId) {
    const { data: fe } = await supabase.from('final_exams').select('id').eq('id', finalExamId).maybeSingle()
    if (fe) submissionFinalExamId = finalExamId
  }

  const { error } = await supabase.from('exam_submissions').insert({
    exam_id: examId,
    student_id: studentData.studentId,
    answers,
    score: scoreForInsert,
    status: 'submitted',
    submitted_at: new Date().toISOString(),
    ...(submissionFinalExamId ? { final_exam_id: submissionFinalExamId } : {}),
  })

  if (error) {
    console.error('Error submitting exam:', error)
    const isAuthError = error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('session')
    return { success: false, error: isAuthError ? 'SESSION_EXPIRED' : 'Failed to submit exam' }
  }

  revalidatePath(`/student/exams/${examId}`)
  revalidatePath('/student/exams')

  return { success: true }
}

export default async function StudentExamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ finalExamId?: string }>
}) {
  const { id: examId } = await params
  const { finalExamId } = await searchParams
  const supabase = await createServerClient()
  const studentData = await getStudentId(supabase)

  if (!studentData) {
    redirect('/auth/login')
  }

  const { studentId, organizationId } = studentData

  if (!organizationId) redirect('/auth/access-denied')

  const [exam, t, messages] = await Promise.all([
    getStudentExamDetail(supabase, examId, studentId, organizationId, finalExamId ?? null),
    getTranslations('studentExamTake'),
    getMessages(),
  ])

  if (!exam) {
    console.error('Exam not found or student not enrolled:', { examId, studentId, organizationId })
    return notFound()
  }

  const examTakeMsg = (messages as Record<string, unknown>)?.studentExamTake as Record<string, string> | undefined

  const translations: StudentExamTakeClientTranslations = {
    backToExams: t('backToExams'),
    questions: t('questions'),
    minutes: t('minutes'),
    yourProgress: t('yourProgress'),
    takenExamTimes: t('takenExamTimes'),
    time: t('time'),
    times: t('times'),
    youCanRetake: t('youCanRetake'),
    viewLastResults: t('viewLastResults'),
    availableLanguages: t('availableLanguages'),
    selectPreferredLanguage: t('selectPreferredLanguage'),
    original: t('original'),
    startExam: t('startExam'),
    questionOf: typeof examTakeMsg?.questionOf === 'string' ? examTakeMsg.questionOf : 'Question {current} of {total}',
    answered: t('answered'),
    questionNavigation: t('questionNavigation'),
    enterAnswerPlaceholder: t('enterAnswerPlaceholder'),
    hint: t('hint'),
    previous: t('previous'),
    navigate: t('navigate'),
    next: t('next'),
    questionsAnswered: typeof examTakeMsg?.questionsAnswered === 'string' ? examTakeMsg.questionsAnswered : '{answered} of {total} questions answered',
    submitting: t('submitting'),
    submitExam: t('submitExam'),
    sessionExpiredMessage: t('sessionExpiredMessage'),
    signInAgain: t('signInAgain'),
    failedToSubmit: t('failedToSubmit'),
    trueLabel: t('trueLabel'),
    falseLabel: t('falseLabel'),
    finalExamForTitle: typeof examTakeMsg?.finalExamForTitle === 'string' ? examTakeMsg.finalExamForTitle : undefined,
    examPassingMessage: t('examPassingMessage'),
    questionTypeMultipleChoice: t('questionTypeMultipleChoice'),
    questionTypeTrueFalse: t('questionTypeTrueFalse'),
    questionTypeMultipleSelect: t('questionTypeMultipleSelect'),
    questionTypeFillBlank: t('questionTypeFillBlank'),
  }

  return (
    <StudentExamTakeClient
      exam={exam}
      onSubmitExam={submitExam}
      finalExamId={finalExamId ?? null}
      translations={translations}
    />
  )
}
