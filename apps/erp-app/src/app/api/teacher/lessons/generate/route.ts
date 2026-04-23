/**
 * Lesson Generation API Route
 * Generates AI-powered lessons from documents using RAG
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@eduator/auth/supabase/server'
import { normalizeLanguageCode } from '@eduator/config'
import { generateLesson } from '@eduator/ai/services/lesson-generator'
import { generateLessonAudioWithUsage } from '@eduator/ai/tts-generator'
import { lessonRepository } from '@eduator/db'
import { tokenRepository } from '@eduator/db/repositories/tokens'

interface GenerateRequestBody {
  /** Single document (legacy); use documentIds for multi-document RAG */
  documentId?: string
  /** Multiple documents for RAG; when set, lesson is generated from all. Primary for DB is documentIds[0]. */
  documentIds?: string[]
  topic: string
  objectives?: string
  corePrompt?: string
  gradeLevel?: string
  classId?: string | null
  language?: string
  options?: {
    includeImages?: boolean
    includeAudio?: boolean
    centerText?: boolean
    includeTables?: boolean
    includeFigures?: boolean
    includeCharts?: boolean
    contentLength?: 'short' | 'medium' | 'full'
  }
}

/**
 * Require auth helper
 */
async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      user: null,
      profile: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  // Get profile with organization
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, organization_id, profile_type')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    return {
      user: null,
      profile: null,
      error: NextResponse.json({ error: 'Profile not found' }, { status: 401 }),
    }
  }

  // Check if teacher
  if (profile.profile_type !== 'teacher' && profile.profile_type !== 'school_superadmin') {
    return {
      user: null,
      profile: null,
      error: NextResponse.json({ error: 'Only teachers can generate lessons' }, { status: 403 }),
    }
  }

  return { user, profile, error: null }
}

