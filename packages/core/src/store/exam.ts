import { create } from 'zustand'
import type { Exam, Question, ExamSettings, DifficultyDistribution } from '../types'
import { DEFAULT_EXAM_SETTINGS } from '@eduator/config'

/**
 * Exam Store - Manages exam creation and editing state
 */

export interface ExamState {
  // State
  currentExam: Partial<Exam> | null
  questions: Question[]
  settings: ExamSettings
  isGenerating: boolean
  generationProgress: number
  error: string | null

  // Actions
  setCurrentExam: (exam: Partial<Exam> | null) => void
  setQuestions: (questions: Question[]) => void
  addQuestion: (question: Question) => void
  updateQuestion: (index: number, question: Partial<Question>) => void
  removeQuestion: (index: number) => void
  reorderQuestions: (fromIndex: number, toIndex: number) => void
  setSettings: (settings: Partial<ExamSettings>) => void
  setDifficultyDistribution: (distribution: DifficultyDistribution) => void
  setGenerating: (isGenerating: boolean, progress?: number) => void
  setError: (error: string | null) => void
  resetExam: () => void
}

const defaultSettings: ExamSettings = {
  question_count: DEFAULT_EXAM_SETTINGS.questionCount,
  difficulty_distribution: DEFAULT_EXAM_SETTINGS.difficultyDistribution,
  question_types: DEFAULT_EXAM_SETTINGS.questionTypes as ExamSettings['question_types'],
  time_limit_minutes: DEFAULT_EXAM_SETTINGS.timeLimit,
  shuffle_questions: DEFAULT_EXAM_SETTINGS.shuffleQuestions,
  shuffle_options: DEFAULT_EXAM_SETTINGS.shuffleOptions,
  show_results_immediately: DEFAULT_EXAM_SETTINGS.showResults,
  show_correct_answers: true,
  allow_review: true,
  passing_score: 60,
  max_attempts: 1,
  require_webcam: false,
  require_lockdown: false,
}

export const useExamStore = create<ExamState>()((set) => ({
  // Initial state
  currentExam: null,
  questions: [],
  settings: defaultSettings,
  isGenerating: false,
  generationProgress: 0,
  error: null,

  // Actions
  setCurrentExam: (exam) =>
    set({ currentExam: exam }),

  setQuestions: (questions) =>
    set({ questions }),

  addQuestion: (question) =>
    set((state) => ({
      questions: [...state.questions, { ...question, order: state.questions.length }],
    })),

  updateQuestion: (index, questionUpdate) =>
    set((state) => ({
      questions: state.questions.map((q, i) =>
        i === index ? { ...q, ...questionUpdate } : q
      ),
    })),

  removeQuestion: (index) =>
    set((state) => ({
      questions: state.questions
        .filter((_, i) => i !== index)
        .map((q, i) => ({ ...q, order: i })),
    })),

  reorderQuestions: (fromIndex, toIndex) =>
    set((state) => {
      const questions = [...state.questions]
      const [removed] = questions.splice(fromIndex, 1)
      questions.splice(toIndex, 0, removed)
      return {
        questions: questions.map((q, i) => ({ ...q, order: i })),
      }
    }),

  setSettings: (settingsUpdate) =>
    set((state) => ({
      settings: { ...state.settings, ...settingsUpdate },
    })),

  setDifficultyDistribution: (distribution) =>
    set((state) => ({
      settings: {
        ...state.settings,
        difficulty_distribution: distribution,
      },
    })),

  setGenerating: (isGenerating, progress = 0) =>
    set({ isGenerating, generationProgress: progress }),

  setError: (error) =>
    set({ error }),

  resetExam: () =>
    set({
      currentExam: null,
      questions: [],
      settings: defaultSettings,
      isGenerating: false,
      generationProgress: 0,
      error: null,
    }),
}))

/**
 * Exam selectors
 */
export const selectQuestions = (state: ExamState) => state.questions
export const selectSettings = (state: ExamState) => state.settings
export const selectIsGenerating = (state: ExamState) => state.isGenerating
export const selectTotalPoints = (state: ExamState) => state.questions.length
export const selectQuestionsByDifficulty = (state: ExamState) => ({
  easy: state.questions.filter((q) => q.difficulty === 'easy'),
  medium: state.questions.filter((q) => q.difficulty === 'medium'),
  hard: state.questions.filter((q) => q.difficulty === 'hard'),
})
