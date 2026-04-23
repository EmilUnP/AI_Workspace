/**
 * Shared utilities for student lessons functionality
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import type { LessonProgress } from '../types/lesson'

export interface StudentLessonItem {
  id: string
  title: string
  description?: string | null
  topic?: string | null
  duration_minutes?: number | null
  created_at: string
  class_name?: string | null
  class_id?: string | null
  is_published: boolean
  created_by?: string | null
  creator?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
  /** Convenience flags for quick UI badges. */
  has_audio?: boolean
  has_images?: boolean
  has_quiz?: boolean
   /** Whether the student has completed this lesson (from lesson_progress). */
  is_completed?: boolean
  /** First-time time spent in seconds (if recorded). */
  time_spent_seconds?: number | null
}

export interface StudentLessonDetailData {
  id: string
  title: string
  description?: string | null
  topic?: string | null
  duration_minutes?: number | null
  created_at: string
  class_id?: string | null
  class_name?: string | null
  is_published: boolean
  content?: unknown
  images?: unknown[]
  mini_test?: unknown[]
  learning_objectives?: unknown[]
  metadata?: Record<string, unknown> | null
  audio_url?: string | null
}

/**
 * Get a single lesson for a student (view detail).
 * Verifies the student is enrolled in the lesson's class.
 */
export async function getStudentLessonDetail(
  _supabase: SupabaseClient,
  lessonId: string,
  studentId: string,
  organizationId?: string | null
): Promise<StudentLessonDetailData | null> {
  const adminSupabase = createAdminClient()

  const { data: lessonMeta, error: metaError } = await adminSupabase
    .from('lessons')
    .select('class_id, organization_id')
    .eq('id', lessonId)
    .maybeSingle()

  if (metaError || !lessonMeta) {
    return null
  }

  if (!lessonMeta.class_id) {
    return null
  }

  if (organizationId && lessonMeta.organization_id !== organizationId) {
    return null
  }

  const { data: enrollment, error: enrollmentError } = await adminSupabase
    .from('class_enrollments')
    .select('id')
    .eq('class_id', lessonMeta.class_id)
    .eq('student_id', studentId)
    .eq('status', 'active')
    .maybeSingle()

  if (enrollmentError || !enrollment) {
    return null
  }

  const baseQuery = adminSupabase
    .from('lessons')
    .select(`
      id,
      title,
      description,
      topic,
      duration_minutes,
      created_at,
      is_published,
      class_id,
      content,
      images,
      mini_test,
      learning_objectives,
      metadata,
      audio_url,
      classes(name)
    `)
    .eq('id', lessonId)
    .eq('is_archived', false)

  const query = organizationId
    ? baseQuery.eq('organization_id', organizationId)
    : baseQuery

  const { data: lesson, error } = await query.single()

  if (error || !lesson) {
    return null
  }

  const classData = (lesson as any).classes
  const className = Array.isArray(classData)
    ? (classData[0] as any)?.name
    : (classData as any)?.name ?? null

  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    topic: lesson.topic,
    duration_minutes: lesson.duration_minutes,
    created_at: lesson.created_at,
    class_id: lesson.class_id,
    class_name: className,
    is_published: lesson.is_published,
    content: (lesson as any).content,
    images: Array.isArray((lesson as any).images) ? (lesson as any).images : [],
    mini_test: Array.isArray((lesson as any).mini_test) ? (lesson as any).mini_test : [],
    learning_objectives: Array.isArray((lesson as any).learning_objectives) ? (lesson as any).learning_objectives : [],
    metadata: (lesson as any).metadata && typeof (lesson as any).metadata === 'object' ? (lesson as any).metadata : null,
    audio_url: (lesson as any).audio_url ?? null,
  }
}

/**
 * Get available lessons for a student
 * Uses admin client to bypass RLS and shows all lessons (including drafts) like in class detail page
 */