export async function POST(request: NextRequest) {
  let profile: { id: string; organization_id: string } | null = null
  let tokenDeduct: { success: boolean; errorMessage?: string; cost?: number } | undefined
  try {
    const auth = await requireAuth()
    if (auth.error) {
      return auth.error
    }
    profile = auth.profile

    const body: GenerateRequestBody = await request.json()
    const { documentId: bodyDocumentId, documentIds: bodyDocumentIds, topic, objectives, corePrompt, gradeLevel, classId, options } = body
    const documentIds = Array.isArray(bodyDocumentIds) && bodyDocumentIds.length > 0
      ? bodyDocumentIds
      : bodyDocumentId
        ? [bodyDocumentId]
        : []
    const primaryDocumentId = documentIds[0]

    const rawLanguage = body.language != null && typeof body.language === 'string' ? body.language.trim() : ''
    const selectedLanguage = normalizeLanguageCode(rawLanguage || undefined)

    console.log('[Lesson Generate] Request language:', { raw: body.language, rawLanguage: rawLanguage, selectedLanguage })
    if (documentIds.length > 1) {
      console.log('[Lesson Generate] Using', documentIds.length, 'documents for RAG')
    }

    const genOptions = options || {}
    const includeImages = genOptions.includeImages !== false
    const includeAudio = genOptions.includeAudio !== false
    const centerText = genOptions.centerText !== false
    const contentOptions = {
      includeTables: genOptions.includeTables !== false,
      includeFigures: genOptions.includeFigures === true,
      includeCharts: genOptions.includeCharts === true,
      contentLength: genOptions.contentLength ?? 'medium',
    }

    if (!topic.trim()) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    for (const docId of documentIds) {
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('id, organization_id, title')
        .eq('id', docId)
        .single()

      if (docError || !document) {
        return NextResponse.json(
          { error: `Document not found: ${docId}` },
          { status: 404 }
        )
      }
      if (document.organization_id !== profile!.organization_id) {
        return NextResponse.json(
          { error: 'Access denied to one or more documents' },
          { status: 403 }
        )
      }
    }
    let primaryDocument: { id: string; title: string } | null = null
    if (primaryDocumentId) {
      const { data } = await supabase
        .from('documents')
        .select('id, title')
        .eq('id', primaryDocumentId)
        .single()
      primaryDocument = data ?? null
    }

    // If classId is provided, verify teacher is assigned to this class
    if (classId) {
      const { data: classAccess } = await supabase
        .from('classes')
        .select('id')
        .eq('id', classId)
        .eq('organization_id', profile!.organization_id)
        .single()

      if (!classAccess) {
        return NextResponse.json(
          { error: 'You do not have access to this class' },
          { status: 403 }
        )
      }
    }

    // Generate lesson ID upfront for image storage
    const lessonId = crypto.randomUUID()

    tokenDeduct = await tokenRepository.deductTokensForAction(profile!.id, 'lesson_generation', {
      include_images: includeImages,
      include_audio: includeAudio,
      image_count: includeImages ? 3 : 0,
    }, lessonId)
    if (!tokenDeduct.success) {
      return NextResponse.json(
        { error: tokenDeduct.errorMessage ?? 'Insufficient tokens' },
        { status: 402 }
      )
    }

    if (gradeLevel) console.log('[Lesson Generation] Grade Level:', gradeLevel)
    if (objectives) console.log('[Lesson Generation] Custom Objectives: yes')

    let generatedLesson
    try {
      generatedLesson = await generateLesson(
      primaryDocumentId ?? null,
      topic,
      profile!.id,
      selectedLanguage,
      includeImages,
      lessonId,
      contentOptions,
      documentIds.length > 1 ? documentIds : undefined,
      objectives?.trim() || undefined,
      gradeLevel || undefined,
      corePrompt?.trim() || undefined
      )
    } catch (aiError) {
      if ((tokenDeduct?.cost ?? 0) > 0) {
        await tokenRepository.addTokens(profile!.id, tokenDeduct!.cost!, 'refund', undefined, { reason: 'ai_failed' }).catch(() => {})
      }
      throw aiError
    }

    if (generatedLesson.usage) {
      await tokenRepository
        .attachMetadataToUsageTransactionByReference(profile!.id, 'lesson_generation', lessonId, {
          input_tokens: generatedLesson.usage.input_tokens,
          output_tokens: generatedLesson.usage.output_tokens,
          prompt_tokens: generatedLesson.usage.prompt_tokens,
          completion_tokens: generatedLesson.usage.completion_tokens,
          total_tokens: generatedLesson.usage.total_tokens,
          model_used: generatedLesson.usage.model_used,
          image_model_used: generatedLesson.usage.image_model_used ?? null,
          image_prompt_tokens: generatedLesson.usage.image_prompt_tokens ?? 0,
          image_completion_tokens: generatedLesson.usage.image_completion_tokens ?? 0,
          image_total_tokens: generatedLesson.usage.image_total_tokens ?? 0,
          image_count_requested: includeImages ? 3 : 0,
          image_count_generated: includeImages ? (generatedLesson.images?.length ?? 0) : 0,
          mini_test_count: Array.isArray(generatedLesson.mini_test) ? generatedLesson.mini_test.length : 0,
          objectives_count: Array.isArray(generatedLesson.learning_objectives)
            ? generatedLesson.learning_objectives.length
            : 0,
          content_char_count: typeof generatedLesson.content === 'string' ? generatedLesson.content.length : 0,
          rag_document_count: documentIds.length,
          include_images: includeImages,
          include_audio: includeAudio,
        })
        .catch(() => {})
    }

    // Store original content for audio generation
    const originalContent = generatedLesson.content

    // Store raw markdown only (same as course generation). Center text is applied at render from metadata.generation_options.centerText.
    const lessonImages = includeImages ? (generatedLesson.images || []) : []

    // Save to database with the pre-generated ID (images are already stored with this ID)
    console.log('[Lesson Generate] Saving lesson with language:', selectedLanguage)
    const savedLesson = await lessonRepository.create({
      id: lessonId,
      organization_id: profile!.organization_id,
      created_by: profile!.id,
      class_id: classId || null,
      document_id: primaryDocumentId ?? null,
      title: generatedLesson.title,
      topic: generatedLesson.title,
      description: `AI-generated lesson: ${generatedLesson.title}`,
      duration_minutes: generatedLesson.duration_minutes || 10,
      content: { text: generatedLesson.content },
      images: lessonImages,
      mini_test: generatedLesson.mini_test,
      learning_objectives: generatedLesson.learning_objectives || [],
      prerequisites: [],
      materials: [],
      language: selectedLanguage,
      grade_level: gradeLevel || null,
      metadata: {
        examples: generatedLesson.examples,
        source_document: primaryDocument?.title ?? 'AI-only (no uploaded document)',
        language: selectedLanguage,
        ai_generated: true,
        original_topic_request: topic.trim(),
        custom_objectives: objectives?.trim() || undefined,
        core_prompt: corePrompt?.trim() || undefined,
        grade_level: gradeLevel || undefined,
        generation_options: {
          includeImages,
          includeAudio,
          centerText,
          includeTables: contentOptions.includeTables,
          includeFigures: contentOptions.includeFigures,
          includeCharts: contentOptions.includeCharts,
          contentLength: contentOptions.contentLength,
        },
      },
    })

    // Generate TTS audio in background if enabled (don't block response)
    if (includeAudio) {
      generateLessonAudioWithUsage(savedLesson.id, generatedLesson.title, originalContent, selectedLanguage)
        .then(async ({ audioUrl, usage }) => {
          if (audioUrl) {
            // Update lesson with audio URL
            await lessonRepository.updateAudioUrl(savedLesson.id, audioUrl)
            console.log(`TTS: Updated lesson ${savedLesson.id} with audio URL`)
          } else {
            console.warn(`TTS: Audio generation returned null for lesson ${savedLesson.id}`)
          }
          await tokenRepository
            .attachMetadataToUsageTransactionByReference(profile!.id, 'lesson_generation', lessonId, {
              tts_prompt_tokens: usage.prompt_tokens,
              tts_completion_tokens: usage.completion_tokens,
              tts_total_tokens: usage.total_tokens,
              tts_generated: Boolean(audioUrl),
              tts_model_used: 'gemini_tts',
            })
            .catch(() => {})
        })
        .catch((err) => {
          console.error('TTS background error:', err)
          if (err instanceof Error) {
            console.error('TTS error details:', err.message, err.stack)
          }
        })
    }

    const savedLang = (savedLesson as { language?: string }).language
    console.log('[Lesson Generate] Saved lesson language from DB:', savedLang)
    // If DB returned wrong language (e.g. column missing or default overwrote), fix it with an update
    if (savedLang !== selectedLanguage) {
      try {
        await lessonRepository.update(savedLesson.id, profile!.id, { language: selectedLanguage })
        console.log('[Lesson Generate] Corrected lesson language in DB to', selectedLanguage)
        ;(savedLesson as { language?: string }).language = selectedLanguage
      } catch (e) {
        console.error('[Lesson Generate] Failed to correct language:', e)
      }
    }

    // Return the saved lesson (include language so client can confirm what was stored)
    return NextResponse.json({
      lesson: {
        id: savedLesson.id,
        title: savedLesson.title,
        topic: savedLesson.topic,
        content: typeof savedLesson.content === 'object' && savedLesson.content && 'text' in savedLesson.content 
          ? (savedLesson.content as { text: string }).text 
          : savedLesson.content,
        images: savedLesson.images,
        mini_test: savedLesson.mini_test,
        examples: generatedLesson.examples,
        learning_objectives: savedLesson.learning_objectives ?? generatedLesson.learning_objectives ?? [],
        audio_url: null, // Will be updated asynchronously
        class_id: savedLesson.class_id,
        document_id: savedLesson.document_id,
        created_at: savedLesson.created_at,
        language: (savedLesson as { language?: string }).language ?? selectedLanguage,
      },
    }, { status: 201 })
  } catch (error: unknown) {
    const cost = (typeof tokenDeduct !== 'undefined' && tokenDeduct?.cost) ? tokenDeduct.cost : 0
    if (cost > 0 && profile) {
      await tokenRepository.addTokens(profile.id, cost, 'refund', undefined, { reason: 'ai_failed' }).catch(() => {})
    }
    console.error('Error generating lesson:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate lesson',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
