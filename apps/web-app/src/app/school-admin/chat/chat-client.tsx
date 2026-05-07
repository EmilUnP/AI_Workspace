'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  createConversation,
  deleteConversation,
  getConversation,
  getConversations,
  sendMessage,
} from './actions'

type ChatMessage = {
  id: string
  role: string
  content: string
  created_at?: string
}

type ChatConversation = {
  id: string
  title: string
  created_at?: string
  updated_at?: string
  messages?: ChatMessage[]
}

export function ChatClient() {
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string>('')

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeId) || null,
    [conversations, activeId]
  )

  const loadConversations = async () => {
    setLoading(true)
    setError('')
    const result = await getConversations()
    if (result.error) {
      setError(result.error)
      setConversations([])
      setLoading(false)
      return
    }
    const items = (result.data || []) as ChatConversation[]
    setConversations(items)
    if (!activeId && items[0]?.id) {
      setActiveId(items[0].id)
    }
    setLoading(false)
  }

  const loadConversation = async (id: string) => {
    if (!id) return
    setError('')
    const result = await getConversation(id)
    if (result.error) {
      setError(result.error)
      setMessages([])
      return
    }
    const conv = result.data as ChatConversation | undefined
    setMessages((conv?.messages || []) as ChatMessage[])
  }

  useEffect(() => {
    void loadConversations()
  }, [])

  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    void loadConversation(activeId)
  }, [activeId])

  const handleNewConversation = async () => {
    setError('')
    const result = await createConversation({ title: 'New Conversation' })
    if (result.error || !result.data) {
      setError(result.error || 'Failed to create conversation')
      return
    }
    const created = result.data as ChatConversation
    setConversations((prev) => [created, ...prev])
    setActiveId(created.id)
    setMessages([])
  }

  const handleDeleteConversation = async (id: string) => {
    const result = await deleteConversation(id)
    if (result.error) {
      setError(result.error)
      return
    }
    setConversations((prev) => prev.filter((item) => item.id !== id))
    if (activeId === id) {
      const next = conversations.find((item) => item.id !== id)
      setActiveId(next?.id || '')
      setMessages([])
    }
  }

  const handleSend = async () => {
    const body = text.trim()
    if (!body || !activeId || sending) return
    setSending(true)
    setError('')

    const optimisticUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: body,
    }
    setMessages((prev) => [...prev, optimisticUserMessage])
    setText('')

    const result = await sendMessage({
      conversation_id: activeId,
      message: body,
      short_answer: false,
    })

    if (result.error) {
      setError(result.error)
      setMessages((prev) => prev.filter((item) => item.id !== optimisticUserMessage.id))
      setSending(false)
      return
    }

    const assistant = result.data?.assistant_message as ChatMessage | undefined
    if (assistant) {
      setMessages((prev) => [...prev, assistant])
    }
    setSending(false)
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[300px_1fr]">
      <aside className="rounded-xl border border-gray-200 bg-white p-3 lg:h-[calc(100vh-220px)] lg:overflow-hidden">
        <button
          type="button"
          onClick={handleNewConversation}
          className="mb-3 w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
        >
          New conversation
        </button>
        <div className="space-y-1 lg:max-h-[calc(100vh-290px)] lg:overflow-y-auto pr-1">
          {loading ? (
            <p className="px-2 py-1 text-sm text-gray-500">Loading...</p>
          ) : conversations.length === 0 ? (
            <p className="px-2 py-1 text-sm text-gray-500">No conversations yet.</p>
          ) : (
            conversations.map((conv) => (
              <div key={conv.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveId(conv.id)}
                  className={`flex-1 truncate rounded-md px-2 py-2 text-left text-sm ${
                    activeId === conv.id
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {conv.title || 'Untitled'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteConversation(conv.id)}
                  className="rounded-md px-2 py-2 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Delete conversation"
                >
                  x
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      <section className="rounded-xl border border-gray-200 bg-white lg:h-[calc(100vh-220px)] lg:flex lg:flex-col">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            {activeConversation?.title || 'Chat'}
          </h2>
        </div>

        <div className="space-y-3 overflow-y-auto p-4 lg:flex-1 lg:min-h-0">
          {messages.length === 0 ? (
            <p className="text-sm text-gray-500">
              {activeId ? 'Send a message to start.' : 'Create or select a conversation.'}
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'ml-auto bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {msg.content}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-gray-200 p-3">
          {error ? <p className="mb-2 text-sm text-red-600">{error}</p> : null}
          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={activeId ? 'Type your message...' : 'Create a conversation first'}
              disabled={!activeId || sending}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 disabled:bg-gray-100"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!activeId || sending || !text.trim()}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

