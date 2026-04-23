/**
 * Education Plan types
 * Teacher-created curriculum plans per class (AI or manual), shareable with students
 */

export interface EducationPlanWeek {
  week: number
  title?: string
  topics: string[]
  objectives?: string[]
  notes?: string
}

export interface EducationPlan {
  id: string
  organization_id: string
  teacher_id: string
  class_id: string
  name: string
  description: string | null
  period_months: number
  sessions_per_week: number
  hours_per_session: number
  audience: string | null
  document_ids: string[]
  content: EducationPlanWeek[]
  is_shared_with_students: boolean
  created_at: string
  updated_at: string
}

export interface CreateEducationPlanInput {
  organization_id: string
  teacher_id: string
  class_id: string
  name: string
  description?: string | null
  period_months: number
  sessions_per_week: number
  hours_per_session: number
  audience?: string | null
  document_ids?: string[]
  content: EducationPlanWeek[]
  is_shared_with_students?: boolean
}

export interface UpdateEducationPlanInput {
  name?: string
  description?: string | null
  period_months?: number
  sessions_per_week?: number
  hours_per_session?: number
  audience?: string | null
  document_ids?: string[]
  content?: EducationPlanWeek[]
  is_shared_with_students?: boolean
}
