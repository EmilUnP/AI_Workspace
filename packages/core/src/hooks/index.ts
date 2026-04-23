// Auth hooks
export { useAuth, useHasRole, useCanAccessOrganization, usePermissions } from './useAuth'

// Utility hooks
export { useDebounce, useDebouncedCallback } from './useDebounce'
export { useLocalStorage, useSessionStorage } from './useLocalStorage'

// Lesson hooks
export {
  useGenerateLesson,
  GENERATION_STEP_LABELS,
  getStepProgress,
  type GenerationStep,
  type GenerationOptions,
  type GeneratedLessonResult,
  type UseGenerateLessonReturn,
} from './useGenerateLesson'