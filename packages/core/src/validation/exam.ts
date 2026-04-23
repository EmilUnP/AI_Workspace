import { z } from 'zod'
import { QUESTION_TYPES, DIFFICULTY_LEVELS } from '@eduator/config'

/**
 * Exam Validation Schemas
 */

export const difficultyDistributionSchema = z
  .object({
    easy: z.number().min(0).max(100),
    medium: z.number().min(0).max(100),
    hard: z.number().min(0).max(100),
  })
  .refine((data) => data.easy + data.medium + data.hard === 100, {
    message: 'Difficulty distribution must sum to 100%',
  })

export const examSettingsSchema = z.object({
  question_count: z.number().min(1).max(100),
  difficulty_distribution: difficultyDistributionSchema,
  question_types: z
    .array(
      z.enum([
        QUESTION_TYPES.MULTIPLE_CHOICE,
        QUESTION_TYPES.MULTIPLE_SELECT,
        QUESTION_TYPES.FILL_BLANK,
        QUESTION_TYPES.TRUE_FALSE,
      ])
    )
    .min(1),
  time_limit_minutes: z.number().min(1).max(480).optional(),
  shuffle_questions: z.boolean().optional(),
  shuffle_options: z.boolean().optional(),
  show_results_immediately: z.boolean().optional(),
  show_correct_answers: z.boolean().optional(),
  allow_review: z.boolean().optional(),
  passing_score: z.number().min(0).max(100).optional(),
  max_attempts: z.number().min(1).max(10).optional(),
  require_webcam: z.boolean().optional(),
  require_lockdown: z.boolean().optional(),
})

export const questionSchema = z.object({
  id: z.string().optional(),
  type: z.enum([
    QUESTION_TYPES.MULTIPLE_CHOICE,
    QUESTION_TYPES.MULTIPLE_SELECT,
    QUESTION_TYPES.FILL_BLANK,
    QUESTION_TYPES.TRUE_FALSE,
  ]),
  question: z.string().min(5).max(2000),
  question_html: z.string().optional(),
  options: z.array(z.string().min(1).max(500)).optional(),
  correct_answer: z.union([z.string(), z.array(z.string())]),
  difficulty: z.enum([DIFFICULTY_LEVELS.EASY, DIFFICULTY_LEVELS.MEDIUM, DIFFICULTY_LEVELS.HARD]),
  explanation: z.string().max(1000).optional(),
  hint: z.string().max(500).optional(),
  image_url: z.string().url().optional(),
  audio_url: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  order: z.number().min(0).optional(),
})

export const createExamSchema = z.object({
  class_id: z.string().uuid().nullable().optional(),
  title: z.string().min(3).max(200),
  description: z.string().max(1000).nullable().optional(),
  subject: z.string().max(100).nullable().optional(),
  grade_level: z.string().max(50).nullable().optional(),
  settings: examSettingsSchema.partial(),
  duration_minutes: z.number().min(1).max(480).optional(),
  start_time: z.string().datetime().nullable().optional(),
  end_time: z.string().datetime().nullable().optional(),
})

export const updateExamSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  subject: z.string().max(100).nullable().optional(),
  grade_level: z.string().max(50).nullable().optional(),
  settings: examSettingsSchema.partial().optional(),
  questions: z.array(questionSchema).optional(),
  duration_minutes: z.number().min(1).max(480).optional(),
  is_published: z.boolean().optional(),
  is_archived: z.boolean().optional(),
  start_time: z.string().datetime().nullable().optional(),
  end_time: z.string().datetime().nullable().optional(),
})

export const examGenerationSchema = z
  .object({
    /** Raw document text (manual paste). Use when you don't have a stored document. */
    document_text: z.string().min(50).max(100000).optional(),
    /** Single stored document ID (from Documents API). Content is processed via RAG. */
    document_id: z.string().uuid().optional(),
    /** Multiple stored document IDs. Content is merged via RAG. Use for multi-doc exams. */
    document_ids: z.array(z.string().uuid()).min(1).max(10).optional(),
    document_url: z.string().url().optional(),
    title: z.string().min(3).max(200).optional(),
    subject: z.string().max(100).optional(),
    grade_level: z.string().max(50).optional(),
    settings: z.object({
      question_count: z.number().min(1).max(50),
      difficulty_distribution: difficultyDistributionSchema,
      question_types: z
        .array(
          z.enum([
            QUESTION_TYPES.MULTIPLE_CHOICE,
            QUESTION_TYPES.MULTIPLE_SELECT,
            QUESTION_TYPES.FILL_BLANK,
            QUESTION_TYPES.TRUE_FALSE,
          ])
        )
        .min(1),
      include_explanations: z.boolean().optional(),
      include_hints: z.boolean().optional(),
    }),
    custom_instructions: z.string().max(1000).optional(),
    /** Optional topics (comma-separated) to focus RAG when using document_id/document_ids. */
    topics: z.string().max(500).optional(),
    language: z.string().length(2).optional(),
  })
  .refine(
    (data) => {
      const hasText = data.document_text && data.document_text.trim().length >= 50
      const hasDocId = !!data.document_id
      const hasDocIds = !!data.document_ids?.length
      return hasText || hasDocId || hasDocIds
    },
    { message: 'Provide document_text, document_id, or document_ids' }
  )
  .refine(
    (data) => !(data.document_id && data.document_ids?.length),
    { message: 'Use either document_id or document_ids, not both' }
  )

export const submitExamSchema = z.object({
  answers: z.array(
    z.object({
      question_id: z.string().uuid(),
      answer: z.union([z.string(), z.array(z.string())]),
    })
  ),
})

// Types are exported from @eduator/core/types/exam
// These schemas are for runtime validation only