export async function getAvailableLessons(
  supabase: SupabaseClient,
  studentId: string,
  organizationId?: string | null
): Promise<StudentLessonItem[]> {
  // Verify student enrollment first using regular client
  const { data: enrollments } = await supabase
    .from('class_enrollments')
    .select('class_id')
    .eq('student_id', studentId)
    .eq('status', 'active')
  
  const classIds = enrollments?.map(e => e.class_id) || []
  
  if (classIds.length === 0) {
    return []
  }
  
  // Use admin client to bypass RLS (we've already verified enrollment)
  const adminSupabase = createAdminClient()
  
  // Build lesson query - removed is_published filter to show all lessons like in class detail; exclude course-generated
  const baseQuery = adminSupabase
    .from('lessons')
    .select(`
      id,
      title,
      description,
      topic,
      duration_minutes,
      created_at,
      is_published,
      class_id,
      created_by,
      images,
      mini_test,
      audio_url,
      classes(name),
      creator:profiles!created_by(
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('is_archived', false)
    .in('class_id', classIds)
    .or('course_generated.eq.0,course_generated.is.null')
    .order('created_at', { ascending: false })
  
  // Add organization filter for ERP
  const lessonQuery = organizationId 
    ? baseQuery.eq('organization_id', organizationId)
    : baseQuery
  
  const { data: lessons, error } = await lessonQuery
  
  if (error) {
    console.error('Error fetching lessons:', error)
    return []
  }
  
  if (!lessons || lessons.length === 0) {
    return []
  }

  // Fetch existing progress for these lessons for this student (optional enhancement)
  const lessonIds = lessons.map((l: any) => l.id)
  const { data: progressRows } = await adminSupabase
    .from('lesson_progress')
    .select('lesson_id, time_spent_seconds, completed_at')
    .eq('student_id', studentId)
    .in('lesson_id', lessonIds)

  const progressByLessonId = new Map<string, { time_spent_seconds: number | null; completed_at: string | null }>()
  ;(progressRows || []).forEach((row: any) => {
    progressByLessonId.set(row.lesson_id, {
      time_spent_seconds: row.time_spent_seconds ?? null,
      completed_at: row.completed_at ?? null,
    })
  })

  // Format lessons for display
  return lessons.map((lesson: any) => {
    const classData: any = lesson.classes
    const className = Array.isArray(classData)
      ? (classData[0] as any)?.name
      : (classData as any)?.name || null

    const creator = Array.isArray(lesson.creator)
      ? lesson.creator[0]
      : lesson.creator || null

    const progress = progressByLessonId.get(lesson.id)

    return {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      topic: lesson.topic,
      duration_minutes: lesson.duration_minutes,
      created_at: lesson.created_at,
      class_name: className,
      class_id: lesson.class_id,
      is_published: lesson.is_published,
      created_by: lesson.created_by,
      creator: creator
        ? {
            id: creator.id,
            full_name: creator.full_name,
            avatar_url: creator.avatar_url,
          }
        : null,
      has_audio: Boolean((lesson as any).audio_url),
      has_images: Array.isArray((lesson as any).images) && (lesson as any).images.length > 0,
      has_quiz: Array.isArray((lesson as any).mini_test) && (lesson as any).mini_test.length > 0,
      is_completed: Boolean(progress?.completed_at),
      time_spent_seconds: progress?.time_spent_seconds ?? null,
    }
  })
}

/**
 * Get existing progress for a student on a given lesson.
 */
export async function getStudentLessonProgress(
  supabase: SupabaseClient,
  lessonId: string,
  studentId: string
): Promise<LessonProgress | null> {
  const { data, error } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('lesson_id', lessonId)
    .eq('student_id', studentId)
    .maybeSingle()

  if (error || !data) {
    return null
  }
  return data as LessonProgress
}

/**
 * Mark a lesson as completed for a student, recording first-time time_spent_seconds.
 * If a completed row already exists, it will NOT overwrite the original completion time.
 */
export async function upsertLessonCompletion(
  supabase: SupabaseClient,
  lessonId: string,
  studentId: string,
  timeSpentSeconds: number
): Promise<{ success: boolean; error?: string }> {
  const existing = await getStudentLessonProgress(supabase, lessonId, studentId)

  const now = new Date().toISOString()
  const safeTime = Math.max(1, Math.floor(timeSpentSeconds || 0))

  if (existing && existing.completed_at) {
    // Already completed previously – keep original first-time stats
    return { success: true }
  }

  if (existing) {
    const { error } = await supabase
      .from('lesson_progress')
      .update({
        time_spent_seconds: existing.time_spent_seconds || safeTime,
        completed_at: now,
        // preserve current_section/completed_sections/notes as-is
      })
      .eq('id', existing.id)

    if (error) {
      console.error('upsertLessonCompletion update error:', error)
      return { success: false, error: error.message }
    }
    return { success: true }
  }

  const { error } = await supabase.from('lesson_progress').insert({
    lesson_id: lessonId,
    student_id: studentId,
    current_section: 0,
    completed_sections: [],
    time_spent_seconds: safeTime,
    started_at: now,
    completed_at: now,
    notes: null,
  })

  if (error) {
    console.error('upsertLessonCompletion insert error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Restart a lesson for a student so they can begin a fresh session.
 * Clears completion status and tracked time for this lesson progress row.
 */
export async function restartLessonProgress(
  supabase: SupabaseClient,
  lessonId: string,
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  const existing = await getStudentLessonProgress(supabase, lessonId, studentId)

  if (!existing) {
    // No row yet means effectively "not completed / fresh".
    return { success: true }
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('lesson_progress')
    .update({
      completed_at: null,
      time_spent_seconds: 0,
      started_at: now,
      // keep current_section/completed_sections/notes unchanged
    })
    .eq('id', existing.id)

  if (error) {
    console.error('restartLessonProgress update error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
