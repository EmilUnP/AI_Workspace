import { notFound, redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { FinalExamDetail } from '@eduator/ui'
import {
  getFinalExamByIdForSchoolAdmin,
  deleteFinalExamAction,
  releaseResultsAction,
} from '../actions'

async function getSchoolAdminContext() {
  const { createClient } = await import('@eduator/auth/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single()
  if (!profile?.organization_id) return null
  return { organizationId: profile.organization_id }
}

export default async function SchoolAdminFinalExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const context = await getSchoolAdminContext()
  if (!context) redirect('/auth/login')

  const { id } = await params
  const [finalExam, t] = await Promise.all([
    getFinalExamByIdForSchoolAdmin(id),
    getTranslations('finalExamDetail'),
  ])
  if (!finalExam) return notFound()

  return (
    <FinalExamDetail
      finalExam={finalExam}
      editHref={`/school-admin/final-exams/${id}/edit`}
      listHref="/school-admin/final-exams"
      onDelete={deleteFinalExamAction}
      onReleaseResults={releaseResultsAction}
      showTeacherInfo
      labels={{
        backTo: t('backTo'),
        edit: t('edit'),
        delete: t('delete'),
        releaseResults: t('releaseResults'),
        oneAttempt: t('oneAttempt'),
        resultsHidden: t('resultsHidden'),
        resultsShown: t('resultsShown'),
        questionsFromSources: t('questionsFromSources'),
        duration: t('duration'),
        availablePeriod: t('availablePeriod'),
        classLabel: t('classLabel'),
        teacherLabel: t('teacherLabel'),
        summaryTitle: t('summaryTitle'),
        summaryDescription: t('summaryDescription'),
        primarySource: t('primarySource'),
        moreSources: t('moreSources'),
        deleteConfirm: t('deleteConfirm'),
        defaultTitle: t('defaultTitle'),
        source: t('source'),
        sources: t('sources'),
        questionBreakdown: t('questionBreakdown'),
        byType: t('byType'),
        byDifficulty: t('byDifficulty'),
        typeMC: t('typeMC'),
        typeTF: t('typeTF'),
        typeMS: t('typeMS'),
        typeFill: t('typeFill'),
        diffEasy: t('diffEasy'),
        diffMedium: t('diffMedium'),
        diffHard: t('diffHard'),
        deleteConfirmTitle: t('deleteConfirmTitle'),
        confirmDelete: t('confirmDelete'),
        cancel: t('cancel'),
      }}
    />
  )
}
