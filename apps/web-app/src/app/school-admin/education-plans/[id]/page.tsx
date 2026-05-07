import { getAccessToken, getCurrentUser } from '@/lib/backend-auth'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { EducationPlanViewClient } from './plan-view-client'
import { deleteEducationPlan } from '../actions'
import { DeletePlanButton } from './delete-plan-button'

type EducationPlan = {
  id: string
  name: string
  description: string | null
  class_id: string | null
  period_months: number
  sessions_per_week: number
  hours_per_session: number
  audience: string | null
  is_shared_with_students: boolean
  content: unknown
}

async function getTeacherData() {
  const user = await getCurrentUser()
  if (!user) return null
  if (user.role !== 'operator' && user.role !== 'admin') return null
  return { teacherId: user.id, workspaceId: 'global' }
}

async function getPlan(planId: string, teacherId: string, workspaceId: string): Promise<EducationPlan | null> {
  void teacherId
  void workspaceId
  const token = await getAccessToken()
  if (!token) return null
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'
  const response = await fetch(`${backendBase}/v1/education-plans/${planId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!response.ok) return null
  const payload = (await response.json()) as { plan?: EducationPlan }
  return payload.plan ?? null
}

export default async function TeacherEducationPlanDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id: planId } = await params
  const t = await getTranslations('teacherEducationPlans')
  const teacherData = await getTeacherData()
  if (!teacherData) redirect('/auth/login')
  const { teacherId, workspaceId } = teacherData

  const plan = await getPlan(planId, teacherId, workspaceId)
  if (!plan) notFound()

  return (
    <div className="space-y-6">
      <Link
        href="/school-admin/education-plans"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('backToPlans')}
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{plan.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
              <span>{plan.period_months} {t('months')} · {plan.sessions_per_week}{t('timesPerWeek')}, {plan.hours_per_session}{t('hours')}</span>
              {plan.audience && <span>· {plan.audience}</span>}
            </p>
            {plan.description && (
              <p className="text-sm text-gray-600 mt-2 max-w-2xl">{plan.description}</p>
            )}
          </div>
        </div>
        <DeletePlanButton
          planId={plan.id}
          deleteAction={deleteEducationPlan}
          labels={{
            delete: t('delete'),
            deletePlanTitle: t('deletePlanTitle'),
            deletePlanConfirm: t('deletePlanConfirm'),
            cancel: t('cancel'),
            deleting: t('deleting'),
            deletePlanBtn: t('deletePlanBtn'),
          }}
        />
      </div>

      <EducationPlanViewClient
        content={plan.content}
      />
    </div>
  )
}

