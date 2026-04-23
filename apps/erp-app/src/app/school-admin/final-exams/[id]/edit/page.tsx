import { createAdminClient } from '@eduator/auth/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { FinalExamEditPage } from '@eduator/ui'
import {
  getFinalExamByIdForSchoolAdmin,
  getSourceExamsForSchoolAdmin,
  getTeachersWithExamsForSchoolAdmin,
  loadSourceExamQuestions,
  updateFinalExamAction,
} from '../../actions'

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

async function getClasses(organizationId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('classes')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name')
  return (data ?? []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))
}

export default async function SchoolAdminFinalExamEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const context = await getSchoolAdminContext()
  if (!context) redirect('/auth/login')

  const { id } = await params
  const [finalExam, classes, sourceExamsResult, teachers, t] = await Promise.all([
    getFinalExamByIdForSchoolAdmin(id),
    getClasses(context.organizationId),
    getSourceExamsForSchoolAdmin(context.organizationId),
    getTeachersWithExamsForSchoolAdmin(context.organizationId),
    getTranslations('finalExamEdit'),
  ])
  if (!finalExam) return notFound()

  const sourceExams = (sourceExamsResult?.data ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    duration_minutes: e.duration_minutes,
    question_count: e.question_count,
    created_by: e.created_by,
    created_by_name: e.created_by_name,
  }))

  return (
    <FinalExamEditPage
      finalExam={finalExam}
      classes={classes}
      sourceExams={sourceExams}
      teachers={teachers}
      showTeacherFilter
      onLoadSourceExam={loadSourceExamQuestions}
      onUpdateFinalExam={updateFinalExamAction}
      listHref="/school-admin/final-exams"
      detailHref={`/school-admin/final-exams/${id}`}
      labels={{
        title: t('title'),
        backTo: t('backTo'),
        save: t('save'),
        saving: t('saving'),
        cancel: t('cancel'),
        titleOverride: t('titleOverride'),
        titlePlaceholder: t('titlePlaceholder'),
        selectClass: t('selectClass'),
        selectClassOption: t('selectClassOption'),
        availableFrom: t('availableFrom'),
        availableTo: t('availableTo'),
        durationMinutes: t('durationMinutes'),
        durationMinutesHelp: t('durationMinutesHelp'),
        durationPlaceholder: t('durationPlaceholder'),
        oneAttemptPerStudent: t('oneAttemptPerStudent'),
        showResultToStudent: t('showResultToStudent'),
        addSourceExam: t('addSourceExam'),
        sourceExam: t('sourceExam'),
        selectQuestions: t('selectQuestions'),
        selectAll: t('selectAll'),
        sourceExamsSectionTitle: t('sourceExamsSectionTitle'),
        sourceExamsSectionDesc: t('sourceExamsSectionDesc'),
        settingsTitle: t('settingsTitle'),
        selectTeacher: t('selectTeacher'),
        selectTeacherOption: t('selectTeacherOption'),
        selectExamOption: t('selectExamOption'),
        selectTeacherFirst: t('selectTeacherFirst'),
        loadingQuestions: t('loadingQuestions'),
        errorSelectClassAndPeriod: t('errorSelectClassAndPeriod'),
        errorEndAfterStart: t('errorEndAfterStart'),
        errorAddSourceAndQuestions: t('errorAddSourceAndQuestions'),
        previewDefaultTitle: t('previewDefaultTitle'),
        previewHeading: t('previewHeading'),
        previewSubheading: t('previewSubheading'),
        previewQuestions: t('previewQuestions'),
        previewDuration: t('previewDuration'),
        previewSources: t('previewSources'),
        previewOneAttempt: t('previewOneAttempt'),
        previewFrom: t('previewFrom'),
        previewTitleOptionalHint: t('previewTitleOptionalHint'),
        selectedCount: t('selectedCount'),
        examsCount: t('examsCount'),
        questionsCount: t('questionsCount'),
        typeMC: t('typeMC'),
        typeTF: t('typeTF'),
        typeMS: t('typeMS'),
        typeFill: t('typeFill'),
        difficultyEasy: t('difficultyEasy'),
        difficultyMedium: t('difficultyMedium'),
        difficultyHard: t('difficultyHard'),
        byType: t('byType'),
        byDifficulty: t('byDifficulty'),
      }}
    />
  )
}
