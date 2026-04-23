'use client'

import Link from 'next/link'
import { 
  BookOpen, 
  FileText, 
  TrendingUp, 
  MessageSquare, 
  Clock, 
  CheckCircle
} from 'lucide-react'
import { StatCard } from '../analytics/stat-card'
import { DashboardCard } from '../analytics/dashboard-card'
import { Badge } from '../ui/badge'
import { DashboardHeader } from '../teacher/dashboard-header'
import { getGreeting } from '../../utils/teacher-dashboard'

export interface UpcomingExam {
  id: string
  title: string
  class: string
  dueDate: string
  duration: number
  /** When set, link should include ?finalExamId= for the take page */
  finalExamId?: string
}

export interface RecentActivity {
  type: 'exam' | 'class'
  title: string
  score?: number
  date: string
}

export interface StudentDashboardStats {
  enrolledClasses: number
  availableExams: number
  completedExams: number
  averageScore: number
  streakDays?: number
}

export interface StudentDashboardTranslations {
  enrolledClasses: string
  availableExams: string
  examsCompleted: string
  completedExams: string
  averageScore: string
  learningStreak: string
  takeExamToSeeScore: string
  keepItUp: string
  streakStart: string
  days: string
  upcomingExams: string
  dontMissDeadlines: string
  viewAll: string
  noUpcomingExams: string
  myOrganization: string
  organization: string
  plan: string
  recentActivity: string
  yourLearningJourney: string
  needHelpStudying: string
  aiTutorDescription: string
  chatNow: string
  viewProfile: string
}

const DEFAULT_STUDENT_DASHBOARD_TRANSLATIONS: StudentDashboardTranslations = {
  enrolledClasses: 'Enrolled Classes',
  availableExams: 'Available Exams',
  examsCompleted: 'Exams Completed',
  completedExams: 'Completed Exams',
  averageScore: 'Average Score',
  learningStreak: 'Learning Streak',
  takeExamToSeeScore: 'Take an exam to see your score',
  keepItUp: 'Keep it up!',
  streakStart: 'Complete a lesson or exam to start',
  days: 'days',
  upcomingExams: 'Upcoming Exams',
  dontMissDeadlines: "Don't miss these deadlines",
  viewAll: 'View all',
  noUpcomingExams: 'No upcoming exams. Enjoy your break!',
  myOrganization: 'My Organization',
  organization: 'Organization',
  plan: 'Plan',
  recentActivity: 'Recent Activity',
  yourLearningJourney: 'Your learning journey',
  needHelpStudying: 'Need help studying?',
  aiTutorDescription: 'Our AI tutor is available 24/7 to explain concepts, help with homework, and answer your questions.',
  chatNow: 'Chat Now',
  viewProfile: 'View profile',
}

export interface StudentDashboardClientProps {
  profile: {
    full_name?: string | null
  }
  organization?: {
    name?: string | null
    subscription_plan?: string | null
  } | null
  stats: StudentDashboardStats
  upcomingExams: UpcomingExam[]
  recentActivity?: RecentActivity[]
  variant?: 'erp'
  translations?: Partial<StudentDashboardTranslations>
}

