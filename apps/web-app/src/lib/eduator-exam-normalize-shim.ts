type AnyQuestion = Record<string, unknown>

function normalizeQuestionType(value: unknown, options: string[]): 'multiple_choice' | 'true_false' | 'multiple_select' | 'fill_blank' {
  const raw = String(value || '').trim().toLowerCase()
  if (raw === 'multiple_choice' || raw === 'multiple-choice' || raw === 'mcq') return 'multiple_choice'
  if (raw === 'true_false' || raw === 'true-false' || raw === 'truefalse' || raw === 'boolean') return 'true_false'
  if (raw === 'multiple_select' || raw === 'multiple-select' || raw === 'multi_select') return 'multiple_select'
  if (raw === 'fill_blank' || raw === 'fill-in-the-blank' || raw === 'fill blank') return 'fill_blank'

  // Heuristic fallback when model returns unknown type labels.
  if (options.length === 2) {
    const pair = options.map((x) => x.trim().toLowerCase())
    if (
      (pair.includes('true') && pair.includes('false')) ||
      (pair.includes('doğru') && pair.includes('yanlış'))
    ) {
      return 'true_false'
    }
  }
  if (options.length > 0) return 'multiple_choice'
  return 'fill_blank'
}

export function normalizeExamQuestion<T extends AnyQuestion>(question: T): T {
  const rawText = question.text ?? question.question ?? ''
  const text = String(rawText || '').trim()

  const rawOptions = Array.isArray(question.options)
    ? question.options
    : Array.isArray(question.choices)
      ? question.choices
      : Array.isArray(question.variants)
        ? question.variants
      : []
  const options = rawOptions.map((item) => String(item ?? '')).filter(Boolean)
  const type = normalizeQuestionType(question.type, options)

  const rawCorrect = question.correctAnswer ?? question.correct_answer ?? ''
  const correctAnswer = Array.isArray(rawCorrect)
    ? rawCorrect.map((item) => String(item ?? '')).filter(Boolean)
    : String(rawCorrect ?? '')

  const rawTopics = Array.isArray(question.topics)
    ? question.topics
    : Array.isArray(question.tags)
      ? question.tags
      : []
  const topics = rawTopics.map((item) => String(item ?? '')).filter(Boolean)

  const normalized = {
    ...question,
    id: String(question.id || crypto.randomUUID()),
    type,
    text,
    question: text,
    options,
    correctAnswer,
    correct_answer: correctAnswer,
    explanation:
      typeof question.explanation === 'string'
        ? question.explanation
        : typeof question.description === 'string'
          ? question.description
          : typeof question.reasoning === 'string'
            ? question.reasoning
            : undefined,
    difficulty: typeof question.difficulty === 'string' ? question.difficulty : undefined,
    topics,
  }
  return normalized as T
}

export function normalizeExamQuestions<T extends AnyQuestion>(questions: T[]): T[] {
  if (!Array.isArray(questions)) return []
  return questions.map((q) => normalizeExamQuestion(q))
}

export function normalizeExamQuestionsForUi<T extends AnyQuestion>(questions: T[]): T[] {
  return normalizeExamQuestions(questions)
}
