import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations, getMessages } from 'next-intl/server'
import { StudentExamsList } from '@eduator/ui'
import type { StudentExamsListTranslations } from '@eduator/ui'
import { getAvailableExams } from '@eduator/core/utils/student-exams'

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

export default async function StudentExamsPage() {
  const studentData = await getStudentId()
  
  if (!studentData) {
    redirect('/auth/login')
  }
  
  const { studentId, organizationId } = studentData
  
  if (!organizationId) redirect('/auth/access-denied')

  const [supabase, t, messages] = await Promise.all([
    createServerClient(),
    getTranslations('studentExams'),
    getMessages(),
  ])
  const exams = await getAvailableExams(supabase, studentId, organizationId)

  const studentExamsMsg = (messages as Record<string, unknown>)?.studentExams as Record<string, string> | undefined

  const translations: StudentExamsListTranslations = {
    title: t('title'),
    subtitle: t('subtitle'),
    showingCount: typeof studentExamsMsg?.showingCount === 'string' ? studentExamsMsg.showingCount : 'Showing {count} of {total}',
    availableExams: t('availableExams'),
    completed: t('completed'),
    searchPlaceholder: t('searchPlaceholder'),
    class: t('class'),
    teacher: t('teacher'),
    all: t('all'),
    noExamsFound: t('noExamsFound'),
    noExamsAvailable: t('noExamsAvailable'),
    tryAdjustingSearch: t('tryAdjustingSearch'),
    noExamsHint: t('noExamsHint'),
    questions: t('questions'),
    min: t('min'),
    bestScore: typeof studentExamsMsg?.bestScore === 'string' ? studentExamsMsg.bestScore : 'Best {score}%',
    notAvailable: t('notAvailable'),
    available: t('available'),
    attempt: t('attempt'),
    attempts: t('attempts'),
    best: t('best'),
    avg: t('avg'),
    exam: t('exam'),
    duration: t('duration'),
    attemptsAndScores: t('attemptsAndScores'),
    created: t('created'),
    byCreator: typeof studentExamsMsg?.byCreator === 'string' ? studentExamsMsg.byCreator : 'By {name}',
    classHeader: t('classHeader'),
    questionsHeader: t('questionsHeader'),
  }

  return <StudentExamsList exams={exams} translations={translations} />
}
