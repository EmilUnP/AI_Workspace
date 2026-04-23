import { createClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { FinalExamList } from '@eduator/ui'
import {
  getFinalExamsForSchoolAdmin,
  getTeachersWithExamsForSchoolAdmin,
  deleteFinalExamAction,
  releaseResultsAction,
} from './actions'

async function getSchoolAdminContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single()
  if (!profile?.organization_id) return null
  return { profileId: profile.id, organizationId: profile.organization_id }
}

export default async function SchoolAdminFinalExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ teacher?: string }>
}) {
  const context = await getSchoolAdminContext()
  if (!context) redirect('/auth/login')

  const { organizationId } = context
  const { teacher: teacherId } = await searchParams

  const [finalExamsResult, teachers, t] = await Promise.all([
    getFinalExamsForSchoolAdmin(organizationId, teacherId || null),
    getTeachersWithExamsForSchoolAdmin(organizationId),
    getTranslations('finalExamList'),
  ])

  return (
    <FinalExamList
      finalExams={finalExamsResult.data}
      teachers={teachers}
      selectedTeacherId={teacherId || ''}
      onDeleteFinalExam={deleteFinalExamAction}
      onReleaseResults={releaseResultsAction}
      createHref="/school-admin/final-exams/create"
      listPath="/school-admin/final-exams"
      showTeacherFilter
      labels={{
        pageTitle: t('pageTitle'),
        pageDescription: t('pageDescription'),
        createButton: t('createButton'),
        noFinalExams: t('noFinalExams'),
        getStartedHint: t('getStartedHint'),
        filterByTeacher: t('filterByTeacher'),
        allTeachers: t('allTeachers'),
        teacherLabel: t('teacherLabel'),
        oneAttempt: t('oneAttempt'),
        resultsHidden: t('resultsHidden'),
        resultsShown: t('resultsShown'),
        releaseResults: t('releaseResults'),
        viewDetails: t('viewDetails'),
        edit: t('edit'),
        questionsFromSources: t('questionsFromSources'),
        duration: t('duration'),
        source: t('source'),
        sources: t('sources'),
        defaultTitle: t('defaultTitle'),
        questionMode: t('questionMode'),
        modeFixedSelection: t('modeFixedSelection'),
        modeRandomPool: t('modeRandomPool'),
        questionsPerAttempt: t('questionsPerAttempt'),
      }}
    />
  )
}
