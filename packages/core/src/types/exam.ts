import type { QuestionType, DifficultyLevel } from '@eduator/config'

/**
 * Exam and Question Types
 */

export interface Exam {
  id: string
  organization_id: string
  class_id: string | null
  created_by: string
  title: string
  description: string | null
  subject: string | null
  grade_level: string | null
  settings: ExamSettings
  questions: Question[]
  duration_minutes: number
  is_published: boolean
  is_archived: boolean
  start_time: string | null
  end_time: string | null
  /** 0 = in-app/API; 1 = course-generated (visible only in course). */
  course_generated?: number
  metadata: ExamMetadata | null
  created_at: string
  updated_at: string
}

export interface ExamSettings {
  question_count: number
  difficulty_distribution: DifficultyDistribution
  question_types: QuestionType[]
  time_limit_minutes: number
  shuffle_questions: boolean
  shuffle_options: boolean
  show_results_immediately: boolean
  show_correct_answers: boolean
  /** When true, students see explanations for each question in results. */
  show_explanations?: boolean
  allow_review: boolean
  passing_score: number
  max_attempts: number
  require_webcam: boolean
  require_lockdown: boolean
}

export interface DifficultyDistribution {
  easy: number
  medium: number
  hard: number
}

export interface ExamMetadata {
  source_document?: string
  source_document_pages?: number
  ai_model_used?: string
  generation_time_ms?: number
  custom_instructions?: string
  tags?: string[]
  from_course_id?: string // ID of the course this exam belongs to (if generated from course)
  course_title?: string // Title of the course (for display purposes)
}

/**
 * Question Types
 */
export interface Question {
  id: string
  exam_id?: string
  type: QuestionType
  question: string
  question_html?: string
  options?: string[]
  correct_answer: string | string[]
  difficulty: DifficultyLevel
  points: number
  explanation?: string
  hint?: string
  image_url?: string
  audio_url?: string
  tags?: string[]
  metadata?: QuestionMetadata
  order: number
}

export interface QuestionMetadata {
  bloom_level?: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'
  topic?: string
  subtopic?: string
  learning_objective?: string
  time_estimate_seconds?: number
}

export interface CreateExamInput {
  class_id?: string | null
  title: string
  description?: string | null
  subject?: string | null
  grade_level?: string | null
  language?: string
  settings: Partial<ExamSettings>
  duration_minutes?: number
  start_time?: string | null
  end_time?: string | null
  /** Set to 1 when creating from course generator; 0 or omit for in-app/API. */
  course_generated?: number
}

export interface UpdateExamInput {
  title?: string
  description?: string | null
  subject?: string | null
  grade_level?: string | null
  settings?: Partial<ExamSettings>
  questions?: Question[]
  duration_minutes?: number
  is_published?: boolean
  is_archived?: boolean
  start_time?: string | null
  end_time?: string | null
}

/**
 * AI Exam Generation Types
 */
export interface ExamGenerationRequest {
  document_text?: string
  document_url?: string
  document_file?: File
  title?: string
  subject?: string
  grade_level?: string
  settings: ExamGenerationSettings
  custom_instructions?: string
  language?: string
}

export interface ExamGenerationSettings {
  question_count: number
  difficulty_distribution: DifficultyDistribution
  question_types: QuestionType[]
  include_explanations: boolean
  include_hints: boolean
}

export interface ExamGenerationResponse {
  success: boolean
  exam_id?: string
  questions: Question[]
  generation_time_ms: number
  tokens_used: number
  warnings?: string[]
}

/**
 * Exam Submission & Results
 */
export interface ExamSubmission {
  id: string
  exam_id: string
  student_id: string
  answers: StudentAnswer[]
  started_at: string
  submitted_at: string | null
  time_spent_seconds: number
  score: number | null
  percentage: number | null
  is_passed: boolean | null
  attempt_number: number
  status: 'in_progress' | 'submitted' | 'graded' | 'reviewed'
  feedback: string | null
  graded_by: string | null
  graded_at: string | null
}

export interface StudentAnswer {
  question_id: string
  answer: string | string[]
  is_correct?: boolean
  points_earned?: number
  time_spent_seconds?: number
}

export interface ExamResult {
  submission: ExamSubmission
  exam: Exam
  question_results: QuestionResult[]
  statistics: ResultStatistics
}

export interface QuestionResult {
  question: Question
  student_answer: string | string[]
  is_correct: boolean
  points_earned: number
  feedback?: string
}

export interface ResultStatistics {
  total_questions: number
  correct_answers: number
  incorrect_answers: number
  unanswered: number
  /** @deprecated Use total_questions. Kept for compatibility. */
  total_points?: number
  points_earned: number
  percentage: number
  time_spent_seconds: number
  average_time_per_question: number
  difficulty_breakdown: {
    easy: { correct: number; total: number }
    medium: { correct: number; total: number }
    hard: { correct: number; total: number }
  }
}

/**
 * Class Types
 */
export interface Class {
  id: string
  organization_id: string
  teacher_id: string
  name: string
  description: string | null
  subject: string | null
  grade_level: string | null
  academic_year: string | null
  semester: string | null
  class_code: string
  is_active: boolean
  settings: ClassSettings | null
  created_at: string
  updated_at: string
}

export interface ClassSettings {
  allow_late_submissions: boolean
  default_exam_duration: number
  notifications_enabled: boolean
  max_students: number
}

export interface ClassWithStats extends Class {
  stats: {
    total_students: number
    total_exams: number
    average_score: number
    completion_rate: number
  }
}

export interface ClassEnrollment {
  id: string
  class_id: string
  student_id: string
  enrolled_at: string
  status: 'active' | 'dropped' | 'completed'
}
