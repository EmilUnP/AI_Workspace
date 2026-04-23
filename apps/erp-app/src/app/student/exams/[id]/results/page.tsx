import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { getTranslations, getMessages } from 'next-intl/server'
import { StudentExamResultsClient } from '@eduator/ui'
import type { StudentExamResultsClientTranslations } from '@eduator/ui'
import { getStudentExamResults } from '@eduator/core/utils/student-exam-results'

async function getStudentId() {
  const supabase = await createServerClient()
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

export default async function StudentExamResultsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: examId } = await params
  const studentData = await getStudentId()
  
  if (!studentData) {
    redirect('/auth/login')
  }
  
  const { studentId, organizationId } = studentData

  const [supabase, t, messages] = await Promise.all([
    createServerClient(),
    getTranslations('studentExamResults'),
    getMessages(),
  ])
  const resultsMsg = (messages as Record<string, unknown>)?.studentExamResults as Record<string, string> | undefined
  const results = await getStudentExamResults(supabase, examId, studentId, organizationId)
  
  if (!results) {
    return notFound()
  }

  const translations: StudentExamResultsClientTranslations = {
    backToExams: t('backToExams'),
    submittedMessage: t('submittedMessage'),
    resultsNotAvailable: t('resultsNotAvailable'),
    teacherWillShareResults: t('teacherWillShareResults'),
    submittedOn: t('submittedOn'),
    correct: t('correct'),
    viewCertificateDownload: t('viewCertificateDownload'),
    incorrect: t('incorrect'),
    unanswered: t('unanswered'),
    total: t('total'),
    questionReview: t('questionReview'),
    reviewCorrectSolutions: t('reviewCorrectSolutions'),
    correctOnlyShown: t('correctOnlyShown'),
    reviewNoCorrectShown: t('reviewNoCorrectShown'),
    question: t('question'),
    correctAnswer: t('correctAnswer'),
    yourAnswer: t('yourAnswer'),
    explanation: t('explanation'),
    noAnswerProvided: t('noAnswerProvided'),
    trueLabel: t('trueLabel'),
    falseLabel: t('falseLabel'),
    finalExamForTitle: typeof resultsMsg?.finalExamForTitle === 'string' ? resultsMsg.finalExamForTitle : undefined,
    examPassingMessage: t('examPassingMessage'),
    questionTypeMultipleChoice: t('questionTypeMultipleChoice'),
    questionTypeTrueFalse: t('questionTypeTrueFalse'),
    questionTypeMultipleSelect: t('questionTypeMultipleSelect'),
    questionTypeFillBlank: t('questionTypeFillBlank'),
  }

  return <StudentExamResultsClient results={results} translations={translations} />
}
