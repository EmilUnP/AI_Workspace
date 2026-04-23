/**
 * Pure token cost calculation from settings.
 * Used by API and app to compute cost before calling deduct.
 */

import type { TokenUsageSetting, TokenSettingKey } from '../types/token'
import { TOKEN_SETTING_KEYS } from '../types/token'
import type { TokenCostParams } from '../types/token'

const settingsByKey = (settings: TokenUsageSetting[]): Map<string, TokenUsageSetting> =>
  new Map(settings.map((s) => [s.key, s]))

function getTokens(settings: Map<string, TokenUsageSetting>, key: TokenSettingKey): number {
  return settings.get(key)?.tokens ?? 0
}

function getExtra<T>(settings: Map<string, TokenUsageSetting>, key: TokenSettingKey, field: string): T | undefined {
  const extra = settings.get(key)?.extra as Record<string, T> | undefined
  return extra?.[field]
}

/**
 * Compute token cost for an action given current usage settings.
 * Returns 0 if action type or params are missing/invalid.
 */
export function getTokenCost(
  actionType: keyof TokenCostParams,
  params: TokenCostParams[keyof TokenCostParams],
  settings: TokenUsageSetting[]
): number {
  const byKey = settingsByKey(settings)

  switch (actionType) {
    case 'exam_generation': {
      const questionCount = params && 'question_count' in params ? params.question_count : 0
      if (questionCount <= 0) return 0
      const perQuestions = getExtra<number>(byKey, TOKEN_SETTING_KEYS.EXAM_PER_10_QUESTIONS, 'per_questions') ?? 10
      const tokensPerUnit = getTokens(byKey, TOKEN_SETTING_KEYS.EXAM_PER_10_QUESTIONS)
      const units = Math.ceil(questionCount / perQuestions)
      return units * tokensPerUnit
    }
    case 'exam_translation': {
      const questionCount = params && 'question_count' in params ? params.question_count : 0
      if (questionCount <= 0) return 0
      const perQuestions =
        getExtra<number>(byKey, TOKEN_SETTING_KEYS.EXAM_TRANSLATION_PER_10_QUESTIONS, 'per_questions') ??
        10
      const tokensPerUnit = getTokens(byKey, TOKEN_SETTING_KEYS.EXAM_TRANSLATION_PER_10_QUESTIONS)
      const units = Math.ceil(questionCount / perQuestions)
      return units * tokensPerUnit
    }
    case 'rag_indexing': {
      const documentCount = params && 'document_count' in params ? params.document_count : 0
      if (documentCount <= 0) return 0
      const tokensPerDocument = getTokens(byKey, TOKEN_SETTING_KEYS.RAG_INDEXING_PER_DOCUMENT)
      return documentCount * tokensPerDocument
    }
    case 'education_plan_generation':
      return getTokens(byKey, TOKEN_SETTING_KEYS.EDUCATION_PLAN_GENERATION)
    case 'lesson_generation': {
      let cost = getTokens(byKey, TOKEN_SETTING_KEYS.LESSON_GENERATION)
      const imageCount = params && 'image_count' in params ? (params as { image_count?: number }).image_count ?? 0 : 0
      if (params && 'include_images' in params && params.include_images && imageCount > 0) {
        const batchSize = getExtra<number>(byKey, TOKEN_SETTING_KEYS.LESSON_IMAGES_PER_BATCH, 'batch_size') ?? 3
        const tokensPerBatch = getTokens(byKey, TOKEN_SETTING_KEYS.LESSON_IMAGES_PER_BATCH)
        cost += Math.ceil(imageCount / batchSize) * tokensPerBatch
      }
      if (params && 'include_audio' in params && params.include_audio) {
        cost += getTokens(byKey, TOKEN_SETTING_KEYS.LESSON_AUDIO)
      }
      return cost
    }
    case 'lesson_images': {
      const raw = params && 'image_count' in params ? (params as { image_count?: number }).image_count : undefined
      const imageCount = typeof raw === 'number' ? raw : 0
      if (imageCount <= 0) return 0
      const batchSize = getExtra<number>(byKey, TOKEN_SETTING_KEYS.LESSON_IMAGES_PER_BATCH, 'batch_size') ?? 3
      const tokensPerBatch = getTokens(byKey, TOKEN_SETTING_KEYS.LESSON_IMAGES_PER_BATCH)
      return Math.ceil(imageCount / batchSize) * tokensPerBatch
    }
    case 'lesson_audio':
      return getTokens(byKey, TOKEN_SETTING_KEYS.LESSON_AUDIO)
    case 'course_generation': {
      let cost = getTokens(byKey, TOKEN_SETTING_KEYS.COURSE_BASE)
      if (params && 'lesson_count' in params) {
        const lessonCount = params.lesson_count ?? 0
        const perLesson = getTokens(byKey, TOKEN_SETTING_KEYS.LESSON_GENERATION)
        cost += lessonCount * perLesson
        if (params.include_audio) cost += lessonCount * getTokens(byKey, TOKEN_SETTING_KEYS.LESSON_AUDIO)
        const imagesPerLesson = params.image_count_per_lesson ?? 3
        if (params.include_images && imagesPerLesson > 0) {
          const batchSize = getExtra<number>(byKey, TOKEN_SETTING_KEYS.LESSON_IMAGES_PER_BATCH, 'batch_size') ?? 3
          const tokensPerBatch = getTokens(byKey, TOKEN_SETTING_KEYS.LESSON_IMAGES_PER_BATCH)
          cost += lessonCount * Math.ceil(imagesPerLesson / batchSize) * tokensPerBatch
        }
      }
      // Course includes a final exam; use same exam cost as standalone exam (per 10 questions)
      if (params && 'exam_question_count' in params) {
        const questionCount = params.exam_question_count ?? 0
        if (questionCount > 0) {
          const perQuestions = getExtra<number>(byKey, TOKEN_SETTING_KEYS.EXAM_PER_10_QUESTIONS, 'per_questions') ?? 10
          const tokensPerUnit = getTokens(byKey, TOKEN_SETTING_KEYS.EXAM_PER_10_QUESTIONS)
          const units = Math.ceil(questionCount / perQuestions)
          cost += units * tokensPerUnit
        }
      }
      return cost
    }
    case 'learner_chat':
    case 'student_chat':
      return getTokens(byKey, TOKEN_SETTING_KEYS.LEARNER_CHAT_PER_MESSAGE)
    case 'teacher_chat':
      return getTokens(byKey, TOKEN_SETTING_KEYS.TEACHER_CHAT_PER_MESSAGE)
    default:
      return 0
  }
}
