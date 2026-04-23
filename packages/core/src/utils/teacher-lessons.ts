/**
 * Shared utilities for teacher lessons list (ERP + ERP)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeLanguageCode } from '@eduator/config'

export const TEACHER_LESSONS_PER_PAGE = 20

export interface TeacherLessonListParams {
  search?: string
  status?: string
  page?: string
  classId?: string
}

export interface EnrichedTeacherLesson {
  id: string
  title: string
  description?: string | null
  organization_id: string
  created_by: string
  class_id?: string | null
  start_time?: string | null
  end_time?: string | null
  is_published: boolean
  is_archived: boolean
  duration_minutes?: number | null
  learning_objectives?: unknown
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at?: string | null
  classes?: { id: string; name: string; class_code?: string } | { id: string; name: string; class_code?: string }[] | null
  objectivesCount: number
  className: string | null
  usedInClass: boolean
  usedInCalendar: boolean
  languages: string[]
}

export function extractLessonLanguages(lesson: {
  language?: string | null
  translations?: unknown
  metadata?: Record<string, unknown> | null
}): string[] {
  const languages: string[] = []
  // Use top-level language first; fall back to metadata.language. Always normalize to 2-letter code so flags display correctly.
  const meta = lesson.metadata as { language?: string } | undefined
  const primaryLang = normalizeLanguageCode(lesson.language || meta?.language)
  languages.push(primaryLang)
  if (lesson.translations && typeof lesson.translations === 'object' && !Array.isArray(lesson.translations)) {
    const translationKeys = Object.keys(lesson.translations as Record<string, unknown>)
    translationKeys.forEach((lang) => {
      const code = normalizeLanguageCode(lang)
      if (code && !languages.includes(code)) languages.push(code)
    })
  }
  return languages
}

export interface TeacherLessonStats {
  total: number
  published: number
  draft: number
  totalDuration: number
}

export async function getTeacherLessons(
  supabase: SupabaseClient,
  teacherId: string,
  organizationId: string,
  params: TeacherLessonListParams
): Promise<{ data: EnrichedTeacherLesson[]; count: number; page: number }> {
  const page = Math.max(1, parseInt(params.page || '1', 10))
  const offset = (page - 1) * TEACHER_LESSONS_PER_PAGE

  // Exclude course-generated lessons; they are only visible inside the related course.
  let query = supabase
    .from('lessons')
    .select(
      `
      *,
      classes(id, name, class_code)
    `,
      { count: 'exact' }
    )
    .eq('organization_id', organizationId)
    .eq('created_by', teacherId)
    .eq('is_archived', false)
    .or('course_generated.eq.0,course_generated.is.null')
    .order('created_at', { ascending: false })
    .range(offset, offset + TEACHER_LESSONS_PER_PAGE - 1)

  if (params.search) {
    query = query.ilike('title', `%${params.search}%`)
  }
  if (params.status === 'published') {
    query = query.eq('is_published', true)
  } else if (params.status === 'draft') {
    query = query.eq('is_published', false)
  }
  if (params.classId) {
    query = query.eq('class_id', params.classId)
  }

  const { data: lessons, error, count } = await query

  if (error) {
    console.error('Error fetching lessons:', error)
    return { data: [], count: 0, page }
  }

  if (!lessons || lessons.length === 0) {
    return { data: [], count: count || 0, page }
  }

  const data: EnrichedTeacherLesson[] = (lessons as Record<string, unknown>[]).map((lesson) => {
    const classes = lesson.classes as { name: string } | { name: string }[] | null
    const className = classes
      ? Array.isArray(classes)
        ? (classes[0] as { name: string } | undefined)?.name ?? null
        : (classes as { name: string }).name
      : null
    const classId = lesson.class_id as string | undefined
    const startTime = lesson.start_time as string | undefined
    const endTime = lesson.end_time as string | undefined

    return {
      ...lesson,
      objectivesCount: Array.isArray(lesson.learning_objectives) ? lesson.learning_objectives.length : 0,
      className,
      usedInClass: !!classId,
      usedInCalendar: !!(startTime && endTime),
      languages: extractLessonLanguages(lesson as { language?: string; translations?: unknown }),
    } as EnrichedTeacherLesson
  })

  return { data, count: count || 0, page }
}

export async function getTeacherLessonStats(
  supabase: SupabaseClient,
  teacherId: string,
  organizationId: string
): Promise<TeacherLessonStats> {
  const { data: lessons } = await supabase
    .from('lessons')
    .select('is_published, duration_minutes, learning_objectives')
    .eq('organization_id', organizationId)
    .eq('created_by', teacherId)
    .eq('is_archived', false)
    .or('course_generated.eq.0,course_generated.is.null') // same as list: only standalone lessons for stats

  const allLessons = lessons || []
  return {
    total: allLessons.length,
    published: allLessons.filter((l) => l.is_published).length,
    draft: allLessons.filter((l) => !l.is_published).length,
    totalDuration: allLessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0),
  }
}
