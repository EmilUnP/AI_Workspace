'use server'

import { createClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import {
  generateExamQuestionsFromDocuments,
  translateExamQuestions,
  type GeneratedQuestion,
} from '@eduator/ai/services/exam-generator'
import { tokenRepository } from '@eduator/db/repositories/tokens'

interface Question extends GeneratedQuestion {
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
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Get teacher profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return { error: 'Profile not found' }
    }

    // Get document contents
    const selectedDocumentIds = Array.isArray(input.documentIds) ? input.documentIds : []
    let documents: Array<{ id: string; title: string; file_type: string | null }> = []
    if (selectedDocumentIds.length > 0) {
      const { data: fetchedDocuments, error: docsError } = await adminSupabase
        .from('documents')
        .select('id, title, file_type')
        .in('id', selectedDocumentIds)
        .eq('created_by', profile.id)

      if (docsError || !fetchedDocuments || fetchedDocuments.length === 0) {
        return { error: 'Documents not found or access denied' }
      }
      documents = fetchedDocuments
    }

    const questionCount = input.questionCount ?? 0
    const tokenDeduct = await tokenRepository.deductTokensForAction(profile.id, 'exam_generation', { question_count: questionCount })
    if (!tokenDeduct.success) {
      return { error: tokenDeduct.errorMessage ?? 'Insufficient tokens' }
    }

    let result: Awaited<ReturnType<typeof generateExamQuestionsFromDocuments>>
    try {
      result = await generateExamQuestionsFromDocuments({
      documentIds: selectedDocumentIds,
      userId: user.id,
      documents,
      questionCount: input.questionCount,
      difficulty: input.difficulty,
      language: input.language,
      topics: input.topics,
      topicQuestionCounts: input.topicQuestionCounts,
      customPrompt: input.customPrompt,
      questionTypes: input.questionTypes,
      difficultyLevels: input.difficultyLevels,
    })
    } catch (aiError) {
      if ((tokenDeduct.cost ?? 0) > 0) {
        await tokenRepository.addTokens(profile.id, tokenDeduct.cost!, 'refund', undefined, { reason: 'ai_failed' }).catch(() => {})
      }
      throw aiError
    }

    if (result.error) {
      if ((tokenDeduct.cost ?? 0) > 0) {
        await tokenRepository.addTokens(profile.id, tokenDeduct.cost!, 'refund', undefined, { reason: 'ai_failed' }).catch(() => {})
      }
      return { error: result.error }
    }

    if (result.usage) {
      await tokenRepository
        .attachMetadataToLatestUsageTransaction(profile.id, 'exam_generation', {
          input_tokens: result.usage.input_tokens,
          output_tokens: result.usage.output_tokens,
          prompt_tokens: result.usage.prompt_tokens,
          completion_tokens: result.usage.completion_tokens,
          total_tokens: result.usage.total_tokens,
          model_used: 'models/gemini-2.5-flash',
          question_count_requested: questionCount,
          question_count_generated: Array.isArray(result.questions) ? result.questions.length : questionCount,
        })
        .catch(() => {})
    }

    return { success: true, questions: result.questions as Question[] }
  } catch (error) {
    console.error('Generate exam error:', error)
    return {
      error: error instanceof Error
        ? error.message
        : 'Failed to generate exam. Please check your API key configuration.',
    }
  }
}

export async function translateExam(input: TranslateInput) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Not authenticated' }
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (!profile) {
      return { error: 'Profile not found' }
    }

    const questionCount = Array.isArray(input.questions) ? input.questions.length : 0
    const tokenDeduct = await tokenRepository.deductTokensForAction(profile.id, 'exam_translation', {
      question_count: questionCount,
    })
    if (!tokenDeduct.success) {
      return { error: tokenDeduct.errorMessage ?? 'Insufficient tokens' }
    }
    const result = await translateExamQuestions({
      questions: input.questions,
      targetLanguage: input.targetLanguage,
    })
    if (result.error) {
      if ((tokenDeduct.cost ?? 0) > 0) {
        await tokenRepository
          .addTokens(profile.id, tokenDeduct.cost!, 'refund', undefined, { reason: 'ai_failed' })
          .catch(() => {})
      }
      return { error: result.error }
    }
    if (result.usage) {
      await tokenRepository
        .attachMetadataToLatestUsageTransaction(profile.id, 'exam_translation', {
          input_tokens: result.usage.input_tokens,
          output_tokens: result.usage.output_tokens,
          prompt_tokens: result.usage.prompt_tokens,
          completion_tokens: result.usage.completion_tokens,
          total_tokens: result.usage.total_tokens,
          model_used: 'models/gemini-2.5-flash',
          question_count_requested: questionCount,
          question_count_translated: Array.isArray(result.questions) ? result.questions.length : questionCount,
          translation_target_language: input.targetLanguage,
        })
        .catch(() => {})
    }

    return { success: true, questions: result.questions as Question[] }
  } catch (error) {
    console.error('Translate exam error:', error)
    return { 
      error: error instanceof Error 
        ? error.message 
        : 'Failed to translate exam. Please check your API key configuration.'
    }
  }
}
