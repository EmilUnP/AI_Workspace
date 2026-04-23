/**
 * Token-based AI usage: balances, settings, transactions, payments
 */

export interface TokenBalance {
  profile_id: string
  balance: number
  updated_at: string
}

export interface TokenUsageSetting {
  id: string
  key: string
  label: string
  tokens: number
  extra: Record<string, unknown>
  updated_at: string
}

export interface TokenTransaction {
  id: string
  profile_id: string
  amount: number
  balance_after: number
  action_type: string
  reference_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface Payment {
  id: string
  profile_id: string | null
  organization_id: string | null
  amount_cents: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  tokens_granted: number
  payment_method: string | null
  external_id: string | null
  created_at: string
  paid_at: string | null
}

export interface ModelPricingSetting {
  id: string
  provider: 'gemini'
  model_key: string
  display_name: string
  input_cost_per_1m_tokens_usd: number
  output_cost_per_1m_tokens_usd: number
  source_url: string | null
  effective_from: string
  is_active: boolean
  updated_at: string
}

export interface ModelUsageCostSummary {
  modelKey: string
  displayName: string
  provider: 'gemini' | 'unknown'
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCostUsd: number
  txCount: number
}

/** Action types for token deduction (must match DB and usage) */
export const TOKEN_ACTION_TYPES = {
  EXAM_GENERATION: 'exam_generation',
  EXAM_TRANSLATION: 'exam_translation',
  RAG_INDEXING: 'rag_indexing',
  EDUCATION_PLAN_GENERATION: 'education_plan_generation',
  LESSON_GENERATION: 'lesson_generation',
  LESSON_IMAGES: 'lesson_images',
  LESSON_AUDIO: 'lesson_audio',
  COURSE_GENERATION: 'course_generation',
  /** Backward-compatible DB value for learner chat usage. */
  LEARNER_CHAT: 'student_chat',
  TEACHER_CHAT: 'teacher_chat',
  PURCHASE: 'purchase',
  ADMIN_GRANT: 'admin_grant',
  INITIAL_GRANT: 'initial_grant',
} as const

export type TokenActionType = (typeof TOKEN_ACTION_TYPES)[keyof typeof TOKEN_ACTION_TYPES]

/** Keys in token_usage_settings (must match seeded rows) */
export const TOKEN_SETTING_KEYS = {
  EXAM_PER_10_QUESTIONS: 'exam_per_10_questions',
  EXAM_TRANSLATION_PER_10_QUESTIONS: 'exam_translation_per_10_questions',
  RAG_INDEXING_PER_DOCUMENT: 'rag_indexing_per_document',
  EDUCATION_PLAN_GENERATION: 'education_plan_generation',
  LESSON_GENERATION: 'lesson_generation',
  LESSON_IMAGES_PER_BATCH: 'lesson_images_per_batch',
  LESSON_AUDIO: 'lesson_audio',
  COURSE_BASE: 'course_base',
  /** Backward-compatible DB key for learner chat usage. */
  LEARNER_CHAT_PER_MESSAGE: 'student_chat_per_message',
  TEACHER_CHAT_PER_MESSAGE: 'teacher_chat_per_message',
  /** Tokens granted automatically to each new user (platform owner configurable). */
  INITIAL_TOKENS_FOR_NEW_USERS: 'initial_tokens_for_new_users',
} as const

export type TokenSettingKey = (typeof TOKEN_SETTING_KEYS)[keyof typeof TOKEN_SETTING_KEYS]

/** Params to compute cost for each action type */
export interface TokenCostParams {
  exam_generation?: { question_count: number }
  exam_translation?: { question_count: number }
  rag_indexing?: { document_count: number }
  education_plan_generation?: Record<string, never>
  lesson_generation?: { include_images: boolean; include_audio: boolean; image_count?: number }
  lesson_images?: { image_count: number }
  lesson_audio?: Record<string, never>
  course_generation?: {
    lesson_count: number
    include_images: boolean
    include_audio: boolean
    image_count_per_lesson?: number
    /** Final exam question count (course includes a generated exam; cost uses exam_per_10_questions) */
    exam_question_count?: number
  }
  learner_chat?: Record<string, never>
  /** @deprecated use learner_chat */
  student_chat?: Record<string, never>
  teacher_chat?: Record<string, never>
}

/** Result of deduct_tokens RPC */
export interface DeductTokensResult {
  success: boolean
  new_balance: number | null
  error_message: string | null
}
