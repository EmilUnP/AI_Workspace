/**
 * Normalize exam question objects from different producers into the UI/app shape.
 *
 * Why:
 * - API server / @eduator/core question shape uses `question` and `correct_answer`
 * - In-app generator / UI expects `text` and `correctAnswer`
 *
 * This function makes exams created via API visible inside the app UI (view/edit pages).
 */

export type AnyQuestionLike = Record<string, unknown>

export interface UiQuestion {
  id: string
  type: string
  text: string
  options: string[]
  correctAnswer: string | string[]
  /** @deprecated Not used in UI; kept for API compatibility, always 1. */
  points?: number
  explanation?: string
  difficulty?: string
  topics?: string[]
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((x) => String(x)).filter((x) => x.trim().length > 0)
}

function uniqNonEmpty(values: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const v of values) {
    const t = v.trim()
    if (!t) continue
    if (seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

export function normalizeExamQuestionForUi(input: AnyQuestionLike): UiQuestion {
  const id = String(input.id ?? (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)))
  const type = String(input.type ?? 'multiple_choice')

  // Prefer UI field names, fall back to @eduator/core field names
  const text = String((input.text ?? input.question ?? '') as string).trim()
  const options = toStringArray(input.options ?? [])

  const rawCorrect = (input.correctAnswer ?? input.correct_answer) as unknown
  const correctAnswer: string | string[] = Array.isArray(rawCorrect)
    ? toStringArray(rawCorrect)
    : typeof rawCorrect === 'string'
      ? rawCorrect
      : String(rawCorrect ?? '').trim()

  const explanation =
    typeof input.explanation === 'string' ? input.explanation : undefined
  const difficulty =
    typeof input.difficulty === 'string' ? input.difficulty : undefined

  // Topics can come as `topics` (UI) or `tags` (core)
  const topics = uniqNonEmpty([
    ...toStringArray(input.topics),
    ...toStringArray(input.tags),
  ])

  return {
    id,
    type,
    text: text || `Question`,
    options,
    correctAnswer,
    points: 1,
    ...(explanation ? { explanation } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(topics.length ? { topics } : {}),
  }
}

export function normalizeExamQuestionsForUi(inputs: unknown): UiQuestion[] {
  if (!Array.isArray(inputs)) return []
  return inputs
    .filter((x): x is AnyQuestionLike => x != null && typeof x === 'object')
    .map((q) => normalizeExamQuestionForUi(q))
}

