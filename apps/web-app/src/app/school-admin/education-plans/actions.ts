'use server'

import { createClient } from '@eduator/auth/supabase/server'
import { revalidatePath } from 'next/cache'
import { insertEducationPlan } from '@eduator/core/utils/teacher-education-plans'
import type { EducationPlanWeek } from '@eduator/core/types/education-plan'

export async function createEducationPlan(params: {
  class_id: string | null
  name: string
  description?: string | null
  period_months: number
  sessions_per_week: number
  hours_per_session: number
  audience?: string | null
  document_ids: string[]
  content: EducationPlanWeek[]
  is_shared_with_students?: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', planId: null }
  const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single()
  if (!profile?.id) return { error: 'Profile not found', planId: null }

  const { data, error } = await insertEducationPlan(supabase, {
    organization_id: 'global',
    teacher_id: profile.id,
    class_id: params.class_id,
    name: params.name,
    description: params.description ?? null,
    period_months: params.period_months,
    sessions_per_week: params.sessions_per_week,
    hours_per_session: params.hours_per_session,
    audience: params.audience ?? null,
    document_ids: params.document_ids || [],
    content: params.content,
    is_shared_with_students: params.is_shared_with_students ?? false,
  })
  if (error) {
    console.error('createEducationPlan error:', error)
    return { error: (error as { message?: string }).message ?? 'Failed to create plan', planId: null }
  }
  revalidatePath('/school-admin/education-plans')
  return { error: null, planId: data?.id ?? null }
}

export async function updateEducationPlan(
  planId: string,
  params: {
    name?: string
    description?: string | null
    period_months?: number
    sessions_per_week?: number
    hours_per_session?: number
    audience?: string | null
    document_ids?: string[]
    content?: EducationPlanWeek[]
    is_shared_with_students?: boolean
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single()
  if (!profile) return { error: 'Profile not found' }

  const { error } = await supabase
    .from('education_plans')
    .update({
      ...params,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .eq('teacher_id', profile.id)
  if (error) {
    console.error('updateEducationPlan error:', error)
    return { error: error.message }
  }
  revalidatePath('/school-admin/education-plans')
  revalidatePath(`/school-admin/education-plans/${planId}`)
  return { error: null }
}

export async function deleteEducationPlan(planId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }
  const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single()
  if (!profile) return { success: false, error: 'Profile not found' }

  const { error } = await supabase
    .from('education_plans')
    .delete()
    .eq('id', planId)
    .eq('teacher_id', profile.id)
  if (error) {
    console.error('deleteEducationPlan error:', error)
    return { success: false, error: error.message }
  }
  revalidatePath('/school-admin/education-plans')
  return { success: true, error: null }
}

