import { createAdminClient } from '@eduator/auth/supabase/admin'
import { createClient } from '@eduator/auth/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { FinalExamCreatePage } from '@eduator/ui'
import {
  getSourceExamsForSchoolAdmin,
  getTeachersWithExamsForSchoolAdmin,
  loadSourceExamQuestions,
  createFinalExamAction,
} from '../actions'

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

export default async function SchoolAdminFinalExamsCreatePage({
  searchParams,
}: {
  searchParams: Promise<{ teacher?: string }>
}) {
  const context = await getSchoolAdminContext()
  if (!context) redirect('/auth/login')

  const { organizationId } = context
  const { teacher: teacherId } = await searchParams

  const [sourceExamsResult, classes, teachers, t] = await Promise.all([
    getSourceExamsForSchoolAdmin(organizationId),
    getClasses(organizationId),
    getTeachersWithExamsForSchoolAdmin(organizationId),
    getTranslations('finalExamCreate'),
  ])

  return (
    <FinalExamCreatePage
      sourceExams={sourceExamsResult.data}
      classes={classes}
      teachers={teachers}
      selectedTeacherId={teacherId || ''}
      onLoadSourceExam={loadSourceExamQuestions}
      onCreateFinalExam={createFinalExamAction}
      listHref="/school-admin/final-exams"
      showTeacherFilter
      labels={{
        title: t('title'),
        backTo: t('backTo'),
        create: t('create'),
        addSourceExam: t('addSourceExam'),
        sourceExam: t('sourceExam'),
        selectQuestions: t('selectQuestions'),
        selectAll: t('selectAll'),
        unselectAll: t('unselectAll'),
        titleOverride: t('titleOverride'),
        titlePlaceholder: t('titlePlaceholder'),
        selectClass: t('selectClass'),
        selectClassOption: t('selectClassOption'),
        availableFrom: t('availableFrom'),
        availableTo: t('availableTo'),
        oneAttemptPerStudent: t('oneAttemptPerStudent'),
        showResultToStudent: t('showResultToStudent'),
        showResultToStudentHelp: t('showResultToStudentHelp'),
        durationMinutes: t('durationMinutes'),
        durationMinutesHelp: t('durationMinutesHelp'),
        questionMode: t('questionMode'),
        fixedSelectionMode: t('fixedSelectionMode'),
        randomPoolMode: t('randomPoolMode'),
        questionsPerAttempt: t('questionsPerAttempt'),
        questionsPerAttemptHelp: t('questionsPerAttemptHelp'),
        questionsPerAttemptPlaceholder: t('questionsPerAttemptPlaceholder'),
        // Keep {count} placeholder for UI-side replacement.
        poolSizeLabel: t('poolSizeLabel', { count: '{count}' }),
        selectTeacher: t('selectTeacher'),
        selectTeacherOption: t('selectTeacherOption'),
        selectExamOption: t('selectExamOption'),
        selectTeacherFirst: t('selectTeacherFirst'),
        creating: t('creating'),
        cancel: t('cancel'),
        loadingQuestions: t('loadingQuestions'),
        sourceExamsSectionTitle: t('sourceExamsSectionTitle'),
        sourceExamsSectionDesc: t('sourceExamsSectionDesc'),
        settingsTitle: t('settingsTitle'),
        filterByTeacherTitle: t('filterByTeacherTitle'),
        filterByTeacherDesc1: t('filterByTeacherDesc1'),
        filterByTeacherDesc2: t('filterByTeacherDesc2'),
        errorSelectClassAndPeriod: t('errorSelectClassAndPeriod'),
        errorEndAfterStart: t('errorEndAfterStart'),
        errorAddSourceAndQuestions: t('errorAddSourceAndQuestions'),
        previewHeading: t('previewHeading'),
        previewSubheading: t('previewSubheading'),
        previewQuestions: t('previewQuestions'),
        previewDuration: t('previewDuration'),
        previewSources: t('previewSources'),
        previewOneAttempt: t('previewOneAttempt'),
        previewFrom: t('previewFrom'),
        previewDefaultTitle: t('previewDefaultTitle'),
        previewTitleOptionalHint: t('previewTitleOptionalHint'),
        byType: t('byType'),
        byDifficulty: t('byDifficulty'),
        typeMC: t('typeMC'),
        typeTF: t('typeTF'),
        typeMS: t('typeMS'),
        typeFill: t('typeFill'),
        diffEasy: t('diffEasy'),
        diffMedium: t('diffMedium'),
        diffHard: t('diffHard'),
        selectedCount: t('selectedCount'),
      }}
    />
  )
}
