import { createClient } from '@eduator/auth/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft, BookOpen, Share2 } from 'lucide-react'
import { EducationPlanViewClient } from './plan-view-client'
import { deleteEducationPlan } from '../actions'

async function getTeacherData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('id, organization_id').eq('user_id', user.id).single()
  if (!profile?.organization_id) return null
  return { teacherId: profile.id, organizationId: profile.organization_id }
}

async function getPlan(planId: string, teacherId: string, organizationId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('education_plans')
    .select('*')
    .eq('id', planId)
    .eq('teacher_id', teacherId)
    .eq('organization_id', organizationId)
    .single()
  if (error || !data) return null
  return data
}

async function getClassName(classId: string, classFallback?: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('classes').select('name').eq('id', classId).single()
  return data?.name || (classFallback ?? 'Class')
}

export default async function TeacherEducationPlanDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id: planId } = await params
  const t = await getTranslations('teacherEducationPlans')
  const teacherData = await getTeacherData()
  if (!teacherData) redirect('/auth/login')
  const { teacherId, organizationId } = teacherData

  const plan = await getPlan(planId, teacherId, organizationId)
  if (!plan) notFound()
  const className = await getClassName(plan.class_id, t('classFallback'))

  return (
    <div className="space-y-6">
      <Link
        href="/teacher/education-plans"
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
            {t('sharedWithStudents')}
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
