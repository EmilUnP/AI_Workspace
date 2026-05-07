'use server'

import { getAccessToken } from '@/lib/backend-auth'
import { revalidatePath } from 'next/cache'
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
  const token = await getAccessToken()
  if (!token) return { error: 'Unauthorized', planId: null }
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'

  const response = await fetch(`${backendBase}/v1/education-plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
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
    }),
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => ({}))) as { error?: string; plan?: { id?: string } }
  if (!response.ok) {
    return { error: payload.error || 'Failed to create plan', planId: null }
  }

  revalidatePath('/school-admin/education-plans')
  return { error: null, planId: payload.plan?.id ?? null }
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
  const token = await getAccessToken()
  if (!token) return { error: 'Unauthorized' }
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'

  const response = await fetch(`${backendBase}/v1/education-plans/${planId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
    cache: 'no-store',
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    return { error: payload.error || 'Failed to update plan' }
  }

  revalidatePath('/school-admin/education-plans')
  revalidatePath(`/school-admin/education-plans/${planId}`)
  return { error: null }
}

export async function deleteEducationPlan(planId: string) {
  const token = await getAccessToken()
  if (!token) return { success: false, error: 'Unauthorized' }
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'

  const response = await fetch(`${backendBase}/v1/education-plans/${planId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    return { success: false, error: payload.error || 'Failed to delete plan' }
  }

  revalidatePath('/school-admin/education-plans')
  return { success: true, error: null }
}

