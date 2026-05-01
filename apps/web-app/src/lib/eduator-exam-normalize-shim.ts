type AnyQuestion = Record<string, unknown>

export function normalizeExamQuestion<T extends AnyQuestion>(question: T): T {
  return question
}

export function normalizeExamQuestions<T extends AnyQuestion>(questions: T[]): T[] {
  return questions
}

export function normalizeExamQuestionsForUi<T extends AnyQuestion>(questions: T[]): T[] {
  return questions
}
