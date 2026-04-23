'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Activity, Sparkles, SlidersHorizontal } from 'lucide-react'
import { DonutChart, LineChart } from '../analytics/charts'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

// Type definitions (matching @eduator/core/utils/reports)
export interface TeacherReportsData {
  classes: number
  exams: number
  publishedExams: number
  lessons: number
  publishedLessons?: number
  documents: number
  students: number
  submissions: number
  averageScore: number
  passRate: number
  examStats: Array<{
    id: string
    title: string
    question_count: number
    created_at: string
    is_published: boolean
    class_name?: string | null
    submissions?: number
    average_score?: number
    participation_rate?: number
    pass_rate?: number
  }>
  classStats: Array<{
    id: string
    name: string
    student_count: number
    active_exams: number
    active_lessons?: number
    average_score: number
  }>
  monthlyActivity: Array<{
    month: string
    exams_created: number
    lessons_created: number
    submissions: number
  }>
  lessonStats?: Array<{
    id: string
    title: string
    created_at: string
    class_name?: string | null
    learners: number
    completions: number
    completion_rate: number
  }>
  topStudents?: Array<{
    student_id: string
    student_name: string
    submissions: number
    average_score: number
    class_count?: number
    class_names?: string[]
  }>
  atRiskStudents?: Array<{
    student_id: string
    student_name: string
    submissions: number
    average_score: number
    class_count?: number
    class_names?: string[]
  }>
  deltas?: {
    students: number
    submissions: number
    averageScore: number
    passRate: number
  }
  insights?: Array<{
    id: string
    title: string
    detail: string
    level: 'high' | 'medium' | 'low'
    action: string
    targetTab?: 'overview' | 'exams' | 'lessons' | 'classes'
    href?: string
    actionLabel?: string
  }>
}

export interface TeacherReportsLabels {
  title?: string
  subtitle?: string
  activityTrend?: string
  last6MonthsOverview?: string
  itemsCreated?: string
  contentDistribution?: string
  contentBreakdown?: string
  exams?: string
  lessons?: string
  documents?: string
  highImpactLessons?: string
  lessonEngagementAndCompletion?: string
  learners?: string
  completions?: string
  topStudents?: string
  bestExamPerformanceAcrossClasses?: string
  avgScore?: string
  submissions?: string
  overviewTab?: string
  examsTab?: string
  lessonsTab?: string
  classesTab?: string
  totalStudents?: string
  passRate?: string
  published?: string
  attempts?: string
  questions?: string
  completionRate?: string
  classPerformance?: string
  noStudentPerformanceData?: string
  needsAttention?: string
  noRiskSignals?: string
}

const DEFAULT_REPORTS_LABELS: TeacherReportsLabels = {
  title: 'Reports & Analytics',
  subtitle: 'Comprehensive insights and performance metrics',
  activityTrend: 'Activity Trend',
  last6MonthsOverview: 'Last 6 months overview',
  itemsCreated: 'items created',
  contentDistribution: 'Content Distribution',
  contentBreakdown: 'Your created content breakdown',
  exams: 'Exams',
  lessons: 'Lessons',
  documents: 'Documents',
  highImpactLessons: 'High-impact Lessons',
  lessonEngagementAndCompletion: 'Lesson engagement and completion',
  learners: 'Learners',
  completions: 'Completions',
  topStudents: 'Top Students',
  bestExamPerformanceAcrossClasses: 'Best exam performance across classes',
  avgScore: 'Avg score',
  submissions: 'Submissions',
  overviewTab: 'Overview',
  examsTab: 'Exams',
  lessonsTab: 'Lessons',
  classesTab: 'Classes',
  totalStudents: 'Total students',
  passRate: 'Pass rate',
  published: 'Published',
  attempts: 'Attempts',
  questions: 'Questions',
  completionRate: 'Completion rate',
  classPerformance: 'Class performance',
  noStudentPerformanceData: 'No student performance data yet.',
  needsAttention: 'Needs attention',
  noRiskSignals: 'No risk signals yet.',
}

export interface TeacherReportsClientProps {
  teacherId: string
  organizationId?: string
  initialStats: TeacherReportsData
  apiEndpoint?: string
  initialTab?: 'overview' | 'exams' | 'lessons' | 'classes'
  initialRange?: '30d' | '90d' | '6m'
  initialClassId?: string
  initialStartDate?: string
  initialEndDate?: string
  accentColor?: 'blue' | 'violet'
  labels?: TeacherReportsLabels
}

