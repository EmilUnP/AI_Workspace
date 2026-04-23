import { generateJSON } from '../gemini'
import { createExamGenerationPrompt, createQuestionImprovementPrompt } from '../prompts/exam'
import type { Question, ExamGenerationSettings } from '@eduator/core/types/exam'
import { generateId } from '@eduator/core/utils/generate-id'

export interface GenerateQuestionsParams {
  documentText: string
  settings: ExamGenerationSettings
  subject?: string
  gradeLevel?: string
  language?: string
  customInstructions?: string
}

export interface GenerateQuestionsResult {
  questions: Question[]
  tokensUsed: number
  generationTimeMs: number
  warnings?: string[]
}

/**
 * Question Generator Service
 * Generates exam questions from document content using Gemini AI
 */
export const questionGenerator = {
  /**
   * Generate questions from document text
   */
  async generateFromDocument(params: GenerateQuestionsParams): Promise<GenerateQuestionsResult> {
    const startTime = Date.now()
    const warnings: string[] = []

    // Validate input
    if (!params.documentText || params.documentText.trim().length < 50) {
      throw new Error('Document text must be at least 50 characters long')
    }

    if (params.settings.question_count < 1 || params.settings.question_count > 50) {
      throw new Error('Question count must be between 1 and 50')
    }

    // Generate the prompt
    const prompt = createExamGenerationPrompt({
      documentText: params.documentText,
      questionCount: params.settings.question_count,
      difficultyDistribution: params.settings.difficulty_distribution,
      questionTypes: params.settings.question_types,
      subject: params.subject,
      gradeLevel: params.gradeLevel,
      language: params.language,
      customInstructions: params.customInstructions,
      includeExplanations: params.settings.include_explanations,
      includeHints: params.settings.include_hints,
    })

    try {
      // Generate questions using Gemini
      const { data, tokensUsed } = await generateJSON<{ questions: Question[] }>(prompt, {
        model: 'pro', // Use Pro for better quality
      })

      // Validate and enhance questions
      const questions = data.questions.map((q, index) => ({
        ...q,
        id: q.id || generateId(),
        order: q.order || index,
        points: 1,
      }))

      // Check if we got the expected number of questions
      if (questions.length < params.settings.question_count) {
        warnings.push(
          `Generated ${questions.length} questions instead of ${params.settings.question_count}`
        )
      }

      // Validate difficulty distribution
      const difficultyCount = {
        easy: questions.filter((q) => q.difficulty === 'easy').length,
        medium: questions.filter((q) => q.difficulty === 'medium').length,
        hard: questions.filter((q) => q.difficulty === 'hard').length,
      }

      const totalQuestions = questions.length
      const actualDistribution = {
        easy: Math.round((difficultyCount.easy / totalQuestions) * 100),
        medium: Math.round((difficultyCount.medium / totalQuestions) * 100),
        hard: Math.round((difficultyCount.hard / totalQuestions) * 100),
      }

      // Check for significant distribution deviation
      const targetDist = params.settings.difficulty_distribution
      if (
        Math.abs(actualDistribution.easy - targetDist.easy) > 20 ||
        Math.abs(actualDistribution.medium - targetDist.medium) > 20 ||
        Math.abs(actualDistribution.hard - targetDist.hard) > 20
      ) {
        warnings.push('Difficulty distribution differs from requested')
      }

      const generationTimeMs = Date.now() - startTime

      return {
        questions,
        tokensUsed,
        generationTimeMs,
        warnings: warnings.length > 0 ? warnings : undefined,
      }
    } catch (error) {
      console.error('Question generation error:', error)
      throw new Error(`Failed to generate questions: ${(error as Error).message}`)
    }
  },

  /**
   * Improve a single question based on feedback
   */
  async improveQuestion(params: {
    question: string
    options?: string[]
    correctAnswer: string | string[]
    feedback: string
  }): Promise<{ question: Question; tokensUsed: number }> {
    const prompt = createQuestionImprovementPrompt(params)

    const { data, tokensUsed } = await generateJSON<Question>(prompt, {
      model: 'pro',
    })

    return {
      question: {
        ...data,
        id: generateId(),
      },
      tokensUsed,
    }
  },

  /**
   * Generate more questions of a specific type/difficulty
   */
  async generateMore(params: {
    documentText: string
    existingQuestions: Question[]
    count: number
    questionType?: string
    difficulty?: string
    subject?: string
    gradeLevel?: string
  }): Promise<{ questions: Question[]; tokensUsed: number }> {
    const existingIds = params.existingQuestions.map((q) => q.question).join('\n')

    const prompt = `Generate ${params.count} NEW, professional exam questions from the following content. Questions must be DIFFERENT from existing ones and fully self-contained.

## Source Content:
${params.documentText}

## Existing Questions (DO NOT duplicate these):
${existingIds}

## Requirements:
${params.questionType ? `- Question Type: ${params.questionType}` : ''}
${params.difficulty ? `- Difficulty: ${params.difficulty}` : ''}
${params.subject ? `- Subject: ${params.subject}` : ''}
${params.gradeLevel ? `- Grade Level: ${params.gradeLevel}` : ''}
- Do NOT reference page numbers, section names, or unseen figures/tables.
- Explanations must be direct and student-facing. Do NOT start with filler like "According to the text...", "The text states...", "Mətndə ... qeyd olunur ki", or similar source-referencing intros in any language.

Generate ${params.count} unique questions in JSON format:
{
  "questions": [
    {
      "type": "question_type",
      "question": "question text",
      "options": ["for multiple choice"],
      "correct_answer": "answer",
      "difficulty": "easy|medium|hard",
      "explanation": "why correct"
    }
  ]
}`

    const { data, tokensUsed } = await generateJSON<{ questions: Question[] }>(prompt, {
      model: 'flash', // Use Flash for speed
    })

    const questions = data.questions.map((q, index) => ({
      ...q,
      id: generateId(),
      order: params.existingQuestions.length + index,
      points: 1,
    }))

    return { questions, tokensUsed }
  },
}
