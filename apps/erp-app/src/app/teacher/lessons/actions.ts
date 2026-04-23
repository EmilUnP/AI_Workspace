'use server'

import { createClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { tokenRepository } from '@eduator/db/repositories/tokens'

interface UpdateLessonInput {
  title?: string
  topic?: string
  description?: string
  content?: string
  duration_minutes?: number
  is_published?: boolean
}

export async function updateLesson(lessonId: string, input: UpdateLessonInput) {
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

    // Verify ownership
    const { data: existingLesson } = await adminSupabase
      .from('lessons')
      .select('id, created_by')
      .eq('id', lessonId)
      .single()

    if (!existingLesson || existingLesson.created_by !== profile.id) {
      return { error: 'Lesson not found or access denied' }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    
    if (input.title !== undefined) updateData.title = input.title
    if (input.topic !== undefined) updateData.topic = input.topic
    if (input.description !== undefined) updateData.description = input.description
    if (input.duration_minutes !== undefined) updateData.duration_minutes = input.duration_minutes
    if (input.is_published !== undefined) updateData.is_published = input.is_published
    if (input.content !== undefined) {
      updateData.content = { text: input.content }
    }

    // Update the lesson
    const { data: lesson, error: dbError } = await adminSupabase
      .from('lessons')
      .update(updateData)
      .eq('id', lessonId)
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return { error: 'Failed to update lesson' }
    }

    return { success: true, data: lesson }
  } catch (error) {
    console.error('Update lesson error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function regenerateAudio(lessonId: string) {
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

    // Get the lesson
    const { data: lesson } = await adminSupabase
      .from('lessons')
      .select('id, created_by, content, title, language')
      .eq('id', lessonId)
      .single()

    if (!lesson || lesson.created_by !== profile.id) {
      return { error: 'Lesson not found or access denied' }
    }

    // Extract content text
    const contentText = typeof lesson.content === 'object' && lesson.content && 'text' in lesson.content 
      ? (lesson.content as { text: string }).text 
      : typeof lesson.content === 'string' 
        ? lesson.content 
        : ''

    if (!contentText) {
      return { error: 'No content to generate audio from' }
    }

    const tokenDeduct = await tokenRepository.deductTokensForAction(
      profile.id,
      'lesson_audio',
      {},
      lessonId
    )
    if (!tokenDeduct.success) {
      return { error: tokenDeduct.errorMessage ?? 'Insufficient tokens' }
    }

    const { generateLessonAudioWithUsage } = await import('@eduator/ai/tts-generator')
    let audioUrl: string | null
    let ttsUsage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } = {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    }
    try {
      const ttsResult = await generateLessonAudioWithUsage(
        lessonId,
        lesson.title,
        contentText,
        lesson.language || 'English'
      )
      audioUrl = ttsResult.audioUrl
      ttsUsage = ttsResult.usage
    } catch (aiError) {
      if ((tokenDeduct.cost ?? 0) > 0) {
        await tokenRepository.addTokens(profile.id, tokenDeduct.cost!, 'refund', undefined, { reason: 'ai_failed' }).catch(() => {})
      }
      throw aiError
    }

    if (!audioUrl) {
      if ((tokenDeduct.cost ?? 0) > 0) {
        await tokenRepository.addTokens(profile.id, tokenDeduct.cost!, 'refund', undefined, { reason: 'ai_failed' }).catch(() => {})
      }
      return { error: 'Failed to generate audio' }
    }

    await tokenRepository
      .attachMetadataToUsageTransactionByReference(profile.id, 'lesson_audio', lessonId, {
        input_tokens: ttsUsage.prompt_tokens,
        output_tokens: ttsUsage.completion_tokens,
        prompt_tokens: ttsUsage.prompt_tokens,
        completion_tokens: ttsUsage.completion_tokens,
        total_tokens: ttsUsage.total_tokens,
        model_used: 'gemini_tts',
      })
      .catch(() => {})

    // Update lesson with new audio URL
    const { error: updateError } = await adminSupabase
      .from('lessons')
      .update({ 
        audio_url: audioUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lessonId)

    if (updateError) {
      console.error('Update error:', updateError)
      return { error: 'Failed to save audio URL' }
    }

    return { success: true, audioUrl }
  } catch (error) {
    console.error('Regenerate audio error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function toggleLessonPublished(lessonId: string, isPublished: boolean) {
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

    // Verify ownership
    const { data: existingLesson } = await adminSupabase
      .from('lessons')
      .select('id, created_by')
      .eq('id', lessonId)
      .single()

    if (!existingLesson || existingLesson.created_by !== profile.id) {
      return { error: 'Lesson not found or access denied' }
    }

    // Update published status
    const { data: lesson, error: dbError } = await adminSupabase
      .from('lessons')
      .update({ 
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lessonId)
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return { error: 'Failed to update lesson' }
    }

    return { success: true, data: lesson }
  } catch (error) {
    console.error('Toggle published error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function deleteLesson(lessonId: string) {
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

    // Verify ownership and check if in use
    const { data: existingLesson } = await adminSupabase
      .from('lessons')
      .select('id, created_by, class_id, start_time, end_time')
      .eq('id', lessonId)
      .single()

    if (!existingLesson || existingLesson.created_by !== profile.id) {
      return { error: 'Lesson not found or access denied' }
    }

    if (existingLesson.class_id) {
      return { error: 'This lesson is assigned to a class. Remove it from the class first (Classes → select the class → remove this lesson), then try again.' }
    }
    if (existingLesson.start_time && existingLesson.end_time) {
      return { error: 'This lesson is scheduled on the calendar. Remove the schedule first, then try again.' }
    }

    // Hard delete: remove the lesson from the database
    const { error: dbError } = await adminSupabase
      .from('lessons')
      .delete()
      .eq('id', lessonId)
      .eq('created_by', profile.id)

    if (dbError) {
      console.error('Database error:', dbError)
      return { error: 'Failed to delete lesson' }
    }

    return { success: true }
  } catch (error) {
    console.error('Delete lesson error:', error)
    return { error: 'An unexpected error occurred' }
  }
}
