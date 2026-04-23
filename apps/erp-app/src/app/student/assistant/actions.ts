'use server'

import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { createChatbot } from '@eduator/ai'

/**
 * Send a message to the student assistant. Context is prepended so the AI can answer about exams, lessons, and today's activity.
 */
export async function sendAssistantMessage(message: string, contextSummary: string): Promise<string> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, metadata')
    .eq('user_id', user.id)
    .single()

  if (!profile) throw new Error('Profile not found')

  const metadata = (profile.metadata as { preferred_language?: string; grade_levels?: string[] } | null) ?? {}
  const language = metadata.preferred_language || 'en'
  const gradeLevel = Array.isArray(metadata.grade_levels) ? metadata.grade_levels[0] : undefined

  const chatbot = createChatbot({
    student_grade_level: gradeLevel || 'general',
    subject: 'general',
    student_preferences: {
      explanation_style: 'simple',
      language,
      reading_level: 'high_school',
    },
  })

  const messageWithContext =
    contextSummary.trim().length > 0
      ? `[Student's current context: ${contextSummary}]\n\nUser question: ${message}`
      : message

  const response = await chatbot.sendMessage(messageWithContext)
  return response.message.content
}
