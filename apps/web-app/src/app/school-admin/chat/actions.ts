'use server'

import { getAccessToken } from '@/lib/backend-auth'
import { getApiUrl } from '@/lib/portal-urls'
import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'

const getBackendBase = () => getApiUrl()

type Assistant = {
  id: string
  title: string
  document_ids?: string[]
  created_at?: string
  updated_at?: string
}

type Conversation = {
  id: string
  assistant_id: string
  title: string
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

export interface CreateAssistantInput {
  title?: string
  document_ids?: string[]
}

export interface SendMessageInput {
  conversation_id: string
  message: string
  short_answer?: boolean
  document_ids?: string[]
}

export async function getAssistants() {
  const token = await getAccessToken()
  if (!token) return { error: 'Not authenticated' }

  const response = await fetch(`${getApiUrl()}/v1/ai/chat/assistants`, {
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store',
  })
  if (!response.ok) return { error: 'Failed to load assistants' }
  const payload = (await response.json()) as { items?: Assistant[] }
  return { data: payload.items || [] }
}

export async function createAssistant(input: CreateAssistantInput) {
  const token = await getAccessToken()
  if (!token) return { error: 'Not authenticated' }

  const response = await fetch(`${getApiUrl()}/v1/ai/chat/assistants`, {
    method: 'POST',
    headers: {
      ...webAppBackendAuthHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: input.title, documentIds: input.document_ids || [] }),
    cache: 'no-store',
  })
  if (!response.ok) return { error: 'Failed to create assistant' }
  const payload = (await response.json()) as { assistant?: Assistant }
  return { data: payload.assistant }
}

export async function updateAssistant(
  assistantId: string,
  updates: { title?: string; document_ids?: string[] }
) {
  const token = await getAccessToken()
  if (!token) return { error: 'Not authenticated' }

  const response = await fetch(`${getApiUrl()}/v1/ai/chat/assistants/${assistantId}`, {
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
  if (!response.ok) return { error: 'Failed to update assistant' }
  const payload = (await response.json()) as { assistant?: Assistant }
  return { data: payload.assistant }
}

export async function deleteAssistant(assistantId: string) {
  const token = await getAccessToken()
  if (!token) return { error: 'Not authenticated' }

  const response = await fetch(`${getApiUrl()}/v1/ai/chat/assistants/${assistantId}`, {
    method: 'DELETE',
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store',
  })
  if (!response.ok) return { error: 'Failed to delete assistant' }
  return { success: true }
}

export async function getConversations(assistantId: string) {
  const token = await getAccessToken()
  if (!token) return { error: 'Not authenticated' }

  const response = await fetch(
    `${getApiUrl()}/v1/ai/chat/assistants/${assistantId}/conversations`,
    {
      headers: webAppBackendAuthHeaders(token),
      cache: 'no-store',
    }
  )
  if (!response.ok) return { error: 'Failed to load conversations' }
  const payload = (await response.json()) as { items?: Conversation[] }
  return { data: payload.items || [] }
}

export async function createConversation(assistantId: string, title?: string) {
  const token = await getAccessToken()
  if (!token) return { error: 'Not authenticated' }

  const response = await fetch(
    `${getApiUrl()}/v1/ai/chat/assistants/${assistantId}/conversations`,
    {
      method: 'POST',
      headers: {
        ...webAppBackendAuthHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: title || 'New chat' }),
      cache: 'no-store',
    }
  )
  if (!response.ok) return { error: 'Failed to create conversation' }
  const payload = (await response.json()) as { conversation?: Conversation }
  return { data: payload.conversation }
}

export async function getConversation(conversationId: string) {
  const token = await getAccessToken()
  if (!token) return { error: 'Not authenticated' }

  const response = await fetch(`${getApiUrl()}/v1/ai/chat/conversations/${conversationId}`, {
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store',
  })
  if (!response.ok) return { error: 'Conversation not found' }
  const payload = (await response.json()) as {
    conversation?: Conversation
    assistant?: Assistant
    messages?: Message[]
  }
  return {
    data: {
      ...payload.conversation,
      document_ids: payload.assistant?.document_ids,
      messages: payload.messages,
    },
  }
}

export async function deleteConversation(conversationId: string) {
  const token = await getAccessToken()
  if (!token) return { error: 'Not authenticated' }

  const response = await fetch(`${getApiUrl()}/v1/ai/chat/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store',
  })
  if (!response.ok) return { error: 'Failed to delete conversation' }
  return { success: true }
}

export async function sendMessage(input: SendMessageInput) {
  const token = await getAccessToken()
  if (!token) return { error: 'Not authenticated' }

  const response = await fetch(
    `${getApiUrl()}/v1/ai/chat/conversations/${input.conversation_id}/messages`,
    {
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
    }
  )
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
    message?: Message
    followups?: string[]
  }
  if (!response.ok) return { error: payload.error || 'Failed to send message' }
  return {
    data: {
      assistant_message: payload.message,
      suggested_follow_ups: payload.followups || [],
    },
  }
}

export async function getDocuments() {
  const token = await getAccessToken()
  if (!token) return { error: 'Not authenticated' }

  const response = await fetch(`${getApiUrl()}/v1/documents`, {
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store',
  })
  if (!response.ok) return { error: 'Failed to load documents' }
  const payload = (await response.json()) as { items?: DocumentItem[] }
  return { data: payload.items || [] }
}
