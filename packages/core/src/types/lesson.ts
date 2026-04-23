/**
 * Lesson and Content Types
 */

export interface Lesson {
  id: string
  organization_id: string
  class_id: string | null
  created_by: string
  title: string
  description: string | null
  subject: string | null
  grade_level: string | null
  duration_minutes: number
  content: LessonContent
  learning_objectives: string[]
  prerequisites: string[]
  materials: LessonMaterial[]
  is_published: boolean
  is_archived: boolean
  /** 0 = in-app/API; 1 = course-generated (visible only in course). */
  course_generated?: number
  metadata: LessonMetadata | null
  created_at: string
  updated_at: string
}

export interface LessonContent {
  sections: LessonSection[]
  summary: string | null
  key_vocabulary: VocabularyTerm[]
  assessment_questions: LessonQuestion[]
}

export interface LessonSection {
  id: string
  title: string
  content_type: 'text' | 'video' | 'image' | 'interactive' | 'quiz'
  content: string
  duration_minutes: number
  order: number
  resources?: LessonResource[]
}

export interface VocabularyTerm {
  term: string
  definition: string
  example?: string
}

export interface LessonQuestion {
  question: string
  type: 'discussion' | 'reflection' | 'practice'
  suggested_answer?: string
}

export interface LessonMaterial {
  id: string
  name: string
  type: 'document' | 'video' | 'link' | 'image' | 'audio'
  url: string
  is_required: boolean
}

export interface LessonResource {
  title: string
  url: string
  type: string
}

export interface LessonMetadata {
  source_documents?: string[]
  ai_model_used?: string
  generation_time_ms?: number
  tags?: string[]
  curriculum_alignment?: string[]
  standards?: string[]
  from_course_id?: string // ID of the course this lesson belongs to (if generated from course)
  course_title?: string // Title of the course (for display purposes)
}

export interface CreateLessonInput {
  class_id?: string | null
  title: string
  description?: string | null
  subject?: string | null
  grade_level?: string | null
  duration_minutes?: number
  learning_objectives?: string[]
  prerequisites?: string[]
}

export interface UpdateLessonInput {
  title?: string
  description?: string | null
  subject?: string | null
  grade_level?: string | null
  duration_minutes?: number
  content?: LessonContent
  learning_objectives?: string[]
  prerequisites?: string[]
  materials?: LessonMaterial[]
  is_published?: boolean
  is_archived?: boolean
}

/**
 * AI Lesson Generation Types
 */
export interface LessonGenerationRequest {
  topic: string
  subject?: string
  grade_level: string
  duration_minutes: number
  learning_objectives?: string[]
  curriculum_standard?: string
  teaching_style?: 'traditional' | 'inquiry_based' | 'project_based' | 'flipped'
  include_activities: boolean
  include_assessment: boolean
  language?: string
  custom_instructions?: string
}

export interface LessonGenerationResponse {
  success: boolean
  lesson_id?: string
  lesson: Partial<Lesson>
  generation_time_ms: number
  tokens_used: number
  suggestions?: string[]
}

/**
 * Lesson Progress Tracking
 */
export interface LessonProgress {
  id: string
  lesson_id: string
  student_id: string
  current_section: number
  completed_sections: string[]
  time_spent_seconds: number
  started_at: string
  completed_at: string | null
  notes: string | null
}

export interface LessonAnalytics {
  lesson_id: string
  total_views: number
  unique_students: number
  average_completion_rate: number
  average_time_spent_seconds: number
  section_analytics: SectionAnalytics[]
}

export interface SectionAnalytics {
  section_id: string
  section_title: string
  views: number
  average_time_spent: number
  drop_off_rate: number
}
