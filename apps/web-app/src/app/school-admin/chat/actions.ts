'use server'

import { getAccessToken } from '@/lib/backend-auth'
import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'

const getBackendBase = () => process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'

type Conversation = {
  id: string
  title: string
  document_ids?: string[]
  created_at?: string
  updated_at?: string
}

type Message = {
  id: string
  role: string
  content: string
  created_at?: string
}

type DocumentItem = {
  id: string
  title?: string
  file_name?: string
}

export interface CreateConversationInput {
  title?: string
  document_ids?: string[]
}

export interface SendMessageInput {
  conversation_id: string
  message: string
  short_answer?: boolean
  document_ids?: string[]
}

export async function getConversations() {
  const token = await getAccessToken()
  if (!token) {
    return { error: 'Not authenticated' }
  }

  const response = await fetch(`${getBackendBase()}/v1/ai/chat/conversations`, {
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store',
  })
  if (!response.ok) {
    return { error: 'Failed to load conversations' }
  }
  const payload = (await response.json()) as { items?: Conversation[] }
  return { data: payload.items || [] }
}

export async function getConversation(conversationId: string) {
  const token = await getAccessToken()
  if (!token) {
    return { error: 'Not authenticated' }
  }
  const response = await fetch(`${getBackendBase()}/v1/ai/chat/conversations/${conversationId}`, {
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store',
  })
  if (!response.ok) {
    return { error: 'Conversation not found' }
  }
  const payload = (await response.json()) as { conversation?: Conversation & { messages?: Message[] } }
  return { data: payload.conversation }
}

export async function createConversation(input: CreateConversationInput) {
  const token = await getAccessToken()
  if (!token) {
    return { error: 'Not authenticated' }
  }
  const response = await fetch(`${getBackendBase()}/v1/ai/chat/conversations`, {
    method: 'POST',
    headers: {
      ...webAppBackendAuthHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: input.title, documentIds: input.document_ids || [] }),
    cache: 'no-store',
  })
  if (!response.ok) {
    return { error: 'Failed to create conversation' }
  }
  const payload = (await response.json()) as { conversation?: Conversation }
  return { data: payload.conversation }
}

export async function sendMessage(input: SendMessageInput) {
  const token = await getAccessToken()
  if (!token) {
    return { error: 'Not authenticated' }
  }
  const response = await fetch(`${getBackendBase()}/v1/ai/chat/conversations/${input.conversation_id}/messages`, {
    method: 'POST',
    headers: {
      ...webAppBackendAuthHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: input.message,
      shortAnswer: Boolean(input.short_answer),
      documentIds: input.document_ids || [],
    }),
    cache: 'no-store',
  })
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
    message?: Message
    followups?: string[]
  }
  if (!response.ok) {
    return { error: payload.error || 'Failed to send message' }
  }
  return {
    data: {
      assistant_message: payload.message,
      suggested_follow_ups: payload.followups || [],
    },
  }
}

export async function updateConversation(
  conversationId: string,
  updates: {
    title?: string
    document_ids?: string[]
    context?: Record<string, unknown>
  }
) {
  const token = await getAccessToken()
  if (!token) return { error: 'Not authenticated' }

  const response = await fetch(`${getBackendBase()}/v1/ai/chat/conversations/${conversationId}`, {
    method: 'PATCH',
    headers: {
      ...webAppBackendAuthHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: updates.title,
      documentIds: updates.document_ids,
    }),
    cache: 'no-store',
  })
  if (!response.ok) return { error: 'Failed to update conversation' }
  const payload = (await response.json()) as { conversation?: Conversation }
  return { data: payload.conversation }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string) {
  const token = await getAccessToken()
  if (!token) {
    return { error: 'Not authenticated' }
  }
  const response = await fetch(`${getBackendBase()}/v1/ai/chat/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store',
  })
  if (!response.ok) {
    return { error: 'Failed to delete conversation' }
  }
  return { success: true }
}

export async function getDocuments() {
  const token = await getAccessToken()
  if (!token) return { error: 'Not authenticated' }

  const response = await fetch(`${getBackendBase()}/v1/documents`, {
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store',
  })
  if (!response.ok) return { error: 'Failed to load documents' }
  const payload = (await response.json()) as { items?: DocumentItem[] }
  return { data: payload.items || [] }
}

