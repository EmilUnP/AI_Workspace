/**
 * Student calendar: upcoming and past scheduled lessons and exams
 * (items with start_time/end_time from teacher calendar)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@eduator/auth/supabase/admin'

export interface StudentCalendarExam {
  id: string
  type: 'exam'
  title: string
  class_id: string
  class_name: string
  start_time: string
  end_time: string
  duration_minutes?: number | null
  question_count?: number
  is_published: boolean
  /** true if now is within [start_time, end_time] */
  is_available_now: boolean
  /** true if start_time > now */
  is_upcoming: boolean
  /** When set, this is a final exam instance; use final_exam_id for take URL and one-attempt enforcement */
  final_exam_id?: string
}

export interface StudentCalendarLesson {
  id: string
  type: 'lesson'
  title: string
  class_id: string
  class_name: string
  start_time: string
  end_time: string
  duration_minutes?: number | null
  is_published: boolean
  is_available_now: boolean
  is_upcoming: boolean
}

export type StudentCalendarItem = StudentCalendarExam | StudentCalendarLesson

export interface StudentCalendarOptions {
  /** only include items with start_time on or after this date (ISO string) */
  fromDate?: string
  /** only include items with end_time on or before this date */
  toDate?: string
  /** if true, include past items; default true */
  includePast?: boolean
  /** max items to return; default 50 */
  limit?: number
}

/**
 * Get calendar-scheduled exams and lessons for a student (their enrolled classes).
 * Only includes items that have start_time and end_time set (scheduled from teacher calendar).
 */
export async function getStudentCalendar(
  supabase: SupabaseClient,
  studentId: string,
  organizationId: string | null | undefined,
  options: StudentCalendarOptions = {}
): Promise<StudentCalendarItem[]> {
  const { fromDate, toDate, includePast = true, limit = 50 } = options

  const { data: enrollments } = await supabase
    .from('class_enrollments')
    .select('class_id')
    .eq('student_id', studentId)
    .eq('status', 'active')

  const classIds = enrollments?.map((e) => e.class_id) || []
  if (classIds.length === 0) return []

  const admin = createAdminClient()
  const now = new Date()

  // Scheduled exams (have start_time and end_time); exclude course-generated (visible only in course)
  let examsQuery = admin
    .from('exams')
    .select('id, title, class_id, start_time, end_time, duration_minutes, questions, is_published')
    .eq('is_archived', false)
    .in('class_id', classIds)
    .or('course_generated.eq.0,course_generated.is.null')
    .not('start_time', 'is', null)
    .not('end_time', 'is', null)
    .order('start_time', { ascending: true })

  if (organizationId) {
    examsQuery = examsQuery.eq('organization_id', organizationId)
  }
  if (fromDate) {
    examsQuery = examsQuery.gte('start_time', fromDate)
  }
  if (toDate) {
    examsQuery = examsQuery.lte('end_time', toDate)
  }

  const { data: exams } = await examsQuery.limit(limit)

  // Scheduled lessons; exclude course-generated (visible only in course)
  let lessonsQuery = admin
    .from('lessons')
    .select('id, title, class_id, start_time, end_time, duration_minutes, is_published')
    .eq('is_archived', false)
    .in('class_id', classIds)
    .or('course_generated.eq.0,course_generated.is.null')
    .not('start_time', 'is', null)
    .not('end_time', 'is', null)
    .order('start_time', { ascending: true })

  if (organizationId) {
    lessonsQuery = lessonsQuery.eq('organization_id', organizationId)
  }
  if (fromDate) {
    lessonsQuery = lessonsQuery.gte('start_time', fromDate)
  }
  if (toDate) {
    lessonsQuery = lessonsQuery.lte('end_time', toDate)
  }

  const { data: lessons } = await lessonsQuery.limit(limit)

  // Final exams (scheduled instances from teacher/school-admin)
  let finalExamsQuery = admin
    .from('final_exams')
    .select('id, source_exam_id, title, class_id, start_time, end_time, one_attempt_per_student')
    .in('class_id', classIds)
    .order('start_time', { ascending: true })
  if (organizationId) {
    finalExamsQuery = finalExamsQuery.eq('organization_id', organizationId)
  }
  if (fromDate) finalExamsQuery = finalExamsQuery.gte('start_time', fromDate)
  if (toDate) finalExamsQuery = finalExamsQuery.lte('end_time', toDate)
  const { data: finalExams } = await finalExamsQuery.limit(limit)

  const classIdsUsed = [
    ...new Set([
      ...(exams?.map((e: any) => e.class_id) || []),
      ...(lessons?.map((l: any) => l.class_id) || []),
      ...(finalExams?.map((f: any) => f.class_id) || []),
    ]),
  ].filter(Boolean) as string[]

  let classMap: Record<string, string> = {}
  if (classIdsUsed.length > 0) {
    const { data: classes } = await admin
      .from('classes')
      .select('id, name')
      .in('id', classIdsUsed)
    classMap = (classes || []).reduce((acc, c) => {
      acc[c.id] = c.name
      return acc
    }, {} as Record<string, string>)
  }

  const items: StudentCalendarItem[] = []

  ;(exams || []).forEach((exam: any) => {
    const start = new Date(exam.start_time)
    const end = new Date(exam.end_time)
    const isUpcoming = start > now
    const isPast = end < now
    if (!includePast && isPast) return
    items.push({
      id: exam.id,
      type: 'exam',
      title: exam.title,
      class_id: exam.class_id,
      class_name: classMap[exam.class_id] || 'Class',
      start_time: exam.start_time,
      end_time: exam.end_time,
      duration_minutes: exam.duration_minutes,
      question_count: Array.isArray(exam.questions) ? exam.questions.length : 0,
      is_published: exam.is_published,
      is_available_now: start <= now && end >= now,
      is_upcoming: isUpcoming,
    })
  })

  ;(lessons || []).forEach((lesson: any) => {
    const start = new Date(lesson.start_time)
    const end = new Date(lesson.end_time)
    const isUpcoming = start > now
    const isPast = end < now
    if (!includePast && isPast) return
    items.push({
      id: lesson.id,
      type: 'lesson',
      title: lesson.title,
      class_id: lesson.class_id,
      class_name: classMap[lesson.class_id] || 'Class',
      start_time: lesson.start_time,
      end_time: lesson.end_time,
      duration_minutes: lesson.duration_minutes,
      is_published: lesson.is_published,
      is_available_now: start <= now && end >= now,
      is_upcoming: isUpcoming,
    })
  })

  ;(finalExams || []).forEach((fe: any) => {
    const start = new Date(fe.start_time)
    const end = new Date(fe.end_time)
    const isUpcoming = start > now
    const isPast = end < now
    if (!includePast && isPast) return
    items.push({
      id: fe.source_exam_id,
      type: 'exam',
      title: fe.title || 'Final exam',
      class_id: fe.class_id,
      class_name: classMap[fe.class_id] || 'Class',
      start_time: fe.start_time,
      end_time: fe.end_time,
      is_published: true,
      is_available_now: start <= now && end >= now,
      is_upcoming: isUpcoming,
      final_exam_id: fe.id,
    })
  })

  items.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  return items.slice(0, limit)
}
