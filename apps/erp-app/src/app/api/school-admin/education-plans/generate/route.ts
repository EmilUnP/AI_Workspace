/**
 * Generate education plan content (AI). When name is provided, saves the plan and returns planId.
 * class_id is optional.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@eduator/auth/supabase/server'
import { requireCourseAuth } from '@eduator/core/utils/api-helpers'
import { insertEducationPlan } from '@eduator/core/utils/teacher-education-plans'
import { generateEducationPlanContent } from '@eduator/ai/services/education-plan-generator'
import { tokenRepository } from '@eduator/db/repositories/tokens'

export async function POST(request: NextRequest) {
  const { profile, organizationId, error: authError } = await requireCourseAuth()
  if (authError) return authError
  let tokenDeduct: { success: boolean; errorMessage?: string; cost?: number } | undefined

  try {
    const body = await request.json()
    const {
      class_id,
      document_ids = [],
      period_months = 3,
      sessions_per_week = 3,
      hours_per_session = 2,
      audience = '',
      class_name = '',
      language = '',
      name = '',
      description = '',
    } = body

    await tokenRepository.ensureEducationPlanGenerationSetting()
    tokenDeduct = await tokenRepository.deductTokensForAction(profile!.id, 'education_plan_generation', {})
    if (!tokenDeduct.success) {
      return NextResponse.json(
        { error: tokenDeduct.errorMessage ?? 'Insufficient tokens' },
        { status: 402 }
      )
    }

    const result = await generateEducationPlanContent({
      organizationId: organizationId!,
      teacherId: profile!.id,
      classId: class_id || undefined,
      className: class_name || '',
      documentIds: Array.isArray(document_ids) ? document_ids : [],
      periodMonths: Number(period_months) || 3,
      sessionsPerWeek: Number(sessions_per_week) || 3,
      hoursPerSession: Number(hours_per_session) || 2,
      audience: String(audience || ''),
      language: String(language || ''),
    })
    const content = result.content

    await tokenRepository.attachMetadataToLatestUsageTransaction(profile!.id, 'education_plan_generation', result.usage).catch(() => {})

    const planName = String(name || '').trim()
    if (planName && profile?.id && organizationId) {
      const supabase = await createClient()
      const { data, error } = await insertEducationPlan(supabase, {
        organization_id: organizationId,
        teacher_id: profile.id,
        class_id: class_id || null,
        name: planName,
        description: String(description || '').trim() || null,
        period_months: Number(period_months) || 3,
        sessions_per_week: Number(sessions_per_week) || 3,
        hours_per_session: Number(hours_per_session) || 2,
        audience: String(audience || '').trim() || null,
        document_ids: Array.isArray(document_ids) ? document_ids : [],
        content,
        is_shared_with_students: false,
      })
      if (!error && data?.id) {
        return NextResponse.json({ content, planId: data.id })
      }
      if (error) {
        console.error('[education-plans/generate] save failed:', error)
        return NextResponse.json(
          { error: (error as { message?: string }).message || 'Failed to save plan' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ content })
  } catch (err) {
    const cost = tokenDeduct?.cost ?? 0
    if (cost > 0 && profile?.id) {
      await tokenRepository.addTokens(profile.id, cost, 'refund', undefined, { reason: 'ai_failed' }).catch(() => {})
    }
    const message = err instanceof Error ? err.message : 'Failed to generate plan'
    console.error('[education-plans/generate]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
