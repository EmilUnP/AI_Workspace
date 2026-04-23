import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { getAvailableLessons } from '@eduator/core/utils/student-lessons'
import { getAvailableExams } from '@eduator/core/utils/student-exams'
import { getStudentCalendar } from '@eduator/core/utils/student-calendar'
import type { StudentCalendarExam } from '@eduator/core/utils/student-calendar'
import type {
  AssistantExam,
  AssistantLesson,
  TodayActivity,
  ClassUpdate,
  AssistantProgress,
} from '@eduator/ui'

export async function getAssistantData() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, organization_id')
    .eq('user_id', user.id)
    .single()
  if (!profile?.organization_id) return null

  const profileId = profile.id
  const organizationId = profile.organization_id

  async function getEnrolledClassIds(studentId: string) {
    const { data: enrollments } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('student_id', studentId)
      .eq('status', 'active')
    return enrollments?.map((e: { class_id: string }) => e.class_id) || []
  }

  async function getUpcomingExams(studentId: string, orgId: string): Promise<AssistantExam[]> {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const endOfFuture = new Date(now)
    endOfFuture.setDate(endOfFuture.getDate() + 60)
    const endOfFutureIso = endOfFuture.toISOString()
    const items = await getStudentCalendar(supabase, studentId, orgId, {
      fromDate: startOfToday,
      toDate: endOfFutureIso,
      includePast: false,
      limit: 30,
    })
    const exams = items.filter((item): item is StudentCalendarExam => item.type === 'exam')
    return exams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      class: exam.class_name,
      dueDate: exam.end_time.split('T')[0],
      duration: exam.duration_minutes ?? 30,
      finalExamId: exam.final_exam_id,
    }))
  }

  async function getTodayActivity(studentId: string): Promise<TodayActivity> {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString()
    const [lessonResult, examResult] = await Promise.all([
      supabase.from('lesson_progress').select('lesson_id').eq('student_id', studentId).gte('completed_at', startOfToday).lte('completed_at', endOfToday),
      supabase.from('exam_submissions').select('id').eq('student_id', studentId).gte('created_at', startOfToday).lte('created_at', endOfToday),
    ])
    return {
      didLesson: (lessonResult.data?.length ?? 0) > 0,
      didExam: (examResult.data?.length ?? 0) > 0,
      lessonCount: lessonResult.data?.length ?? 0,
      examCount: examResult.data?.length ?? 0,
    }
  }

  async function getClassUpdates(studentId: string, orgId: string): Promise<ClassUpdate[]> {
    const classIds = await getEnrolledClassIds(studentId)
    if (classIds.length === 0) return []

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const since = thirtyDaysAgo.toISOString()

    const baseLessonQuery = supabase
      .from('lessons')
      .select('id, title, created_at, class_id')
      .eq('organization_id', orgId)
      .in('class_id', classIds)
      .eq('is_archived', false)
      .eq('is_published', true)
    const baseExamQuery = supabase
      .from('exams')
      .select('id, title, created_at, class_id')
      .eq('organization_id', orgId)
      .in('class_id', classIds)
      .eq('is_archived', false)
      .eq('is_published', true)

    const [lessonsRes, examsRes] = await Promise.all([
      baseLessonQuery.gte('created_at', since).order('created_at', { ascending: false }).limit(10),
      baseExamQuery.gte('created_at', since).order('created_at', { ascending: false }).limit(10),
    ])

    let lessons = lessonsRes.data ?? []
    let exams = examsRes.data ?? []
    if (lessons.length === 0 && exams.length === 0) {
      const [fallbackLessons, fallbackExams] = await Promise.all([
        baseLessonQuery.order('created_at', { ascending: false }).limit(5),
        baseExamQuery.order('created_at', { ascending: false }).limit(5),
      ])
      lessons = fallbackLessons.data ?? []
      exams = fallbackExams.data ?? []
    }

    const classIdsUsed = [...new Set([...lessons.map((l: { class_id: string }) => l.class_id), ...exams.map((e: { class_id: string }) => e.class_id)])].filter(Boolean)
    let classMap: Record<string, string> = {}
    if (classIdsUsed.length > 0) {
      const { data: classes } = await supabase.from('classes').select('id, name').in('id', classIdsUsed)
      classMap = (classes ?? []).reduce((acc: Record<string, string>, c: { id: string; name: string }) => {
        acc[c.id] = c.name ?? 'Class'
        return acc
      }, {})
    }

    const updates: ClassUpdate[] = []
    for (const l of lessons) {
      updates.push({ type: 'lesson', id: l.id, title: l.title, class_name: classMap[l.class_id] ?? null, created_at: l.created_at })
    }
    for (const e of exams) {
      updates.push({ type: 'exam', id: e.id, title: e.title, class_name: classMap[e.class_id] ?? null, created_at: e.created_at })
    }
    updates.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return updates.slice(0, 15)
  }

  async function getProgress(studentId: string, orgId: string, lessons: { is_completed?: boolean; time_spent_seconds?: number | null }[]): Promise<AssistantProgress> {
    const lessonsCompleted = lessons.filter((l) => l.is_completed).length
    const lessonsTotal = Math.max(lessons.length, 1)
    const totalLessonMinutes = Math.round(lessons.reduce((sum, l) => sum + (l.time_spent_seconds ?? 0) / 60, 0))
    const lessonCompletionPercent = Math.round((lessonsCompleted / lessonsTotal) * 100)
    const exams = await getAvailableExams(supabase, studentId, orgId)
    const taken = exams.filter((e: { has_submitted?: boolean }) => e.has_submitted)
    const scores = taken.map((e: { best_score?: number | null }) => (typeof e.best_score === 'number' ? e.best_score : null)).filter((s): s is number => s !== null && !Number.isNaN(s))
    const averageExamScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
    const studyPulse = averageExamScore !== null ? Math.round((lessonCompletionPercent + averageExamScore) / 2) : lessonCompletionPercent
    return {
      lessonsCompleted,
      lessonsTotal,
      examsTaken: taken.length,
      averageExamScore,
      totalLessonMinutes,
      studyPulse: Math.min(100, Math.max(0, studyPulse)),
      streakDays: 0,
    }
  }

  const [upcomingExams, todayActivity, classUpdates, lessons] = await Promise.all([
    getUpcomingExams(profileId, organizationId),
    getTodayActivity(profileId),
    getClassUpdates(profileId, organizationId),
    getAvailableLessons(supabase, profileId, organizationId),
  ])

  const progress = await getProgress(profileId, organizationId, lessons)
  const recentLessons: AssistantLesson[] = lessons.slice(0, 10).map((l) => ({
    id: l.id,
    title: l.title,
    class_name: l.class_name,
    created_at: l.created_at,
    is_completed: l.is_completed,
    duration_minutes: l.duration_minutes,
  }))

  const parts: string[] = []
  if (todayActivity.didLesson) parts.push(`Today: completed ${todayActivity.lessonCount} lesson(s).`)
  else parts.push('Today: no lessons completed.')
  if (todayActivity.didExam) parts.push(`Today: took ${todayActivity.examCount} exam(s).`)
  else parts.push('Today: no exams taken.')
  parts.push(`Progress: ${progress.lessonsCompleted}/${progress.lessonsTotal} lessons completed, ${progress.totalLessonMinutes} min total. Study Pulse: ${progress.studyPulse}%.`)
  if (progress.averageExamScore !== null) parts.push(`Exams: ${progress.examsTaken} taken, average score ${progress.averageExamScore}%.`)
  else parts.push('No exams taken yet.')
  if (progress.streakDays > 0) parts.push(`${progress.streakDays} day streak.`)
  if (upcomingExams.length > 0) parts.push(`Upcoming exams: ${upcomingExams.map((e) => `${e.title} (${e.class}) on ${e.dueDate}`).join('; ')}.`)
  if (recentLessons.length > 0) parts.push(`Available lessons: ${recentLessons.slice(0, 5).map((l) => l.title).join(', ')}.`)
  if (classUpdates.length > 0) parts.push(`Recent class updates: ${classUpdates.slice(0, 5).map((u) => `${u.type} "${u.title}"`).join(', ')}.`)
  const contextSummary = parts.join(' ')

  return {
    studentName: profile.full_name || 'Student',
    variant: 'erp' as const,
    upcomingExams,
    recentLessons,
    todayActivity,
    classUpdates,
    progress,
    contextSummary,
    assistantActionPath: '/student/assistant/action',
    examsHref: '/student/exams',
    lessonsHref: '/student/lessons',
    progressHref: '/student/progress',
  }
}
