'use server'

import { getAccessToken } from '@/lib/backend-auth'
import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'

interface Question {
  id: string
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank'
  text: string
  options: string[]
  correctAnswer: string | string[]
  explanation?: string
}

interface CreateExamInput {
  organizationId: string
  title: string
  description?: string | null
  subject?: string | null
  gradeLevel?: string | null
  durationMinutes: number
  questions: Question[]
  isPublished: boolean
  language?: string // Primary language code (e.g., 'en', 'az', 'tr')
  translations?: Record<string, Question[]> // Translations in other languages
  /** Show correct answers in published exam results (default true) */
  showCorrectAnswers?: boolean
  /** Show explanations in published exam results (default true) */
  showExplanations?: boolean
}

export async function createExam(input: CreateExamInput) {
  try {
    const token = await getAccessToken()
    if (!token) return { error: 'Not authenticated' }
    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'

    const examData = {
      title: input.title,
      description: input.description,
      subject: input.subject,
      gradeLevel: input.gradeLevel,
      durationMinutes: input.durationMinutes,
      questions: input.questions,
      language: input.language || 'en',
      translations: input.translations || {},
      settings: {
        questionTypes: {
          multipleChoice: input.questions.filter(q => q.type === 'multiple_choice').length,
          trueFalse: input.questions.filter(q => q.type === 'true_false').length,
          shortAnswer: input.questions.filter(q => q.type === 'short_answer').length,
          fillBlank: input.questions.filter(q => q.type === 'fill_blank').length,
        },
        totalQuestions: input.questions.length,
        show_correct_answers: input.showCorrectAnswers !== false,
        show_explanations: input.showExplanations !== false,
      },
      isPublished: input.isPublished,
      topics: [],
    }

    const response = await fetch(`${backendBase}/v1/exams`, {
      method: 'POST',
      headers: {
        ...webAppBackendAuthHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(examData),
      cache: 'no-store',
    })
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      console.error('Create exam error:', payload.error || response.statusText)
      return { error: 'Failed to create exam' }
    }
    const payload = (await response.json()) as { exam?: Record<string, unknown> }
    const exam = payload.exam || null

    return { success: true, data: exam }
  } catch (error) {
    console.error('Create exam error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function deleteExam(examId: string) {
  try {
    const token = await getAccessToken()
    if (!token) return { error: 'Not authenticated' }
    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'
    const response = await fetch(`${backendBase}/v1/exams/${examId}`, {
      method: 'DELETE',
      headers: webAppBackendAuthHeaders(token),
      cache: 'no-store',
    })
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      console.error('Delete exam error:', payload.error || response.statusText)
      return { error: 'Failed to delete exam' }
    }

    return { success: true }
  } catch (error) {
    console.error('Delete exam error:', error)
    return { error: 'An unexpected error occurred' }
  }
}
