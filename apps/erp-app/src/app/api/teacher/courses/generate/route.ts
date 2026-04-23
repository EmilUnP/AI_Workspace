/**
 * Course Generation API Route
 * Generates AI-powered multi-lesson courses from documents using RAG
 */

import { NextRequest, NextResponse } from 'next/server'

/** Max execution time (seconds). Use Vercel plan limit so generation can finish (structure + lessons + exam). */
export const maxDuration = 300
import { createClient } from '@eduator/auth/supabase/server'
import { normalizeLanguageCode } from '@eduator/config'
import { generateCourse } from '@eduator/ai/services/course-generator'
import type { CourseGenerationRequest, CourseDifficultyLevel, CourseStyle } from '@eduator/core/types/course'
import { requireCourseAuth } from '@eduator/core/utils/api-helpers'
import { tokenRepository } from '@eduator/db/repositories/tokens'

interface GenerateCourseRequestBody {
  document_ids: string[]
  difficulty_level: string
  num_lessons: number
  language: string
  course_style: string
  subject?: string
  grade_level?: string
  topic?: string
  lesson_topics?: string[]
  exam_settings?: {
    question_count?: number
    duration_minutes?: number
    question_types?: Array<'multiple_choice' | 'multiple_select' | 'fill_blank' | 'true_false'>
    difficulty_distribution?: {
      easy: number
      medium: number
      hard: number
    }
  }
  lesson_generation_options?: {
    includeImages?: boolean
    includeAudio?: boolean
    centerText?: boolean
  }
}

export async function POST(request: NextRequest) {
  let tokenDeduct: { success: boolean; errorMessage?: string; cost?: number } | undefined
  let profile: { id: string } | null = null
  try {
    const auth = await requireCourseAuth()
    if (auth.error) {
      return auth.error
    }
    const { organizationId } = auth
    profile = auth.profile

    const body: GenerateCourseRequestBody = await request.json()
    const { 
      document_ids, 
      difficulty_level, 
      num_lessons, 
      language, 
      course_style,
      subject,
      grade_level,
      topic,
      lesson_topics,
      exam_settings,
      lesson_generation_options
    } = body

    // Validation
    if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one document is required' },
        { status: 400 }
      )
    }

    if (!difficulty_level || !num_lessons || !language || !course_style) {
      return NextResponse.json(
        { error: 'difficulty_level, num_lessons, language, and course_style are required' },
        { status: 400 }
      )
    }

    if (num_lessons < 1 || num_lessons > 50) {
      return NextResponse.json(
        { error: 'num_lessons must be between 1 and 50' },
        { status: 400 }
      )
    }

    // Verify documents belong to user's organization
    const supabase = await createClient()
    for (const docId of document_ids) {
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('id, organization_id, created_by')
        .eq('id', docId)
        .eq('organization_id', organizationId!)
        .single()

      if (docError || !document) {
        return NextResponse.json(
          { error: `Document ${docId} not found or access denied` },
          { status: 404 }
        )
      }
    }

    // Normalize language so DB and AI get 2-letter code (en, az, ...) even if client sent name
    const languageCode = normalizeLanguageCode(language)

    const lessonOpts = lesson_generation_options ?? {}
    const includeImages = lessonOpts.includeImages !== false
    const includeAudio = lessonOpts.includeAudio !== false
    // Same formula as course-generator: final exam question count
    const examQuestionCount =
      exam_settings?.question_count ??
      Math.min(15, Math.max(5, Math.ceil(num_lessons * 1.5)))
    tokenDeduct = await tokenRepository.deductTokensForAction(profile!.id, 'course_generation', {
      lesson_count: num_lessons,
      include_images: includeImages,
      include_audio: includeAudio,
      image_count_per_lesson: 3,
      exam_question_count: examQuestionCount,
    })
    if (!tokenDeduct.success) {
      return NextResponse.json(
        { error: tokenDeduct.errorMessage ?? 'Insufficient tokens' },
        { status: 402 }
      )
    }

    console.log('[Course Generation] Starting course generation...')
    console.log('[Course Generation] Document IDs:', document_ids)
    console.log('[Course Generation] Using ALL', document_ids.length, 'document(s): each lesson will use document 1, 2, 3, ... in order')
    console.log('[Course Generation] Num Lessons:', num_lessons)
    console.log('[Course Generation] Difficulty:', difficulty_level)
    console.log('[Course Generation] Language:', languageCode)
    console.log('[Course Generation] Style:', course_style)
    console.log('[Course Generation] Organization ID:', organizationId)

    // Generate course
    const requestData: CourseGenerationRequest = {
      document_ids,
      difficulty_level: difficulty_level as CourseDifficultyLevel,
      num_lessons,
      language: languageCode,
      course_style: course_style as CourseStyle,
      subject,
      grade_level,
      topic,
      lesson_topics,
      exam_settings,
      lesson_generation_options,
    }

    const result = await generateCourse(
      requestData,
      profile!.id, // Use profile.id (profiles table) not user.id (auth.users)
      organizationId!
    )

    console.log('[Course Generation] ✅ Course generated successfully:', result.course_id)
    if (result.generation_log && result.generation_log.length > 0) {
      console.log('[Course Generation] Full generation log (analyze):', JSON.stringify(result.generation_log, null, 2))
    }
    if (result.usage) {
      await tokenRepository
        .attachMetadataToLatestUsageTransaction(profile!.id, 'course_generation', {
          input_tokens: result.usage.input_tokens,
          output_tokens: result.usage.output_tokens,
          prompt_tokens: result.usage.prompt_tokens,
          completion_tokens: result.usage.completion_tokens,
          total_tokens: result.usage.total_tokens,
          model_used: result.usage.model_used,
          course_structure_tokens: result.usage.course_structure_tokens ?? 0,
          lesson_text_tokens: result.usage.lesson_text_tokens ?? 0,
          lesson_image_tokens: result.usage.lesson_image_tokens ?? 0,
          lesson_tts_tokens: result.usage.lesson_tts_tokens ?? 0,
          exam_tokens: result.usage.exam_tokens ?? 0,
        })
        .catch(() => {})
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error: unknown) {
    const cost = tokenDeduct?.cost ?? 0
    if (cost > 0 && profile) {
      await tokenRepository.addTokens(profile.id, cost, 'refund', undefined, { reason: 'ai_failed' }).catch(() => {})
    }
    console.error('Error generating course:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate course',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
