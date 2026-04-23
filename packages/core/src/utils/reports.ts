/**
 * Universal reports utilities that can be used by both ERP and ERP apps
 */

export interface ExamStats {
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
}

export interface ClassStats {
  id: string
  name: string
  student_count: number
  active_exams: number
  active_lessons?: number
  average_score: number
}

export interface MonthlyActivity {
  month: string
  exams_created: number
  lessons_created: number
  submissions: number
}

export interface LessonStats {
  id: string
  title: string
  created_at: string
  class_name?: string | null
  learners: number
  completions: number
  completion_rate: number
}

export interface StudentPerformance {
  student_id: string
  student_name: string
  submissions: number
  average_score: number
  class_count?: number
  class_names?: string[]
}

export type ReportsTab = 'overview' | 'exams' | 'lessons' | 'classes'
export type ReportsRange = '30d' | '90d' | '6m'
export type ReportsContentState = 'all' | 'published' | 'draft'

export interface TeacherReportsFilters {
  tab?: ReportsTab
  range?: ReportsRange
  classId?: string
  contentState?: ReportsContentState
  startDate?: string
  endDate?: string
}

export interface TeacherReportsMeta {
  appliedTab: ReportsTab
  appliedRange: ReportsRange
  appliedClassId: string | null
  appliedContentState: ReportsContentState
}

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
  examStats: ExamStats[]
  classStats: ClassStats[]
  monthlyActivity: MonthlyActivity[]
  lessonStats?: LessonStats[]
  topStudents?: StudentPerformance[]
  atRiskStudents?: StudentPerformance[]
  meta?: TeacherReportsMeta
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
    targetTab?: ReportsTab
    href?: string
    actionLabel?: string
  }>
}

export interface TeacherClassTrendPoint {
  label: string
  exams: number
  submissions: number
  lessonsCompleted: number
}

export interface TeacherClassRiskDistribution {
  highRisk: number
  mediumRisk: number
  lowRisk: number
}

export interface TeacherClassStudentRow {
  student_id: string
  student_name: string
  average_score: number
  submissions: number
  completed_lessons: number
  risk_level: 'high' | 'medium' | 'low'
}

export interface TeacherClassDrilldownData {
  classId: string
  className: string
  studentCount: number
  averageScore: number
  passRate: number
  trend: TeacherClassTrendPoint[]
  riskDistribution: TeacherClassRiskDistribution
  students: TeacherClassStudentRow[]
}

export interface TeacherStudentTimelinePoint {
  date: string
  label: string
  type: 'exam_submission' | 'lesson_completion'
  score: number | null
  title: string
  class_name: string | null
}

export interface TeacherStudentActivityMonth {
  month: string
  total_events: number
  exam_events: number
  lesson_events: number
}

export interface TeacherStudentDrilldownData {
  studentId: string
  studentName: string
  averageScore: number
  passRate: number
  submissions: number
  completedLessons: number
  inProgressLessons: number
  classNames: string[]
  scoreTrend: Array<{ label: string; average_score: number }>
  activityByMonth: TeacherStudentActivityMonth[]
  timeline: TeacherStudentTimelinePoint[]
}

/**
 * Normalize a submission to a percentage (0-100).
 * Handles both: score as raw points (with total_points) and score as already percentage (no total_points).
 */
function toPercentage(s: { score: number | null; total_points?: number | null }): number | null {
  if (s.score == null || Number.isNaN(s.score)) return null
  const score = Number(s.score)
  const total = s.total_points != null && s.total_points > 0 ? Number(s.total_points) : 0
  if (total > 0) return Math.round((score / total) * 100)
  return Math.round(score)
}

/**
 * Calculate average score from submissions.
 * Supports both formats: (score, total_points) and score-only (score as 0-100 percentage).
 */
export function calculateAverageScore(submissions: Array<{ score: number | null; total_points?: number | null }>): number {
  if (!submissions || submissions.length === 0) return 0

  const percentages = submissions.map(toPercentage).filter((p): p is number => p != null && !Number.isNaN(p))
  if (percentages.length === 0) return 0

  const sum = percentages.reduce((a, b) => a + b, 0)
  return Math.round(sum / percentages.length)
}

/**
 * Calculate pass rate (assuming 70% is passing).
 * Supports both formats: (score, total_points) and score-only (score as 0-100 percentage).
 */
export function calculatePassRate(submissions: Array<{ score: number | null; total_points?: number | null }>): number {
  if (!submissions || submissions.length === 0) return 0

  const percentages = submissions.map(toPercentage).filter((p): p is number => p != null && !Number.isNaN(p))
  if (percentages.length === 0) return 0

  const passedCount = percentages.filter((p) => p >= 70).length
  return Math.round((passedCount / percentages.length) * 100)
}

/**
 * Generate monthly activity data for last N months
 */
export function generateMonthlyLabels(months: number = 6): string[] {
  const now = new Date()
  const labels: string[] = []
  
  for (let i = months - 1; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStr = month.toLocaleDateString('en-US', { month: 'short' })
    labels.push(monthStr)
  }
  
  return labels
}

/**
 * Get date range for a specific month (for filtering queries)
 */
export function getMonthDateRange(monthOffset: number): { start: Date; end: Date } {
  const now = new Date()
  const month = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1)
  const nextMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset + 1, 1)
  
  return { start: month, end: nextMonth }
}
