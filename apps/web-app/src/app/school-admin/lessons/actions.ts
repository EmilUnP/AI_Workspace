'use server'

import { createClient } from '@eduator/auth/supabase/server'

interface UpdateLessonInput {
  title?: string
  topic?: string
  description?: string
  content?: string
  duration_minutes?: number
}

type ProfileRow = { id: string }
type LessonRow = {
  id: string
  created_by: string
  content?: unknown
  title?: string
  language?: string
  start_time?: string | null
  end_time?: string | null
}
type AuthUser = { id: string }

export async function updateLesson(lessonId: string, input: UpdateLessonInput) {
  try {
    const supabase = await createClient()
    const adminSupabase = supabase as any
    
    // Get current user
    const authUser = (await supabase.auth.getUser()).data.user as AuthUser | null
    if (!authUser) {
      return { error: 'Not authenticated' }
    }

    // Get teacher profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authUser.id)
      .single()
    const profile = profileData as ProfileRow | null

    if (!profile) {
      return { error: 'Profile not found' }
    }

    // Verify ownership
    const { data: existingLessonData } = await adminSupabase
      .from('lessons')
      .select('id, created_by')
      .eq('id', lessonId)
      .single()
    const existingLesson = existingLessonData as LessonRow | null

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
    const adminSupabase = supabase as any
    
    // Get current user
    const authUser = (await supabase.auth.getUser()).data.user as AuthUser | null
    if (!authUser) {
      return { error: 'Not authenticated' }
    }

    // Get teacher profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authUser.id)
      .single()
    const profile = profileData as ProfileRow | null

    if (!profile) {
      return { error: 'Profile not found' }
    }

    // Get the lesson
    const { data: lessonData } = await adminSupabase
      .from('lessons')
      .select('id, created_by, content, title, language')
      .eq('id', lessonId)
      .single()
    const lesson = lessonData as LessonRow | null

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

    const { generateLessonAudioWithUsage } = await import('@/lib/eduator-tts-generator-shim')
    let audioUrl: string | null
    try {
      const ttsResult = await generateLessonAudioWithUsage(
        lessonId,
        lesson.title ?? 'Lesson audio',
        contentText,
        lesson.language || 'English'
      )
      audioUrl = ttsResult.audioUrl
    } catch (aiError) {
      throw aiError
    }

    if (!audioUrl) {
      return { error: 'Failed to generate audio' }
    }

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

export async function deleteLesson(lessonId: string) {
  try {
    const supabase = await createClient()
    const adminSupabase = supabase as any
    
    // Get current user
    const authUser = (await supabase.auth.getUser()).data.user as AuthUser | null
    if (!authUser) {
      return { error: 'Not authenticated' }
    }

    // Get teacher profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authUser.id)
      .single()
    const profile = profileData as ProfileRow | null

    if (!profile) {
      return { error: 'Profile not found' }
    }

    // Verify ownership and check if in use
    const { data: existingLessonData } = await adminSupabase
      .from('lessons')
      .select('id, created_by, start_time, end_time')
      .eq('id', lessonId)
      .single()
    const existingLesson = existingLessonData as LessonRow | null

    if (!existingLesson || existingLesson.created_by !== profile.id) {
      return { error: 'Lesson not found or access denied' }
    }

    if (existingLesson.start_time && existingLesson.end_time) {
      return { error: 'This lesson is scheduled on the calendar. Remove the schedule first, then try again.' }
    }

    // Hard delete: remove the lesson from the database
    const { error: dbError } = await adminSupabase
      .from('lessons')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
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
