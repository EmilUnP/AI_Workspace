import { getAccessToken, getCurrentUser } from '@/lib/backend-auth'
import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'
import { notFound, redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { EducationPlanEditForm } from '@eduator/ui'
import { updateEducationPlan } from '../../actions'

type EducationPlanEditRow = {
  id: string
  name: string
  description: string | null
  period_months: number
  sessions_per_week: number
  hours_per_session: number
  audience: string | null
  content: Array<{ week: number; title?: string; topics: string[]; objectives?: string[]; notes?: string }>
}

const EducationPlanEditFormAny = EducationPlanEditForm as any

async function getTeacherData() {
  const user = await getCurrentUser()
  if (!user) return null
  if (user.role !== 'operator' && user.role !== 'admin') return null
  return { teacherId: user.id, workspaceId: 'global' }
}

async function getPlan(planId: string, teacherId: string, workspaceId: string): Promise<EducationPlanEditRow | null> {
  void teacherId
  void workspaceId
  const token = await getAccessToken()
  if (!token) return null
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'
  const response = await fetch(`${backendBase}/v1/education-plans/${planId}`, {
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store',
  })
  if (!response.ok) return null
  const payload = (await response.json()) as { plan?: EducationPlanEditRow }
  return payload.plan ?? null
}

export default async function TeacherEducationPlanEditPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id: planId } = await params
  const t = await getTranslations('teacherEducationPlans')
  const teacherData = await getTeacherData()
  if (!teacherData) redirect('/auth/login')
  const { teacherId, workspaceId } = teacherData

  const plan = await getPlan(planId, teacherId, workspaceId)
  if (!plan) notFound()

  const audienceOptions = [
    { value: '', label: t('selectAudience') },
    { value: 'Grade 1', label: t('grade1') },
    { value: 'Grade 2', label: t('grade2') },
    { value: 'Grade 3', label: t('grade3') },
    { value: 'Grade 4', label: t('grade4') },
    { value: 'Grade 5', label: t('grade5') },
    { value: 'Grade 6', label: t('grade6') },
    { value: 'Grade 7', label: t('grade7') },
    { value: 'Grade 8', label: t('grade8') },
    { value: 'Grade 9', label: t('grade9') },
    { value: 'Grade 10', label: t('grade10') },
    { value: 'Grade 11', label: t('grade11') },
    { value: 'Grade 12', label: t('grade12') },
    { value: 'Undergraduate', label: t('undergraduate') },
    { value: 'Graduate', label: t('graduate') },
    { value: 'PhD', label: t('phd') },
    { value: '__other__', label: t('otherCustom') },
  ]

  return (
    <EducationPlanEditFormAny
      planId={plan.id}
      initialData={{
        name: plan.name,
        description: plan.description,
        period_months: plan.period_months,
        sessions_per_week: plan.sessions_per_week,
        hours_per_session: plan.hours_per_session,
        audience: plan.audience,
      }}
      content={(plan.content as Array<{ week: number; title?: string; topics: string[]; objectives?: string[]; notes?: string }>) ?? null}
      updateAction={updateEducationPlan}
      backHref="/school-admin/education-plans"
      planDetailBase="/school-admin/education-plans"
      audienceOptions={audienceOptions}
      labels={{
        backToPlans: t('backToPlans'),
        editTitle: t('editTitle'),
        editSubtitle: t('editSubtitle'),
        detailsSchedule: t('detailsSchedule'),
        planName: t('planName'),
        planNamePlaceholder: t('planNamePlaceholder'),
        descriptionOptional: t('descriptionOptional'),
        briefDescription: t('briefDescription'),
        periodMonths: t('periodMonths'),
        sessionsPerWeek: t('sessionsPerWeek'),
        hoursPerSession: t('hoursPerSession'),
        audience: t('audience'),
        audiencePlaceholder: t('audiencePlaceholder'),
        selectAudience: t('selectAudience'),
        otherCustom: t('otherCustom'),
        planContentWeekByWeek: t('planContentWeekByWeek'),
        planContentHint: t('planContentHint'),
        weekTitlePlaceholder: t('weekTitlePlaceholder', { week: '{week}' }),
        topicsPerLine: t('topicsPerLine'),
        oneTopicPerLine: t('oneTopicPerLine'),
        objectivesPerLine: t('objectivesPerLine'),
        oneObjectivePerLine: t('oneObjectivePerLine'),
        notesOptional: t('notesOptional'),
        notesPlaceholder: t('notesPlaceholder'),
        cancel: t('cancel'),
        saveChanges: t('saveChanges'),
        failedToSave: t('failedToSave'),
      }}
    />
  )
}

