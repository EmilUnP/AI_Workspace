import { getAccessToken, getCurrentUser } from '@/lib/backend-auth'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft, BookOpen, Share2 } from 'lucide-react'
import { EducationPlanViewClient } from './plan-view-client'
import { deleteEducationPlan } from '../actions'

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
  content: Array<{ week: number; title?: string; topics: string[]; objectives?: string[]; notes?: string }>
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

async function getClassName(classId: string | null, classFallback?: string) {
  if (!classId) return classFallback ?? 'Class'
  return classFallback ?? 'Class'
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
  const className = await getClassName(plan.class_id, t('classFallback'))

  return (
    <div className="space-y-6">
      <Link
        href="/school-admin/education-plans"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('backToPlans')}
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{plan.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
              <span>{className}</span>
              <span>·</span>
              <span>{plan.period_months} {t('months')} · {plan.sessions_per_week}{t('timesPerWeek')}, {plan.hours_per_session}{t('hours')}</span>
              {plan.audience && <span>· {plan.audience}</span>}
            </p>
            {plan.description && (
              <p className="text-sm text-gray-600 mt-2 max-w-2xl">{plan.description}</p>
            )}
          </div>
        </div>
        {plan.is_shared_with_students && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700">
            <Share2 className="h-4 w-4" />
            {t('sharedWithLearners')}
          </span>
        )}
      </div>

      <EducationPlanViewClient
        planId={plan.id}
        content={plan.content as Array<{ week: number; title?: string; topics: string[]; objectives?: string[]; notes?: string }>}
        isShared={plan.is_shared_with_students}
        deleteAction={deleteEducationPlan}
      />
    </div>
  )
}

