/**
 * Shared utilities for teacher education plans (ERP + ERP).
 * Single place for create/update logic so both apps stay in sync.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { EducationPlanWeek } from '../types/education-plan'

export interface InsertEducationPlanParams {
  organization_id: string
  teacher_id: string
  class_id: string | null
  name: string
  description?: string | null
  period_months: number
  sessions_per_week: number
  hours_per_session: number
  audience?: string | null
  document_ids?: string[]
  content: EducationPlanWeek[]
  is_shared_with_students?: boolean
}

/**
 * Insert a new education plan. Returns the new plan id for redirect.
 * Used by both server actions and the generate API (auto-save after AI).
 */
export async function insertEducationPlan(
  supabase: SupabaseClient,
  params: InsertEducationPlanParams
): Promise<{ data: { id: string } | null; error: unknown }> {
  const { data, error } = await supabase
    .from('education_plans')
    .insert({
      organization_id: params.organization_id,
      teacher_id: params.teacher_id,
      class_id: params.class_id ?? null,
      name: params.name,
      description: params.description ?? null,
      period_months: params.period_months,
      sessions_per_week: params.sessions_per_week,
      hours_per_session: params.hours_per_session,
      audience: params.audience ?? null,
      document_ids: Array.isArray(params.document_ids) ? params.document_ids : [],
      content: params.content,
      is_shared_with_students: params.is_shared_with_students ?? false,
    })
    .select('id')
    .single()

  if (error) return { data: null, error }
  return { data: (data as { id: string }) ?? null, error: null }
}