export function TeacherReportsClient({ 
  teacherId,
  initialStats,
  apiEndpoint = '/api/teacher/reports',
  initialTab = 'overview',
  initialRange = '6m',
  initialClassId = 'all',
  initialStartDate,
  initialEndDate,
  accentColor = 'blue',
  labels = {},
}: TeacherReportsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const L = { ...DEFAULT_REPORTS_LABELS, ...labels }
  const [stats, setStats] = useState<TeacherReportsData>(initialStats)
  const [activeTab, setActiveTab] = useState<'overview' | 'exams' | 'lessons' | 'classes'>(initialTab)
  const [range, setRange] = useState<'30d' | '90d' | '6m'>(initialRange)
  const [classId, setClassId] = useState<string>(initialClassId)
  const [startDate, setStartDate] = useState<string>(initialStartDate || '')
  const [endDate, setEndDate] = useState<string>(initialEndDate || '')
  const [isLoading, setIsLoading] = useState(false)

  const classOptions = useMemo(() => stats.classStats || [], [stats.classStats])
  const periodLabel = useMemo(() => {
    if (!startDate || !endDate) return 'Select reporting period'
    return `${startDate} -> ${endDate}`
  }, [startDate, endDate])

  useEffect(() => {
    let isCancelled = false
    const fetchStats = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          teacherId,
          tab: activeTab,
          range,
          startDate,
          endDate,
        })
        if (classId !== 'all') params.set('classId', classId)
        const response = await fetch(`${apiEndpoint}?${params.toString()}`, { cache: 'no-store' })
        if (!response.ok) return
        const payload = (await response.json()) as TeacherReportsData
        if (!isCancelled) setStats(payload)
      } finally {
        if (!isCancelled) setIsLoading(false)
      }
    }
    fetchStats()
    return () => {
      isCancelled = true
    }
  }, [teacherId, apiEndpoint, activeTab, range, classId, startDate, endDate])

  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString())
    next.set('tab', activeTab)
    next.set('range', range)
    next.set('startDate', startDate)
    next.set('endDate', endDate)
    next.delete('contentState')
    if (classId !== 'all') next.set('classId', classId)
    else next.delete('classId')
    const current = searchParams.toString()
    const target = next.toString()
    if (current !== target) {
      router.replace(`${pathname}?${target}`, { scroll: false })
    }
  }, [activeTab, range, classId, startDate, endDate, router, pathname, searchParams])

  const tabs = [
    { id: 'overview' as const, label: L.overviewTab ?? 'Overview' },
    { id: 'exams' as const, label: L.examsTab ?? 'Exams' },
    { id: 'lessons' as const, label: L.lessonsTab ?? 'Lessons' },
    { id: 'classes' as const, label: L.classesTab ?? 'Classes' },
  ]

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-blue-50 p-5">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-200/40 blur-2xl" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-2.5 py-1 text-xs font-medium text-violet-700">
              <Sparkles className="h-3.5 w-3.5" />
              Insight dashboard
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{L.title}</h1>
            <p className="mt-1 text-gray-600">{L.subtitle}</p>
          </div>
          <div className="hidden rounded-lg border border-violet-100 bg-white/80 px-3 py-2 text-xs text-gray-600 sm:block">
            Live filters + drilldowns
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-gray-500">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Report filters
            </div>
            <p className="mt-1 text-sm font-medium text-gray-900">{periodLabel}</p>
            <p className="text-xs text-gray-500">Choose a specific start and end date for this analysis window.</p>
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-medium ${isLoading ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {isLoading ? 'Refreshing metrics...' : 'Filters active'}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-600">Start date</span>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-600">End date</span>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-600">Class scope</span>
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="all">All classes</option>
              {classOptions.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('overview')
              setRange('30d')
              const now = new Date()
              const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
              setStartDate(monthStart.toISOString().slice(0, 10))
              setEndDate(now.toISOString().slice(0, 10))
              setClassId('all')
            }}
            className="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
          >
            This month
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('classes')
              setRange('90d')
              const now = new Date()
              const start = new Date()
              start.setDate(now.getDate() - 89)
              setStartDate(start.toISOString().slice(0, 10))
              setEndDate(now.toISOString().slice(0, 10))
            }}
            className="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
          >
            Risk watchlist
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('exams')
              setRange('6m')
              const now = new Date()
              const start = new Date()
              start.setDate(now.getDate() - 179)
              setStartDate(start.toISOString().slice(0, 10))
              setEndDate(now.toISOString().slice(0, 10))
            }}
            className="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
          >
            Exam outcomes
          </button>
        </div>
      </div>

      <div className="mt-6">
        {activeTab === 'overview' ? (
          <OverviewTab
            stats={stats}
            accentColor={accentColor}
            labels={L}
            onSelectTab={setActiveTab}
            startDate={startDate}
            endDate={endDate}
          />
        ) : null}
        {activeTab === 'exams' ? <ExamsTab stats={stats} labels={L} /> : null}
        {activeTab === 'lessons' ? <LessonsTab stats={stats} labels={L} /> : null}
        {activeTab === 'classes' ? <ClassesTab stats={stats} labels={L} range={range} /> : null}
      </div>
    </div>
  )
}

