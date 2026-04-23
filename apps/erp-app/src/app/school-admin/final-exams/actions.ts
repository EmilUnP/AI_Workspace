'use server'

import { createClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { revalidatePath } from 'next/cache'
import {
  getFinalExams,
  getFinalExamById,
  getSourceExamsForFinal,
  getTeachersWithExams,
  createFinalExam,
  updateFinalExam,
  deleteFinalExam,
} from '@eduator/core/utils/final-exams'
import type { CreateFinalExamInput, UpdateFinalExamInput } from '@eduator/core/types/final-exam'
import type { QuestionOption } from '@eduator/ui'

export async function getFinalExamsForSchoolAdmin(organizationId: string, teacherId?: string | null) {
  const supabase = await createClient()
  return getFinalExams(supabase, {
    organizationId,
    createdBy: teacherId ?? undefined,
  })
}

/** School admin: all exams in org, optionally filtered by teacher. */
export async function getSourceExamsForSchoolAdmin(organizationId: string, teacherId?: string | null) {
  const admin = createAdminClient()
  return getSourceExamsForFinal(admin, {
    organizationId,
    createdBy: teacherId ?? undefined,
  })
}

export async function getTeachersWithExamsForSchoolAdmin(organizationId: string) {
  const admin = createAdminClient()
  return getTeachersWithExams(admin, organizationId)
}

export async function getFinalExamByIdForSchoolAdmin(id: string) {
  const supabase = await createClient()
  return getFinalExamById(supabase, id)
}

export async function loadSourceExamQuestions(examId: string): Promise<QuestionOption[]> {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, profile_type, organization_id')
    .eq('user_id', user.id)
    .single()

  const client = profile?.profile_type === 'school_superadmin' ? admin : supabase
  const { data: exam } = await client
    .from('exams')
    .select('questions')
    .eq('id', examId)
    .single()

  if (!exam?.questions || !Array.isArray(exam.questions)) return []
  const raw = exam.questions as { id?: string; question?: string; text?: string; order?: number; type?: string; difficulty?: string }[]
  return raw.map((q, i) => ({
    id: q.id ?? `q-${i}`,
    question: (q.question ?? q.text ?? '').trim(),
    order: q.order ?? i,
    type: q.type ?? undefined,
    difficulty: q.difficulty ?? undefined,
  }))
}

export async function createFinalExamAction(input: CreateFinalExamInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single()
  if (!profile?.id || !profile?.organization_id) return { error: 'Not authenticated' }
  const result = await createFinalExam(supabase, profile.organization_id, profile.id, input)
  if (result.error) return { error: result.error }
  revalidatePath('/school-admin/final-exams')
  return {}
}

export async function releaseResultsAction(id: string) {
  const supabase = await createClient()
  const result = await updateFinalExam(supabase, id, { show_result_to_student: true })
  if (result.error) return { error: result.error }
  revalidatePath('/school-admin/final-exams')
  return {}
}

export async function updateFinalExamAction(id: string, input: UpdateFinalExamInput) {
  const supabase = await createClient()
  const result = await updateFinalExam(supabase, id, input)
  if (result.error) return { error: result.error }
  revalidatePath('/school-admin/final-exams')
  revalidatePath(`/school-admin/final-exams/${id}`)
  return {}
}

export async function deleteFinalExamAction(id: string) {
  const supabase = await createClient()
  const result = await deleteFinalExam(supabase, id)
  if (result.error) return { error: result.error }
  revalidatePath('/school-admin/final-exams')
  return {}
}