export function StudentDashboardClient({
  profile,
  organization,
  stats,
  upcomingExams,
  recentActivity,
  variant = 'erp',
  translations: translationsProp,
}: StudentDashboardClientProps) {
  const isERP = variant === 'erp'
  const chatPath = '/student/chat'
  const t = { ...DEFAULT_STUDENT_DASHBOARD_TRANSLATIONS, ...translationsProp }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header with Gradient — no duplicate chat CTA; sidebar and bottom CTA link to chat */}
      <DashboardHeader
        greeting={getGreeting()}
        name={profile.full_name || 'Student'}
        organizationName={organization?.name || undefined}
        variant={variant}
      />

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t.enrolledClasses}
          value={stats.enrolledClasses}
          icon={<BookOpen className="h-6 w-6" />}
        />
        <StatCard
          title={isERP ? t.availableExams : t.examsCompleted}
          value={isERP ? stats.availableExams : stats.completedExams}
          icon={<FileText className="h-6 w-6" />}
        />
        {isERP ? (
          <StatCard
            title={t.completedExams}
            value={stats.completedExams}
            icon={<CheckCircle className="h-6 w-6" />}
          />
        ) : (
          <StatCard
            title={t.averageScore}
            value={stats.averageScore > 0 ? `${stats.averageScore}%` : '—'}
            icon={<TrendingUp className="h-6 w-6" />}
            trend={stats.averageScore > 0 ? { value: 0, direction: 'up' } : undefined}
            description={stats.averageScore === 0 ? t.takeExamToSeeScore : undefined}
          />
        )}
        {isERP ? (
          <StatCard
            title={t.averageScore}
            value={stats.averageScore > 0 ? `${stats.averageScore}%` : '—'}
            icon={<TrendingUp className="h-6 w-6" />}
            trend={stats.averageScore > 0 ? { value: 0, direction: 'up' } : undefined}
          />
        ) : (
          <StatCard
            title={t.learningStreak}
            value={stats.streakDays ? `${stats.streakDays} ${t.days}` : '—'}
            icon={<CheckCircle className="h-6 w-6" />}
            description={stats.streakDays ? t.keepItUp : t.streakStart}
          />
        )}
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Exams */}
        <DashboardCard
          title={t.upcomingExams}
          description={t.dontMissDeadlines}
          actions={
            <Link
              href="/student/exams"
              className="text-sm font-medium text-green-600 hover:text-green-700"
            >
              {t.viewAll}
            </Link>
          }
        >
          <div className="space-y-4">
            {upcomingExams.length > 0 ? (
              upcomingExams.map((exam) => (
                <Link
                  key={exam.finalExamId ? `fe-${exam.finalExamId}` : exam.id}
                  href={`/student/exams/${exam.id}${exam.finalExamId ? `?finalExamId=${encodeURIComponent(exam.finalExamId)}` : ''}`}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-amber-100 p-2 text-amber-600">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{exam.title}</h4>
                      <p className="text-sm text-gray-500">{exam.class}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {isERP ? new Date(exam.dueDate).toLocaleDateString() : `Due: ${new Date(exam.dueDate).toLocaleDateString()}`}
                    </p>
                    <p className="text-sm text-gray-500">{exam.duration} min</p>
                  </div>
                </Link>
              ))
            ) : (
              <p className="py-4 text-center text-gray-500">
                {t.noUpcomingExams}
              </p>
            )}
          </div>
        </DashboardCard>

        {/* Organization Info (ERP) or Recent Activity (ERP) */}
        {isERP && organization ? (
          <DashboardCard
            title={t.myOrganization}
            description={organization.name || undefined}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t.organization}</span>
                <span className="text-sm font-medium text-gray-900">{organization.name}</span>
              </div>
              {organization.subscription_plan && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t.plan}</span>
                  <Badge variant="secondary">
                    {organization.subscription_plan.charAt(0).toUpperCase() + organization.subscription_plan.slice(1)}
                  </Badge>
                </div>
              )}
            </div>
          </DashboardCard>
        ) : recentActivity && recentActivity.length > 0 ? (
          <DashboardCard
            title={t.recentActivity}
            description={t.yourLearningJourney}
          >
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className={`rounded-full p-2 ${
                    activity.type === 'exam'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {activity.type === 'exam' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <BookOpen className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{activity.title}</p>
                    <div className="flex items-center gap-2">
                      {activity.score && (
                        <Badge variant={activity.score >= 80 ? 'success' : 'warning'}>
                          {activity.score}%
                        </Badge>
                      )}
                      <span className="text-sm text-gray-500">{activity.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>
        ) : null}
      </div>

      {/* AI Tutor CTA */}
      <div className="rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t.needHelpStudying}</h2>
            <p className="mt-2 text-green-100">
              {t.aiTutorDescription}
            </p>
          </div>
          <Link
            href={chatPath}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-green-600 shadow-lg hover:bg-green-50"
          >
            <MessageSquare className="h-5 w-5" />
            {t.chatNow}
          </Link>
        </div>
      </div>
    </div>
  )
}
