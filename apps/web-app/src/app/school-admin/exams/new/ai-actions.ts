'use server'

const AI_MOVED_MESSAGE =
  'This AI feature moved to clean-backend. Use apps/clean-backend /v1/ai/* endpoints.'

interface Question {
  id: string
}

interface QuestionTypeDistribution {
  multiple_choice: number
  true_false: number
  multiple_select: number
  fill_blank: number
}

interface DifficultyDistribution {
  easy: number
  medium: number
  hard: number
}

interface GenerateInput {
  documentIds?: string[]
  organizationId: string
  questionCount: number
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
  language: string
  topics?: string[]
  /** Optional per-topic question counts (same order as topics). If all set, total is sum of these. */
  topicQuestionCounts?: (number | undefined)[]
  customPrompt?: string
  questionTypes?: QuestionTypeDistribution
  difficultyLevels?: DifficultyDistribution
}

interface TranslateInput {
  questions: Question[]
  targetLanguage: string
}

export async function generateExamFromDocuments(input: GenerateInput) {
  void input
  return { error: AI_MOVED_MESSAGE }
}

export async function translateExam(input: TranslateInput) {
  void input
  return { error: AI_MOVED_MESSAGE }
}
