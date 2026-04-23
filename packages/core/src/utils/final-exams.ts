/**
 * Shared utilities for final exams (ERP school-admin + ERP teacher).
 * Final exam = scheduled instance of an existing exam with optional question selection and one-attempt enforcement.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  FinalExam,
  FinalExamWithSource,
  CreateFinalExamInput,
  UpdateFinalExamInput,
  FinalExamSourceEntry,
} from '@eduator/core/types/final-exam'

export interface ListFinalExamsParams {
  organizationId: string
  /** When set (teacher), only list final exams created by this profile id. When null (school admin), list all in org. */
  createdBy?: string | null
  page?: number
  perPage?: number
}

export interface ListSourceExamsParams {
  organizationId: string
  /** When set (teacher), only exams created by this profile id. When null (school admin), all exams in org. */
  createdBy?: string | null
  search?: string
  page?: number
  perPage?: number
}

const DEFAULT_PER_PAGE = 20

/**
 * List final exams. For teacher pass createdBy; for school admin omit to get all in org.
 */
export async function getFinalExams(
  supabase: SupabaseClient,
  params: ListFinalExamsParams
): Promise<{ data: FinalExamWithSource[]; count: number }> {
  const { organizationId, createdBy, page = 1, perPage = DEFAULT_PER_PAGE } = params
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  let query = supabase
    .from('final_exams')
    .select(
      `
      *,
      source_exam:exams(id, title, duration_minutes, questions)
    `,
      { count: 'exact' }
    )
    .eq('organization_id', organizationId)
    .order('start_time', { ascending: false })
    .range(from, to)

  if (createdBy != null) {
    query = query.eq('created_by', createdBy)
  }

  const { data: rows, error, count } = await query

  if (error) {
    console.error('Error fetching final exams:', error)
    return { data: [], count: 0 }
  }

  const ids = (rows || []).map((r: { class_id?: string | null; course_id?: string | null }) => r.class_id).filter(Boolean) as string[]
  const courseIds = (rows || []).map((r: { course_id?: string | null }) => r.course_id).filter(Boolean) as string[]
  const creatorIds = [...new Set((rows || []).map((r: { created_by?: string }) => r.created_by).filter(Boolean))] as string[]
  const classMap: Record<string, string> = {}
  const courseMap: Record<string, string> = {}
  const creatorNameMap: Record<string, string> = {}

  const [classesResult, coursesResult, profilesResult] = await Promise.all([
    ids.length > 0
      ? supabase.from('classes').select('id, name').in('id', ids)
      : null,
    courseIds.length > 0
      ? supabase.from('courses').select('id, title').in('id', courseIds)
      : null,
    creatorIds.length > 0
      ? supabase.from('profiles').select('id, full_name').in('id', creatorIds)
      : null,
  ])

  ;(classesResult?.data || []).forEach((c: { id: string; name: string }) => {
    classMap[c.id] = c.name
  })
  ;(coursesResult?.data || []).forEach((c: { id: string; title: string }) => {
    courseMap[c.id] = c.title
  })
  ;(profilesResult?.data || []).forEach((p: { id: string; full_name: string | null }) => {
    creatorNameMap[p.id] = p.full_name?.trim() || 'Teacher'
  })

  const data: FinalExamWithSource[] = (rows || []).map((r: Record<string, unknown>) => {
    let total_question_count = 0
    const entries = r.source_entries as { selected_question_ids?: string[] }[] | null | undefined
    if (Array.isArray(entries) && entries.length > 0) {
      total_question_count = entries.reduce((sum, e) => sum + (e.selected_question_ids?.length ?? 0), 0)
    } else {
      const sel = r.selected_question_ids as string[] | null | undefined
      const src = r.source_exam as { questions?: unknown[] } | null | undefined
      total_question_count = sel?.length ?? (Array.isArray(src?.questions) ? src.questions.length : 0)
    }
    return {
      ...r,
      class_name: r.class_id ? classMap[r.class_id as string] ?? null : null,
      course_title: r.course_id ? courseMap[r.course_id as string] ?? null : null,
      created_by_name: r.created_by ? creatorNameMap[r.created_by as string] ?? null : null,
      total_question_count,
    }
  }) as FinalExamWithSource[]

  return { data, count: count ?? 0 }
}

export interface SourceExamForFinalItem {
  id: string
  title: string
  duration_minutes: number | null
  question_count: number
  created_by?: string
  created_by_name?: string | null
}

/**
 * List exams that can be used as source for a final exam. Teacher: own exams; school admin: all org exams (optional teacher filter).
 */
