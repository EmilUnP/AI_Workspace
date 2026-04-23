import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getStudentCalendar } from '@eduator/core/utils/student-calendar'
import type { StudentCalendarExam } from '@eduator/core/utils/student-calendar'
import { StudentDashboardClient } from '@eduator/ui'
import type { UpcomingExam, StudentDashboardTranslations } from '@eduator/ui'

type SupabaseClient = Awaited<ReturnType<typeof createServerClient>>

async function getStudentInfo(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      *,
      organizations(*)
    `)
    .eq('user_id', user.id)
    .single()

  if (!profile) return null

  const org = Array.isArray(profile.organizations)
    ? profile.organizations[0]
    : profile.organizations

  return { profile, organization: org, profileId: profile.id }
}

async function getStudentStats(supabase: SupabaseClient, studentId: string, organizationId: string) {
  const { data: enrollments } = await supabase
    .from('class_enrollments')
    .select('class_id')
    .eq('student_id', studentId)
    .eq('status', 'active')

  const classIds = enrollments?.map((e) => e.class_id) || []

  let availableExams = 0
  if (classIds.length > 0) {
    const { count } = await supabase
      .from('exams')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_published', true)
      .eq('is_archived', false)
      .in('class_id', classIds)
    availableExams = count ?? 0
  }

  const { data: submissions } = await supabase
    .from('exam_submissions')
    .select('exam_id, score')
    .eq('student_id', studentId)
    .not('score', 'is', null)

  const scores = (submissions ?? []).map((s: { score: number | null }) => Number(s.score)).filter((n) => !Number.isNaN(n))
  const completedExams = new Set((submissions ?? []).map((s: { exam_id: string }) => s.exam_id)).size
  const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  return {
    enrolledClasses: classIds.length,
    availableExams,
    completedExams,
    averageScore,
  }
}

async function getUpcomingExams(supabase: SupabaseClient, studentId: string, organizationId: string): Promise<UpcomingExam[]> {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const endOfFuture = new Date(now)
  endOfFuture.setDate(endOfFuture.getDate() + 60)
  const endOfFutureIso = endOfFuture.toISOString()
  const items = await getStudentCalendar(supabase, studentId, organizationId, {
    fromDate: startOfToday,
    toDate: endOfFutureIso,
    includePast: false,
    limit: 15,
  })
  const exams = items.filter((item): item is StudentCalendarExam => item.type === 'exam')
  return exams.slice(0, 10).map((exam) => ({
    id: exam.id,
    title: exam.title,
    class: exam.class_name,
    dueDate: exam.end_time.split('T')[0],
    duration: exam.duration_minutes ?? 30,
    finalExamId: exam.final_exam_id,
  }))
}

export default async function StudentDashboard() {
  const supabase = await createServerClient()
  const data = await getStudentInfo(supabase)

  if (!data?.profile) {
    redirect('/auth/login')
  }

  const { profile, organization, profileId } = data

  if (!profile.organization_id) redirect('/auth/access-denied')

  const [stats, upcomingExams, td] = await Promise.all([
    getStudentStats(supabase, profileId, profile.organization_id),
    getUpcomingExams(supabase, profileId, profile.organization_id),
    getTranslations('studentDashboard'),
  ])

  const translations: StudentDashboardTranslations = {
    enrolledClasses: td('enrolledClasses'),
    availableExams: td('availableExams'),
    examsCompleted: td('examsCompleted'),
    completedExams: td('completedExams'),
    averageScore: td('averageScore'),
    learningStreak: td('learningStreak'),
    takeExamToSeeScore: td('takeExamToSeeScore'),
    keepItUp: td('keepItUp'),
    streakStart: td('streakStart'),
    days: td('days'),
    upcomingExams: td('upcomingExams'),
    dontMissDeadlines: td('dontMissDeadlines'),
    viewAll: td('viewAll'),
    noUpcomingExams: td('noUpcomingExams'),
    myOrganization: td('myOrganization'),
    organization: td('organization'),
    plan: td('plan'),
    recentActivity: td('recentActivity'),
    yourLearningJourney: td('yourLearningJourney'),
    needHelpStudying: td('needHelpStudying'),
    aiTutorDescription: td('aiTutorDescription'),
    chatNow: td('chatNow'),
    viewProfile: td('viewProfile'),
  }

  return (
    <StudentDashboardClient
      profile={profile}
      organization={organization || null}
      stats={stats}
      upcomingExams={upcomingExams}
      variant="erp"
      translations={translations}
    />
  )
}
