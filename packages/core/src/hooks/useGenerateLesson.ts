/**
 * Lesson Generation Hook
 * Manages the state and orchestration of AI-powered lesson generation
 */

import { useState, useCallback } from 'react'

export type GenerationStep = 
  | 'idle'
  | 'analyzing'     // Analyzing document and finding relevant chunks
  | 'generating'    // Generating lesson content with AI
  | 'images'        // Generating images (if enabled)
  | 'saving'        // Saving to database
  | 'audio'         // Generating TTS audio (background, if enabled)
  | 'complete'      // Generation finished
  | 'error'         // Error occurred

export interface GenerationOptions {
  includeImages?: boolean   // Generate AI images (default: true)
  includeAudio?: boolean    // Generate TTS audio (default: true)
  centerText?: boolean      // Center-align lesson content (default: true)
}

export interface GeneratedLessonResult {
  id: string
  title: string
  topic: string
  content: string
  images?: Array<{
    url: string
    alt: string
    description: string
    position?: 'top' | 'middle' | 'bottom'
  }>
  mini_test?: Array<{
    question: string
    options: string[]
    correct_answer: number
    explanation: string
  }>
  examples?: Array<{
    title: string
    description: string
    code?: string
  }>
  audio_url?: string | null
  class_id?: string | null
  document_id?: string
  created_at: string
}

export interface UseGenerateLessonReturn {
  generateLesson: (
    documentId: string,
    topic: string,
    classId?: string | null,
    language?: string,
    options?: GenerationOptions
  ) => Promise<GeneratedLessonResult | null>
  loading: boolean
  error: string | null
  currentStep: GenerationStep
  resetStep: () => void
}

/**
 * Hook for generating lessons with AI
 * Provides loading states, step tracking, and error handling
 */
export function useGenerateLesson(): UseGenerateLessonReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<GenerationStep>('idle')

  const generateLesson = useCallback(async (
    documentId: string,
    topic: string,
    classId?: string | null,
    language?: string,
    options?: GenerationOptions
  ): Promise<GeneratedLessonResult | null> => {
    setLoading(true)
    setError(null)
    setCurrentStep('analyzing')

    try {
      const opts = options || {}
      const includeImages = opts.includeImages !== false // default true
      const includeAudio = opts.includeAudio !== false // default true

      // Simulate step progression for better UX
      const stepTimer = setTimeout(() => setCurrentStep('generating'), 2000)
      const stepTimer2 = includeImages ? setTimeout(() => setCurrentStep('images'), 8000) : null
      const stepTimer3 = setTimeout(() => setCurrentStep('saving'), includeImages ? 15000 : 10000)

      const response = await fetch('/api/teacher/lessons/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          topic,
          classId: classId || null,
          language: language || 'en',
          options: {
            includeImages,
            includeAudio,
            centerText: opts.centerText !== false, // default true
          },
        }),
      })

      // Clear timers
      clearTimeout(stepTimer)
      if (stepTimer2) clearTimeout(stepTimer2)
      clearTimeout(stepTimer3)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to generate lesson (${response.status})`)
      }

      const data = await response.json()
      
      if (includeAudio) {
        setCurrentStep('audio')
      }

      // Show complete after a short delay
      setTimeout(() => setCurrentStep('complete'), 1500)

      return data.lesson as GeneratedLessonResult
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate lesson'
      setError(errorMessage)
      setCurrentStep('error')
      console.error('Error generating lesson:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const resetStep = useCallback(() => {
    setCurrentStep('idle')
    setError(null)
  }, [])

  return { generateLesson, loading, error, currentStep, resetStep }
}

/**
 * Step labels for UI display
 */
export const GENERATION_STEP_LABELS: Record<GenerationStep, string> = {
  idle: 'Ready',
  analyzing: 'Analyzing document...',
  generating: 'Generating lesson content...',
  images: 'Creating images...',
  saving: 'Saving lesson...',
  audio: 'Generating audio narration...',
  complete: 'Complete!',
  error: 'Error occurred',
}

/**
 * Get progress percentage for current step
 */
export function getStepProgress(step: GenerationStep, includeImages: boolean, includeAudio: boolean): number {
  const steps: GenerationStep[] = ['analyzing', 'generating']
  if (includeImages) steps.push('images')
  steps.push('saving')
  if (includeAudio) steps.push('audio')
  steps.push('complete')

  const currentIndex = steps.indexOf(step)
  if (currentIndex === -1) return 0
  return Math.round(((currentIndex + 1) / steps.length) * 100)
}
