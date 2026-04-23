/**
 * Final exam types: scheduled instances of an existing exam with optional question selection and one-attempt enforcement.
 * Supports single source (source_exam_id + selected_question_ids) or multi-source (source_entries).
 */

/** One source in a multi-exam final: an exam and which question ids to include. */
export interface FinalExamSourceEntry {
  exam_id: string
  selected_question_ids: string[]
}

export interface FinalExam {
  id: string
  organization_id: string
  source_exam_id: string
  title: string | null
  selected_question_ids: string[] | null
  /** Multi-source: when set, question set is built from these entries; source_exam_id is then first exam for display. */
  source_entries?: FinalExamSourceEntry[] | null
  class_id: string | null
  course_id: string | null
  start_time: string
  end_time: string
  /** Time limit for the exam in minutes (e.g. 35, 60). */
  duration_minutes?: number | null
  /** Fixed selected questions or randomized draw per attempt from selected pool. */
  question_mode?: 'fixed_selection' | 'random_pool'
  /** Used when question_mode = random_pool. */
  questions_per_attempt?: number | null
  one_attempt_per_student: boolean
  /** When true (default) students see result after finishing; when false teacher/admin reveals when they want. */
  show_result_to_student?: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateFinalExamInput {
  /** Legacy single source; required if source_entries is not provided. */
  source_exam_id?: string
  /** Legacy single source question selection. */
  selected_question_ids?: string[] | null
  /** Multi-source: list of exam id + selected question ids. When provided, source_exam_id can be omitted (first entry used for display). */
  source_entries?: FinalExamSourceEntry[] | null
  title?: string | null
  class_id: string | null
  course_id?: string | null
  start_time: string
  end_time: string
  /** Time limit in minutes (e.g. 35, 60). */
  duration_minutes?: number | null
  question_mode?: 'fixed_selection' | 'random_pool'
  questions_per_attempt?: number | null
  one_attempt_per_student?: boolean
  /** When true (default) students see result after finishing; when false teacher/admin reveals when they want. */
  show_result_to_student?: boolean
}

export interface UpdateFinalExamInput {
  title?: string | null
  selected_question_ids?: string[] | null
  source_entries?: FinalExamSourceEntry[] | null
  class_id?: string | null
  course_id?: string | null
  start_time?: string
  end_time?: string
  duration_minutes?: number | null
  question_mode?: 'fixed_selection' | 'random_pool'
  questions_per_attempt?: number | null
  one_attempt_per_student?: boolean
  show_result_to_student?: boolean
}

export interface FinalExamWithSource extends FinalExam {
  source_exam?: {
    id: string
    title: string
    duration_minutes: number | null
    questions?: unknown[]
  } | null
  /** Total question count (from source_exam or sum of source_entries) for display. */
  total_question_count?: number
  class_name?: string | null
  course_title?: string | null
  /** Creator display name (for school admin list). */
  created_by_name?: string | null
}
