'use server'

import { createClient } from '@eduator/auth/supabase/server'
import { createTeacherChatbot, type TeacherChatContext } from '@eduator/ai/services/teacher-chatbot'
import { tokenRepository } from '@eduator/db/repositories/tokens'

export interface CreateConversationInput {
  title?: string
  document_ids?: string[]
  class_id?: string | null // Optional: assign to a class for student access
  context?: {
    subject?: string
    grade_level?: string
  }
}

export interface SendMessageInput {
  conversation_id: string
  message: string
  use_rag?: boolean
  /** When true, AI gives short answers; when false, detailed. */
  short_answer?: boolean
}

/**
 * Get all conversations for the current teacher
 */
export async function getConversations() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return { error: 'Profile not found' }
  }

  const { data: conversations, error } = await supabase
    .from('teacher_chat_conversations')
    .select('id, title, document_ids, context, is_active, created_at, updated_at, class_id')
    .eq('teacher_id', profile.id)
    .order('updated_at', { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { data: conversations || [] }
}

/**
 * Get a single conversation with all messages
 */
export async function getConversation(conversationId: string) {
  const supabase = await createClient()
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

  // Get conversation
  const { data: conversation, error: convError } = await supabase
    .from('teacher_chat_conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('teacher_id', profile.id)
    .single()

  if (convError || !conversation) {
    return { error: 'Conversation not found' }
  }

  // Get messages
  const { data: messages, error: msgError } = await supabase
    .from('teacher_chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (msgError) {
    return { error: msgError.message }
  }

  return {
    data: {
      ...conversation,
      messages: messages || [],
    },
  }
}

/**
 * Create a new conversation
 */
export async function createConversation(input: CreateConversationInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return { error: 'Profile not found' }
  }

  const { data: conversation, error } = await supabase
    .from('teacher_chat_conversations')
    .insert({
      teacher_id: profile.id,
      organization_id: profile.organization_id,
      title: input.title || 'New Conversation',
      document_ids: input.document_ids || [],
      class_id: input.class_id || null,
      context: input.context || {},
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  return { data: conversation }
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(input: SendMessageInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return { error: 'Profile not found' }
  }

  // Verify conversation belongs to teacher
  const { data: conversation, error: convError } = await supabase
    .from('teacher_chat_conversations')
    .select('document_ids, context')
    .eq('id', input.conversation_id)
    .eq('teacher_id', profile.id)
    .single()

  if (convError || !conversation) {
    return { error: 'Conversation not found' }
  }

  const tokenDeduct = await tokenRepository.deductTokensForAction(profile.id, 'teacher_chat', {})
  if (!tokenDeduct.success) {
    return { error: tokenDeduct.errorMessage ?? 'Insufficient tokens' }
  }

  // Save user message
  const { data: userMessage, error: userMsgError } = await supabase
    .from('teacher_chat_messages')
    .insert({
      conversation_id: input.conversation_id,
      role: 'user',
      content: input.message,
    })
    .select()
    .single()

  if (userMsgError) {
    return { error: userMsgError.message }
  }

  // Create chatbot context
  const chatContext: TeacherChatContext = {
    subject: conversation.context?.subject,
    grade_level: conversation.context?.grade_level,
    organization_id: profile.organization_id,
    document_ids: conversation.document_ids || [],
    preferences: {
      language: 'en',
      explanation_style: input.short_answer === true ? 'short' : 'detailed',
    },
  }

  // Get AI response
  const chatbot = createTeacherChatbot(chatContext)
  let response
  try {
    response = await chatbot.sendMessage(
      input.message,
      user.id,
      input.use_rag !== false && (conversation.document_ids?.length || 0) > 0
    )
  } catch (aiError) {
    if ((tokenDeduct.cost ?? 0) > 0) {
      await tokenRepository.addTokens(profile.id, tokenDeduct.cost!, 'refund', undefined, { reason: 'ai_failed' }).catch(() => {})
    }
    throw aiError
  }

  // Save assistant message
  const { data: assistantMessage, error: assistantMsgError } = await supabase
    .from('teacher_chat_messages')
    .insert({
      conversation_id: input.conversation_id,
      role: 'assistant',
      content: response.message.content,
      metadata: response.message.metadata,
    })
    .select()
    .single()

  if (assistantMsgError) {
    return { error: assistantMsgError.message }
  }

  const telemetry = (response.message.metadata ?? {}) as Record<string, unknown>
  await tokenRepository
    .attachMetadataToLatestUsageTransaction(profile.id, 'teacher_chat', {
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
    .from('teacher_chat_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', input.conversation_id)

  return {
    data: {
      user_message: userMessage,
      assistant_message: assistantMessage,
      sources: response.sources,
      suggested_follow_ups: response.suggested_follow_ups,
    },
  }
}

/**
 * Update conversation (title, documents, etc.)
 */
export async function updateConversation(
  conversationId: string,
  updates: {
    title?: string
    document_ids?: string[]
    class_id?: string | null // Optional: assign to a class for student access
    context?: Record<string, unknown>
  }
) {
  const supabase = await createClient()
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

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.title !== undefined) updateData.title = updates.title
  if (updates.document_ids !== undefined) updateData.document_ids = updates.document_ids
  if (updates.class_id !== undefined) updateData.class_id = updates.class_id
  if (updates.context !== undefined) updateData.context = updates.context

  const { data: conversation, error } = await supabase
    .from('teacher_chat_conversations')
    .update(updateData)
    .eq('id', conversationId)
    .eq('teacher_id', profile.id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  return { data: conversation }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string) {
  const supabase = await createClient()
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

  const { error } = await supabase
    .from('teacher_chat_conversations')
    .delete()
    .eq('id', conversationId)
    .eq('teacher_id', profile.id)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
