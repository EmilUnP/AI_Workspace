/**
 * Distinct badge colors for question types and difficulties in final exam UI.
 * Used in create, edit, detail, and preview components.
 */

const QUESTION_TYPE_COLORS: Record<string, string> = {
  multiple_choice: 'bg-blue-100 text-blue-800',
  true_false: 'bg-emerald-100 text-emerald-800',
  multiple_select: 'bg-violet-100 text-violet-800',
  fill_blank: 'bg-amber-100 text-amber-800',
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-amber-100 text-amber-800',
  hard: 'bg-rose-100 text-rose-800',
}

const BADGE_BASE = 'inline-flex rounded px-1.5 py-0.5 text-xs font-medium'
const BADGE_BASE_MD = 'inline-flex rounded-md px-2 py-0.5 text-xs font-medium'

export function getQuestionTypeBadgeClass(type: string, size: 'sm' | 'md' = 'sm'): string {
  const key = (type ?? '').toLowerCase().replace(/-/g, '_')
  const colors = QUESTION_TYPE_COLORS[key] ?? 'bg-gray-100 text-gray-800'
  return `${size === 'md' ? BADGE_BASE_MD : BADGE_BASE} ${colors}`.trim()
}

export function getDifficultyBadgeClass(difficulty: string, size: 'sm' | 'md' = 'sm'): string {
  const key = (difficulty ?? '').toLowerCase()
  const colors = DIFFICULTY_COLORS[key] ?? 'bg-gray-100 text-gray-800'
  return `${size === 'md' ? BADGE_BASE_MD : BADGE_BASE} ${colors}`.trim()
}
