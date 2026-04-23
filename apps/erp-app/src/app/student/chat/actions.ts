'use server'

import { createClient } from '@eduator/auth/supabase/server'
import { createTeacherChatbot } from '@eduator/ai/services/teacher-chatbot'
import { revalidatePath } from 'next/cache'
import { tokenRepository } from '@eduator/db/repositories/tokens'

export interface Conversation {
  id: string
  title: string | null
  document_ids: string[]
  context: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
  class_id: string | null
  class_name?: string | null
}

export interface ChatMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  metadata?: Record<string, unknown>
}

/**
 * Get all student-specific conversations for classes the student is enrolled in.
 * Each student gets their OWN conversation (in chat_conversations) per teacher tutor session.
 */
export async function getConversations() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Get student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('user_id', user.id)
      .eq('profile_type', 'student')
      .single()

    if (!profile) {
      return { error: 'Student profile not found' }
    }

    // Get enrolled classes
    const { data: enrollments } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('student_id', profile.id)
      .eq('status', 'active')

    if (!enrollments || enrollments.length === 0) {
      return { data: [] }
    }

    const classIds = enrollments.map((e: { class_id: string }) => e.class_id)

    // Get teacher tutor sessions assigned to these classes
    const { data: teacherConvs, error } = await supabase
      .from('teacher_chat_conversations')
      .select(`
        id,
        title,
        document_ids,
        context,
        is_active,
        created_at,
        updated_at,
        class_id,
        organization_id,
        teacher_id,
        classes(name)
      `)
      .in('class_id', classIds)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      return { error: 'Failed to fetch conversations' }
    }

    const result: Conversation[] = []

    for (const conv of (teacherConvs || []) as {
      id: string
      title: string | null
      document_ids?: string[]
      context?: unknown
      is_active: boolean
      created_at: string
      updated_at: string
      class_id: string | null
      organization_id?: string | null
      teacher_id?: string | null
      classes?: { name?: string | null } | { name?: string | null }[] | null
    }[]) {
      // For each teacher conversation, ensure a per-student chat_conversation exists
      const { data: existingStudentConvs, error: existingError } = await supabase
        .from('chat_conversations')
        .select('id, title, context, is_active, created_at, updated_at, class_id')
        .eq('student_id', profile.id)
        .eq('class_id', conv.class_id)
        .eq('context->>teacher_conversation_id', String(conv.id))

      if (existingError) {
        console.error('Error checking student chat_conversations:', existingError)
        continue
      }

      let studentConv = existingStudentConvs?.[0] as
        | {
            id: string
            title: string | null
            context: unknown
            is_active: boolean
            created_at: string
            updated_at: string
            class_id: string | null
          }
        | undefined

      if (!studentConv) {
        const { data: inserted, error: insertError } = await supabase
          .from('chat_conversations')
          .insert({
            student_id: profile.id,
            class_id: conv.class_id,
            title: conv.title,
            is_active: true,
            context: {
              ...((conv.context as Record<string, unknown> | null) || {}),
              teacher_conversation_id: conv.id,
              teacher_id: conv.teacher_id,
              organization_id: conv.organization_id || profile.organization_id,
              document_ids: conv.document_ids || [],
            } as Record<string, unknown>,
          })
          .select('id, title, context, is_active, created_at, updated_at, class_id')
          .single()

        if (insertError || !inserted) {
          console.error('Error creating student chat_conversation:', insertError)
          continue
        }

        studentConv = inserted
      }

      const ctx = (studentConv.context || {}) as Record<string, unknown>
      const classObj = Array.isArray(conv.classes) ? conv.classes[0] : conv.classes

      result.push({
        id: studentConv.id,
        title: studentConv.title,
        document_ids:
          (Array.isArray(ctx.document_ids) ? (ctx.document_ids as string[]) : undefined) ||
          conv.document_ids ||
          [],
        context: ctx,
        is_active: studentConv.is_active,
        created_at: studentConv.created_at,
        updated_at: studentConv.updated_at,
        class_id: studentConv.class_id,
        class_name: classObj?.name ?? null,
      })
    }

    return { data: result }
  } catch (error) {
    console.error('Error in getConversations:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Get a specific conversation with messages (student-private).
 */
export async function getConversation(conversationId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Get student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('profile_type', 'student')
      .single()

    if (!profile) {
      return { error: 'Student profile not found' }
    }

    // Load student-specific conversation
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select(`
        id,
        title,
        context,
        class_id,
        created_at,
        updated_at,
        classes(name)
      `)
      .eq('id', conversationId)
      .eq('student_id', profile.id)
      .single()

    if (convError || !conversation) {
      return { error: 'Conversation not found or access denied' }
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return { error: 'Failed to fetch messages' }
    }

    type ConversationContext = Record<string, unknown> & { document_ids?: string[] }
    const ctx = (conversation.context || {}) as ConversationContext

    return {
      data: {
        conversation: {
          id: conversation.id,
          title: conversation.title,
          document_ids: (ctx.document_ids as string[] | undefined) || [],
          context: ctx,
          class_id: conversation.class_id,
          class_name: (conversation.classes && Array.isArray(conversation.classes) && conversation.classes[0]?.name) || null,
        },
        messages: (messages || []).map((msg: { id: string; conversation_id: string; role: string; content: string; created_at: string; metadata?: unknown }) => ({
          id: msg.id,
          conversation_id: msg.conversation_id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.created_at,
          metadata: msg.metadata || {},
        })),
      },
    }
  } catch (error) {
    console.error('Error in getConversation:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export interface SendMessageInput {
  conversation_id: string
  message: string
  use_rag?: boolean
  short_answer?: boolean
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(input: SendMessageInput) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Get student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('user_id', user.id)
      .eq('profile_type', 'student')
      .single()

    if (!profile) {
      return { error: 'Student profile not found' }
    }

    // Verify access to student conversation
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('id, context, class_id')
      .eq('id', input.conversation_id)
      .eq('student_id', profile.id)
      .single()

    if (convError || !conversation) {
      return { error: 'Conversation not found or access denied' }
    }

    const tokenDeduct = await tokenRepository.deductTokensForAction(profile.id, 'student_chat', {})
    if (!tokenDeduct.success) {
      return { error: tokenDeduct.errorMessage ?? 'Insufficient tokens' }
    }

    const ctx = (conversation.context || {}) as Record<string, unknown>
    const documentIds: string[] =
      (Array.isArray(ctx.document_ids) ? (ctx.document_ids as string[]) : undefined) || []
    const organizationId: string =
      (typeof ctx.organization_id === 'string' ? (ctx.organization_id as string) : undefined) ||
      profile.organization_id

    // Save user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: input.conversation_id,
        role: 'user',
        content: input.message,
      })
      .select()
      .single()

    if (userMsgError) {
      console.error('Error saving user message:', userMsgError)
      return { error: 'Failed to save message' }
    }

    // Get chatbot service
    const chatbot = createTeacherChatbot({
      document_ids: documentIds,
      organization_id: organizationId,
      preferences: {
        explanation_style: input.short_answer === true ? 'short' : 'detailed',
      },
    })

    let response
    try {
      response = await chatbot.sendMessage(
        input.message,
        profile.id,
        input.use_rag !== false // Default to true
      )
    } catch (aiError) {
      if ((tokenDeduct.cost ?? 0) > 0) {
        await tokenRepository.addTokens(profile.id, tokenDeduct.cost!, 'refund', undefined, { reason: 'ai_failed' }).catch(() => {})
      }
      throw aiError
    }

    // Save assistant message
    const { data: assistantMessage, error: assistantMsgError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: input.conversation_id,
        role: 'assistant',
        content: response.message.content,
        metadata: response.message.metadata || {},
      })
      .select()
      .single()

    if (assistantMsgError) {
      console.error('Error saving assistant message:', assistantMsgError)
      return { error: 'Failed to save response' }
    }

    const telemetry = (response.message.metadata ?? {}) as Record<string, unknown>
    await tokenRepository
      .attachMetadataToLatestUsageTransaction(profile.id, 'student_chat', {
        input_tokens: telemetry.input_tokens,
        output_tokens: telemetry.output_tokens,
        prompt_tokens: telemetry.prompt_tokens,
        completion_tokens: telemetry.completion_tokens,
        total_tokens: telemetry.total_tokens ?? telemetry.tokens_used,
        model_used: telemetry.model_used,
      })
      .catch(() => {})

    // Update conversation timestamp
    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', input.conversation_id)

    revalidatePath('/student/chat')

    return {
      data: {
        user_message: {
          id: userMessage.id,
          conversation_id: userMessage.conversation_id,
          role: userMessage.role,
          content: userMessage.content,
          timestamp: userMessage.created_at,
        },
        assistant_message: {
          id: assistantMessage.id,
          conversation_id: assistantMessage.conversation_id,
          role: assistantMessage.role,
          content: assistantMessage.content,
          timestamp: assistantMessage.created_at,
          metadata: assistantMessage.metadata,
        },
        sources: response.sources,
        suggested_follow_ups: response.suggested_follow_ups,
      },
    }
  } catch (error) {
    console.error('Error in sendMessage:', error)
    return { error: 'An unexpected error occurred' }
  }
}

/**
 * Student-safe stubs for mutation actions.
 * These are defined as server actions so they can be passed to Client Components,
 * but they always return an error since students are not allowed to mutate tutor sessions.
 */
export async function createConversation(_: {
  title?: string
  document_ids?: string[]
  context?: Record<string, unknown>
}) {
  return { error: 'Students cannot create tutor sessions' }
}

export async function updateConversation(_: string, __: unknown) {
  return { error: 'Students cannot update tutor sessions' }
}

export async function deleteConversation(_: string) {
  return { success: false, error: 'Students cannot delete tutor sessions' }
}
