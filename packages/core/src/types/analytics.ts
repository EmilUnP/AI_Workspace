/**
 * Analytics and Reporting Types
 */

export interface AnalyticsTimeRange {
  start_date: string
  end_date: string
  granularity: 'hour' | 'day' | 'week' | 'month'
}

/**
 * Platform-wide Analytics (Platform Owner)
 */
export interface PlatformAnalytics {
  time_range: AnalyticsTimeRange
  overview: PlatformOverview
  growth: GrowthMetrics
  usage: UsageMetrics
  revenue: RevenueMetrics
}

export interface PlatformOverview {
  total_organizations: number
  total_users: number
  total_exams_created: number
  total_lessons_created: number
  ai_requests_processed: number
  storage_used_gb: number
}

export interface GrowthMetrics {
  new_organizations: TimeSeriesData[]
  new_users: TimeSeriesData[]
  churn_rate: number
  retention_rate: number
  conversion_rate: number
}

export interface UsageMetrics {
  daily_active_users: TimeSeriesData[]
  weekly_active_users: number
  monthly_active_users: number
  average_session_duration: number
  feature_usage: FeatureUsage[]
  peak_usage_hours: number[]
}

export interface RevenueMetrics {
  total_revenue: number
  recurring_revenue: number
  revenue_by_plan: Record<string, number>
  revenue_trend: TimeSeriesData[]
  average_revenue_per_user: number
}

export interface TimeSeriesData {
  timestamp: string
  value: number
  label?: string
}

export interface FeatureUsage {
  feature: string
  usage_count: number
  unique_users: number
  trend: 'up' | 'down' | 'stable'
}

/**
 * Organization Analytics (School Admin)
 */
export interface OrganizationAnalytics {
  time_range: AnalyticsTimeRange
  overview: OrganizationOverview
  teacher_performance: TeacherPerformance[]
  learner_performance: LearnerPerformanceSummary
  exam_analytics: ExamAnalyticsSummary
  usage: OrganizationUsage
}

export interface OrganizationOverview {
  total_teachers: number
  total_learners: number
  total_classes: number
  total_exams: number
  total_lessons: number
  average_exam_score: number
  completion_rate: number
}

export interface TeacherPerformance {
  teacher_id: string
  teacher_name: string
  classes_count: number
  learners_count: number
  exams_created: number
  lessons_created: number
  average_class_score: number
  learner_engagement_rate: number
}

export interface LearnerPerformanceSummary {
  average_score: number
  score_distribution: ScoreDistribution
  improvement_trend: TimeSeriesData[]
  top_performers: LearnerSummary[]
  at_risk_learners: LearnerSummary[]
}

export interface ScoreDistribution {
  excellent: number // 90-100%
  good: number // 70-89%
  average: number // 50-69%
  below_average: number // 30-49%
  poor: number // 0-29%
}

export interface LearnerSummary {
  learner_id: string
  learner_name: string
  average_score: number
  exams_completed: number
  trend: 'improving' | 'declining' | 'stable'
}

export interface ExamAnalyticsSummary {
  total_exams: number
  exams_by_subject: Record<string, number>
  average_completion_time: number
  average_score: number
  question_type_distribution: Record<string, number>
  difficulty_distribution: Record<string, number>
}

export interface OrganizationUsage {
  ai_requests_used: number
  ai_requests_limit: number
  storage_used_gb: number
  storage_limit_gb: number
  exams_created_this_month: number
  exams_limit_per_month: number
}

/**
 * Teacher Analytics
 */
export interface TeacherAnalytics {
  time_range: AnalyticsTimeRange
  classes: ClassAnalytics[]
  exam_performance: TeacherExamPerformance
  learner_engagement: EngagementMetrics
}

export interface ClassAnalytics {
  class_id: string
  class_name: string
  learner_count: number
  average_score: number
  completion_rate: number
  recent_activity: ActivitySummary
}

export interface TeacherExamPerformance {
  total_exams: number
  published_exams: number
  total_submissions: number
  average_score: number
  pass_rate: number
  question_effectiveness: QuestionEffectiveness[]
}

export interface QuestionEffectiveness {
  question_type: string
  average_correct_rate: number
  average_time_spent: number
  discrimination_index: number
}

export interface EngagementMetrics {
  active_learners: number
  total_learners: number
  engagement_rate: number
  average_login_frequency: number
  assignment_completion_rate: number
}

export interface ActivitySummary {
  exams_taken: number
  lessons_viewed: number
  chatbot_interactions: number
  last_activity_at: string
}

/**
 * Learner Analytics
 */
export interface LearnerAnalytics {
  learner_id: string
  overview: LearnerOverview
  exam_history: ExamHistoryItem[]
  progress: LearningProgress
  strengths: string[]
  areas_for_improvement: string[]
  recommendations: string[]
}

export interface LearnerOverview {
  total_exams_taken: number
  average_score: number
  total_time_spent_hours: number
  rank_in_class: number | null
  streak_days: number
  badges_earned: Badge[]
}

export interface ExamHistoryItem {
  exam_id: string
  exam_title: string
  subject: string | null
  score: number
  percentage: number
  time_spent_minutes: number
  completed_at: string
  performance_vs_average: number
}

export interface LearningProgress {
  overall_progress: number
  by_subject: SubjectProgress[]
  by_difficulty: DifficultyProgress
  improvement_rate: number
}

export interface SubjectProgress {
  subject: string
  mastery_level: number
  exams_completed: number
  average_score: number
}

export interface DifficultyProgress {
  easy: { accuracy: number; total: number }
  medium: { accuracy: number; total: number }
  hard: { accuracy: number; total: number }
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  earned_at: string
}

/**
 * Report Generation Types
 */
export interface ReportRequest {
  type: 'organization' | 'class' | 'learner' | 'exam'
  entity_id: string
  time_range: AnalyticsTimeRange
  format: 'pdf' | 'excel' | 'csv'
  sections: string[]
  include_charts: boolean
}

export interface ReportResponse {
  report_id: string
  status: 'generating' | 'ready' | 'failed'
  download_url: string | null
  generated_at: string | null
  expires_at: string | null
}