export async function getSourceExamsForFinal(
  supabase: SupabaseClient,
  params: ListSourceExamsParams
): Promise<{ data: SourceExamForFinalItem[]; count: number }> {
  const { organizationId, createdBy, search, page = 1, perPage = 50 } = params
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  let query = supabase
    .from('exams')
    .select('id, title, duration_minutes, questions, created_by', { count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('is_archived', false)
    .or('course_generated.eq.0,course_generated.is.null')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (createdBy != null) {
    query = query.eq('created_by', createdBy)
  }
  if (search) {
    query = query.ilike('title', `%${search}%`)
  }

  const { data: exams, error, count } = await query

  if (error) {
    console.error('Error fetching source exams:', error)
    return { data: [], count: 0 }
  }

  const creatorIds = [...new Set((exams || []).map((e: { created_by?: string }) => e.created_by).filter(Boolean))] as string[]
  let creatorNameMap: Record<string, string> = {}
  if (creatorIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', creatorIds)
    ;(profiles || []).forEach((p: { id: string; full_name: string | null }) => {
      creatorNameMap[p.id] = p.full_name?.trim() || 'Teacher'
    })
  }

  const data: SourceExamForFinalItem[] = (exams || []).map((e: { id: string; title: string; duration_minutes: number | null; questions?: unknown[]; created_by?: string }) => ({
    id: e.id,
    title: e.title,
    duration_minutes: e.duration_minutes,
    question_count: Array.isArray(e.questions) ? e.questions.length : 0,
    created_by: e.created_by,
    created_by_name: e.created_by ? creatorNameMap[e.created_by] ?? null : null,
  }))

  return { data, count: count ?? 0 }
}

export interface TeacherOption {
  id: string
  full_name: string
  exam_count: number
}

/**
 * List teachers in the org who have at least one exam (for school admin filter dropdown).
 */
export async function getTeachersWithExams(
  supabase: SupabaseClient,
  organizationId: string
): Promise<TeacherOption[]> {
  const { data: exams, error: examsError } = await supabase
    .from('exams')
    .select('created_by')
    .eq('organization_id', organizationId)
    .eq('is_archived', false)
    .or('course_generated.eq.0,course_generated.is.null')

  if (examsError || !exams?.length) return []

  const createdByCounts: Record<string, number> = {}
  exams.forEach((e: { created_by: string }) => {
    createdByCounts[e.created_by] = (createdByCounts[e.created_by] ?? 0) + 1
  })
  const creatorIds = Object.keys(createdByCounts)

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', creatorIds)
    .eq('profile_type', 'teacher')

  if (!profiles?.length) return []

  return profiles
    .map((p: { id: string; full_name: string | null }) => ({
      id: p.id,
      full_name: p.full_name?.trim() || 'Teacher',
      exam_count: createdByCounts[p.id] ?? 0,
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name))
}

/**
 * Get a single final exam by id with source exam and class/course names.
 */
export async function getFinalExamById(
  supabase: SupabaseClient,
  id: string
): Promise<FinalExamWithSource | null> {
  const { data, error } = await supabase
    .from('final_exams')
    .select(
      `
      *,
      source_exam:exams(id, title, duration_minutes, questions)
    `
    )
    .eq('id', id)
    .single()

  if (error || !data) return null

  const row = data as Record<string, unknown>

  const [classResult, courseResult, profileResult] = await Promise.all([
    row.class_id
      ? supabase.from('classes').select('name').eq('id', row.class_id).single()
      : null,
    row.course_id
      ? supabase.from('courses').select('title').eq('id', row.course_id).single()
      : null,
    row.created_by
      ? supabase.from('profiles').select('full_name').eq('id', row.created_by).single()
      : null,
  ])

  const class_name = (classResult?.data as { name: string } | null)?.name ?? null
  const course_title = (courseResult?.data as { title: string } | null)?.title ?? null
  const created_by_name = (profileResult?.data as { full_name: string | null } | null)?.full_name?.trim() ?? null

  const entries = row.source_entries as { selected_question_ids?: string[] }[] | null | undefined
  let total_question_count = 0
  if (Array.isArray(entries) && entries.length > 0) {
    total_question_count = entries.reduce((sum, e) => sum + (e.selected_question_ids?.length ?? 0), 0)
  } else {
    const sel = row.selected_question_ids as string[] | null | undefined
    const src = row.source_exam as { questions?: unknown[] } | null | undefined
    total_question_count = sel?.length ?? (Array.isArray(src?.questions) ? src.questions.length : 0)
  }

  return { ...row, class_name, course_title, created_by_name, total_question_count } as FinalExamWithSource
}

/**
 * Create a final exam. Caller must use admin client if RLS would block (e.g. school admin creating on behalf of org).
 * createdBy = profile id of the current user (teacher or school_admin).
 * Supports single source (source_exam_id + selected_question_ids) or multi-source (source_entries).
 */
export async function createFinalExam(
  supabase: SupabaseClient,
  organizationId: string,
  createdBy: string,
  input: CreateFinalExamInput
): Promise<{ data: FinalExam | null; error: string | null }> {
  const useMultiSource = Array.isArray(input.source_entries) && input.source_entries.length > 0
  const sourceExamId = useMultiSource
    ? (input.source_entries![0] as FinalExamSourceEntry).exam_id
    : input.source_exam_id
  const selectedQuestionIds = useMultiSource ? null : (input.selected_question_ids ?? null)
  const sourceEntries = useMultiSource ? input.source_entries : null

  if (!sourceExamId) {
    return { data: null, error: 'Either source_exam_id or source_entries is required.' }
  }

  const payload: Record<string, unknown> = {
    organization_id: organizationId,
    created_by: createdBy,
    source_exam_id: sourceExamId,
    title: input.title ?? null,
    selected_question_ids: selectedQuestionIds,
    source_entries: sourceEntries,
    class_id: input.class_id,
    course_id: input.course_id ?? null,
    start_time: input.start_time,
    end_time: input.end_time,
    duration_minutes: input.duration_minutes ?? null,
    question_mode: input.question_mode === 'random_pool' ? 'random_pool' : 'fixed_selection',
    questions_per_attempt:
      input.question_mode === 'random_pool'
        ? Math.max(1, Math.floor(Number(input.questions_per_attempt) || 1))
        : null,
    one_attempt_per_student: input.one_attempt_per_student !== false,
    show_result_to_student: input.show_result_to_student !== false,
    updated_at: new Date().toISOString(),
  }

  const { error, data } = await supabase
    .from('final_exams')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('Error creating final exam:', error)
    return { data: null, error: error.message }
  }
  return { data: data as FinalExam, error: null }
}

/**
 * Update a final exam.
 */
export async function updateFinalExam(
  supabase: SupabaseClient,
  id: string,
  input: UpdateFinalExamInput
): Promise<{ data: FinalExam | null; error: string | null }> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (input.title !== undefined) payload.title = input.title
  if (input.selected_question_ids !== undefined) payload.selected_question_ids = input.selected_question_ids
  if (input.source_entries !== undefined) {
    payload.source_entries = input.source_entries
    if (Array.isArray(input.source_entries) && input.source_entries.length > 0) {
      payload.source_exam_id = (input.source_entries[0] as FinalExamSourceEntry).exam_id
      payload.selected_question_ids = null
    }
  }
  if (input.class_id !== undefined) payload.class_id = input.class_id
  if (input.course_id !== undefined) payload.course_id = input.course_id
  if (input.start_time !== undefined) payload.start_time = input.start_time
  if (input.end_time !== undefined) payload.end_time = input.end_time
  if (input.duration_minutes !== undefined) payload.duration_minutes = input.duration_minutes
  if (input.question_mode !== undefined) {
    payload.question_mode = input.question_mode === 'random_pool' ? 'random_pool' : 'fixed_selection'
  }
  if (input.questions_per_attempt !== undefined) {
    payload.questions_per_attempt =
      input.questions_per_attempt == null ? null : Math.max(1, Math.floor(Number(input.questions_per_attempt) || 1))
  }
  if (input.question_mode === 'fixed_selection') {
    payload.questions_per_attempt = null
  }
  if (input.one_attempt_per_student !== undefined) payload.one_attempt_per_student = input.one_attempt_per_student
  if (input.show_result_to_student !== undefined) payload.show_result_to_student = input.show_result_to_student

  const { error, data } = await supabase
    .from('final_exams')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating final exam:', error)
    return { data: null, error: error.message }
  }
  return { data: data as FinalExam, error: null }
}

/**
 * Delete a final exam.
 */
export async function deleteFinalExam(
  supabase: SupabaseClient,
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('final_exams').delete().eq('id', id)
  if (error) {
    console.error('Error deleting final exam:', error)
    return { error: error.message }
  }
  return { error: null }
}

/**
 * Check if a student has already used their one attempt for this final exam.
 */
export async function studentHasAttemptForFinalExam(
  supabase: SupabaseClient,
  finalExamId: string,
  studentId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('exam_submissions')
    .select('id')
    .eq('final_exam_id', finalExamId)
    .eq('student_id', studentId)
    .limit(1)

  if (error) return true
  return (data?.length ?? 0) > 0
}
