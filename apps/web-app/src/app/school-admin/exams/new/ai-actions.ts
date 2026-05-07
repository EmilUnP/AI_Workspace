'use server'

import { getAccessToken } from '@/lib/backend-auth'

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
  durationMinutes?: number
  title?: string
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
  try {
    const token = await getAccessToken()
    if (!token) return { error: 'Not authenticated' }
    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'

    const questionTypes = input.questionTypes
      ? (Object.entries(input.questionTypes)
          .filter(([, count]) => Number(count || 0) > 0)
          .map(([type]) => type) as Array<'multiple_choice' | 'true_false' | 'multiple_select' | 'fill_blank'>)
      : undefined

    const response = await fetch(`${backendBase}/v1/ai/exams/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentIds: Array.isArray(input.documentIds) ? input.documentIds : [],
        title: input.title,
        durationMinutes: Number(input.durationMinutes || 60),
        language: input.language || 'en',
        questionCount: Number(input.questionCount || 10),
        topics: input.topics,
        customPrompt: input.customPrompt,
        questionTypes,
        difficultyDistribution: input.difficultyLevels,
      }),
      cache: 'no-store',
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      exam?: { id?: string; questions?: Question[] }
    }
    if (!response.ok) return { error: payload.error || 'Failed to generate exam' }
    return {
      success: true,
      questions: payload.exam?.questions || [],
      examId: payload.exam?.id,
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to generate exam' }
  }
}

export async function translateExam(input: TranslateInput) {
  try {
    const token = await getAccessToken()
    if (!token) return { error: 'Not authenticated' }
    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'

    const response = await fetch(`${backendBase}/v1/ai/exams/translate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        questions: input.questions,
        targetLanguage: input.targetLanguage,
      }),
      cache: 'no-store',
    })

    const payload = (await response.json().catch(() => ({}))) as { error?: string; questions?: Question[] }
    if (!response.ok) return { error: payload.error || 'Failed to translate exam' }
    return { success: true, questions: payload.questions || [] }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to translate exam' }
  }
}
