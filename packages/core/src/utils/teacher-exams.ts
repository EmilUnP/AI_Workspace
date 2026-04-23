/**
 * Shared utilities for teacher exams list (ERP + ERP)
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export const TEACHER_EXAMS_PER_PAGE = 20

export interface TeacherExamListParams {
  search?: string
  status?: string
  page?: string
  classId?: string
}

export interface EnrichedTeacherExam {
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
  questions?: unknown
  duration_minutes?: number | null
  language?: string | null
  translations?: unknown
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at?: string | null
  questionCount: number
  languages: string[]
  topics: string[]
  usedInClass: boolean
  usedInCalendar: boolean
  className: string | null
}

export interface TeacherExamStats {
  total: number
  published: number
  draft: number
  totalQuestions: number
}

export function extractExamLanguages(exam: {
  language?: string | null
  translations?: unknown
}): string[] {
  const languages: string[] = []
  const primaryLang = exam.language || 'en'
  languages.push(primaryLang)
  if (exam.translations && typeof exam.translations === 'object' && !Array.isArray(exam.translations)) {
    const translationKeys = Object.keys(exam.translations as Record<string, unknown>)
    translationKeys.forEach((lang) => {
      if (!languages.includes(lang)) languages.push(lang)
    })
  }
  return languages
}

export function extractExamTopics(exam: { questions?: unknown }): string[] {
  if (!Array.isArray(exam.questions)) return []
  const topicSet = new Set<string>()
  exam.questions.forEach((q: { topics?: string[] }) => {
    if (q.topics && Array.isArray(q.topics)) {
      q.topics.forEach((topic: string) => {
        if (topic && topic.trim()) topicSet.add(topic.trim())
      })
    }
  })
  return Array.from(topicSet).sort()
}

export async function getTeacherExams(
  supabase: SupabaseClient,
  teacherId: string,
  organizationId: string,
  params: TeacherExamListParams
): Promise<{ data: EnrichedTeacherExam[]; count: number; page: number }> {
  const page = Math.max(1, parseInt(params.page || '1', 10))
  const offset = (page - 1) * TEACHER_EXAMS_PER_PAGE

  let query = supabase
    .from('exams')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('created_by', teacherId)
    .eq('is_archived', false)
    .or('course_generated.eq.0,course_generated.is.null')
    .order('created_at', { ascending: false })
    .range(offset, offset + TEACHER_EXAMS_PER_PAGE - 1)

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

  const { data: exams, error, count } = await query

  if (error) {
    console.error('Error fetching exams:', error)
    return { data: [], count: 0, page }
  }

  if (!exams || exams.length === 0) {
    return { data: [], count: count || 0, page }
  }

  const classIds = [...new Set((exams as { class_id?: string }[]).map((e) => e.class_id).filter(Boolean))] as string[]
  let classMap: Record<string, string> = {}
  if (classIds.length > 0) {
    const { data: classes } = await supabase.from('classes').select('id, name').in('id', classIds)
    classMap = (classes || []).reduce((acc, c) => {
      acc[c.id] = c.name
      return acc
    }, {} as Record<string, string>)
  }

  const data: EnrichedTeacherExam[] = (exams as Record<string, unknown>[]).map((exam) => {
    const classId = exam.class_id as string | undefined
    const startTime = exam.start_time as string | undefined
    const endTime = exam.end_time as string | undefined

    return {
      ...exam,
      questionCount: Array.isArray(exam.questions) ? exam.questions.length : 0,
      languages: extractExamLanguages(exam as { language?: string; translations?: unknown }),
      topics: extractExamTopics(exam),
      usedInClass: !!classId,
      usedInCalendar: !!(startTime && endTime),
      className: classId ? classMap[classId] || null : null,
    } as EnrichedTeacherExam
  })

  return { data, count: count || 0, page }
}

export async function getTeacherExamStats(
  supabase: SupabaseClient,
  teacherId: string,
  organizationId: string
): Promise<TeacherExamStats> {
  const { data: exams } = await supabase
    .from('exams')
    .select('is_published, questions')
    .eq('organization_id', organizationId)
    .eq('created_by', teacherId)
    .eq('is_archived', false)
    .or('course_generated.eq.0,course_generated.is.null')

  const allExams = exams || []
  return {
    total: allExams.length,
    published: allExams.filter((e) => e.is_published).length,
    draft: allExams.filter((e) => !e.is_published).length,
    totalQuestions: allExams.reduce(
      (sum, e) => sum + (Array.isArray(e.questions) ? e.questions.length : 0),
      0
    ),
  }
}