function OverviewTab({
  stats,
  accentColor,
  labels,
  onSelectTab,
  startDate,
  endDate,
}: {
  stats: TeacherReportsData
  accentColor: 'blue' | 'violet'
  labels: TeacherReportsLabels
  onSelectTab: (tab: 'overview' | 'exams' | 'lessons' | 'classes') => void
  startDate: string
  endDate: string
}) {
  const chartColor = accentColor === 'blue' ? '#3B82F6' : '#8B5CF6'
  const L = labels
  const periodSubtitle =
    startDate && endDate ? `${startDate} -> ${endDate}` : L.last6MonthsOverview ?? 'Selected period overview'

  return (
    <div className="space-y-6">
      {stats.insights && stats.insights.length > 0 ? (
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-indigo-900">Actionable insights</h3>
          <div className="space-y-2">
            {stats.insights.map((insight) => (
              <div key={insight.id} className="rounded-lg border border-indigo-100 bg-white p-3 shadow-sm">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">{insight.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${insight.level === 'high' ? 'bg-rose-100 text-rose-700' : insight.level === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {insight.level}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{insight.detail}</p>
                <p className="mt-1 text-xs text-indigo-700">Action: {insight.action}</p>
                {insight.targetTab ? (
                  <button
                    type="button"
                    onClick={() => onSelectTab(insight.targetTab!)}
                    className="mt-2 text-xs font-medium text-indigo-700 hover:underline"
                  >
                    {insight.actionLabel || 'Open related tab'}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title={L.totalStudents ?? 'Total students'} value={stats.students} delta={stats.deltas?.students} />
        <MetricCard title={L.passRate ?? 'Pass rate'} value={`${stats.passRate}%`} delta={stats.deltas?.passRate} />
        <MetricCard title={L.avgScore ?? 'Avg score'} value={`${stats.averageScore}%`} delta={stats.deltas?.averageScore} />
        <MetricCard title={L.submissions ?? 'Submissions'} value={stats.submissions} delta={stats.deltas?.submissions} />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Activity Trend */}
        {stats.monthlyActivity && stats.monthlyActivity.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{L.activityTrend ?? 'Activity Trend'}</h3>
                <p className="text-sm text-gray-500">{periodSubtitle}</p>
              </div>
              <Activity className="h-5 w-5 text-gray-400" />
            </div>

            <LineChart
              data={stats.monthlyActivity.map((m) => m.exams_created + m.lessons_created)}
              labels={stats.monthlyActivity.map((m) => m.month)}
              colors={[chartColor]}
            />
          </div>
        )}

        {/* Content Distribution */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{L.contentDistribution ?? 'Content Distribution'}</h3>
              <p className="text-sm text-gray-500">{L.contentBreakdown ?? 'Your created content breakdown'}</p>
            </div>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>

          <div className="flex justify-center">
            <DonutChart
              data={[stats.exams || 0, stats.lessons || 0, stats.documents || 0]}
              labels={[L.exams ?? 'Exams', L.lessons ?? 'Lessons', L.documents ?? 'Documents']}
              colors={accentColor === 'blue' ? ['#3B82F6', '#10B981', '#F59E0B'] : ['#8B5CF6', '#10B981', '#F59E0B']}
            />
          </div>
        </div>
      </div>

      {stats.topStudents && stats.topStudents.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {stats.topStudents && stats.topStudents.length > 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{L.topStudents ?? 'Top Students'}</h3>
                <p className="text-sm text-gray-500">{L.bestExamPerformanceAcrossClasses ?? 'Best exam performance across classes'}</p>
              </div>
              <div className="space-y-2">
                {stats.topStudents.slice(0, 5).map((student, index) => (
                  <div key={student.student_id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{index + 1}. {student.student_name}</p>
                      <p className="text-xs text-gray-500">
                        {L.submissions ?? 'Submissions'}: {student.submissions}
                        {student.class_count ? ` • ${student.class_count} classes` : ''}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{L.avgScore ?? 'Avg score'}: {student.average_score}%</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function ExamsTab({ stats, labels }: { stats: TeacherReportsData; labels: TeacherReportsLabels }) {
  const L = labels
  const topExams = [...(stats.examStats || [])].sort((a, b) => (b.submissions || 0) - (a.submissions || 0))

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title={L.exams ?? 'Exams'} value={stats.exams} />
        <MetricCard title={L.published ?? 'Published'} value={stats.publishedExams} />
        <MetricCard title={L.submissions ?? 'Submissions'} value={stats.submissions} />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-3">{L.exams ?? 'Exams'}</h3>
        <div className="space-y-2">
          {topExams.slice(0, 12).map((exam) => (
            <div key={exam.id} className="rounded-lg border border-gray-100 p-3 text-sm">
              <p className="font-medium text-gray-900 truncate">{exam.title}</p>
              <p className="text-gray-600 mt-1">
                {exam.class_name ? `${exam.class_name} • ` : ''}
                {L.questions ?? 'Questions'}: {exam.question_count} • {L.attempts ?? 'Attempts'}: {exam.submissions || 0} • {L.avgScore ?? 'Avg score'}: {exam.average_score || 0}% • Participation: {exam.participation_rate || 0}% • Pass: {exam.pass_rate || 0}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LessonsTab({ stats, labels }: { stats: TeacherReportsData; labels: TeacherReportsLabels }) {
  const L = labels
  const lessons = [...(stats.lessonStats || [])].sort((a, b) => b.learners - a.learners)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title={L.lessons ?? 'Lessons'} value={stats.lessons} />
        <MetricCard title={L.published ?? 'Published'} value={stats.publishedLessons || 0} />
        <MetricCard
          title={L.completionRate ?? 'Completion rate'}
          value={`${lessons.length > 0 ? Math.round(lessons.reduce((sum, l) => sum + l.completion_rate, 0) / lessons.length) : 0}%`}
        />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-3">{L.highImpactLessons ?? 'High-impact Lessons'}</h3>
        <div className="space-y-2">
          {lessons.slice(0, 12).map((lesson) => (
            <div key={lesson.id} className="rounded-lg border border-gray-100 p-3 text-sm">
              <p className="font-medium text-gray-900 truncate">{lesson.title}</p>
              <p className="text-gray-600 mt-1">
                {lesson.class_name ? `${lesson.class_name} • ` : ''}
                {L.learners ?? 'Learners'}: {lesson.learners} • {L.completions ?? 'Completions'}: {lesson.completions} • {L.completionRate ?? 'Completion rate'}: {lesson.completion_rate}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ClassesTab({
  stats,
  labels,
  range,
}: {
  stats: TeacherReportsData
  labels: TeacherReportsLabels
  range: '30d' | '90d' | '6m'
}) {
  const L = labels
  const classes = [...(stats.classStats || [])].sort((a, b) => b.average_score - a.average_score)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title={L.classesTab ?? 'Classes'} value={stats.classes} />
        <MetricCard title={L.totalStudents ?? 'Total students'} value={stats.students} />
        <MetricCard title={L.classPerformance ?? 'Class performance'} value={`${classes.length > 0 ? Math.round(classes.reduce((sum, c) => sum + c.average_score, 0) / classes.length) : 0}%`} />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-3">{L.classPerformance ?? 'Class performance'}</h3>
        <div className="space-y-2">
          {classes.slice(0, 12).map((cls) => (
            <div key={cls.id} className="rounded-lg border border-gray-100 p-3 text-sm">
              <p className="font-medium text-gray-900 truncate">{cls.name}</p>
              <p className="text-gray-600 mt-1">
                {L.totalStudents ?? 'Total students'}: {cls.student_count} • {L.exams ?? 'Exams'}: {cls.active_exams} • {L.lessons ?? 'Lessons'}: {cls.active_lessons || 0} • {L.avgScore ?? 'Avg score'}: {cls.average_score}%
              </p>
              <Link href={`/teacher/reports/classes/${cls.id}?range=${range}`} className="mt-2 inline-block text-xs text-blue-600 hover:underline">
                View class drilldown data
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, delta }: { title: string; value: string | number; delta?: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
      {typeof delta === 'number' ? (
        <p className={`mt-1 text-xs font-medium ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {delta >= 0 ? '+' : ''}
          {delta} vs prev
        </p>
      ) : null}
    </div>
  )
}
