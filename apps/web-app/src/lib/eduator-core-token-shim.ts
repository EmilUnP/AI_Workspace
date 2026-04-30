export const TOKEN_ACTION_TYPES = {
  LEARNER_CHAT: 'learner_chat',
  TEACHER_CHAT: 'teacher_chat',
  EXAM_GENERATION: 'exam_generation',
  LESSON_GENERATION: 'lesson_generation',
  LESSON_IMAGES: 'lesson_images',
  LESSON_AUDIO: 'lesson_audio',
  COURSE_GENERATION: 'course_generation',
  EDUCATION_PLAN_GENERATION: 'education_plan_generation',
  RAG_INDEXING: 'rag_indexing',
  PURCHASE: 'purchase',
  ADMIN_GRANT: 'admin_grant',
  INITIAL_GRANT: 'initial_grant',
  REFUND: 'refund',
} as const

export type TokenUsageSetting = {
  id: string
  key: string
  label: string
  tokens: number
  extra?: Record<string, unknown> | null
}

export type ModelPricingSetting = {
  id: string
  model_key: string
  model_label: string
  input_cost_per_million: number
  output_cost_per_million: number
  source_url?: string | null
  updated_at?: string | null
}
