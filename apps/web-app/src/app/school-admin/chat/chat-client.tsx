'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  createConversation,
  deleteConversation,
  getDocuments,
  getConversation,
  getConversations,
  sendMessage,
  updateConversation,
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
  document_ids?: string[]
  created_at?: string
  updated_at?: string
  messages?: ChatMessage[]
}

type DocItem = {
  id: string
  title?: string
  file_name?: string
}

export function ChatClient() {
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string>('')
  const [documents, setDocuments] = useState<DocItem[]>([])
  const [newBotName, setNewBotName] = useState('')
  const [newBotDocId, setNewBotDocId] = useState('')
  const [deleteTargetId, setDeleteTargetId] = useState('')
  const [selectedDocByConversation, setSelectedDocByConversation] = useState<Record<string, string>>({})

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
    setSelectedDocByConversation(
      items.reduce<Record<string, string>>((acc, conv) => {
        acc[conv.id] = Array.isArray(conv.document_ids) ? String(conv.document_ids[0] || '') : ''
        return acc
      }, {})
    )
    if (!activeId && items[0]?.id) {
      setActiveId(items[0].id)
    }
    setLoading(false)
  }

  const loadDocuments = async () => {
    const result = await getDocuments()
    if (result.error) return
    setDocuments((result.data || []) as DocItem[])
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
    void loadDocuments()
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
    const title = newBotName.trim() || 'New Conversation'
    const docIds = newBotDocId ? [newBotDocId] : []
    const result = await createConversation({ title, document_ids: docIds })
    if (result.error || !result.data) {
      setError(result.error || 'Failed to create conversation')
      return
    }
    const created = result.data as ChatConversation
    setConversations((prev) => [created, ...prev])
    setActiveId(created.id)
    setMessages([])
    setNewBotName('')
    setNewBotDocId('')
    setSelectedDocByConversation((prev) => ({ ...prev, [created.id]: docIds[0] || '' }))
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
    setDeleteTargetId('')
  }

  const handleSaveCoreFile = async () => {
    if (!activeId) return
    const docId = selectedDocByConversation[activeId] || ''
    const result = await updateConversation(activeId, {
      document_ids: docId ? [docId] : [],
    })
    if (result.error) setError(result.error)
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
      short_answer: true,
      document_ids: selectedDocByConversation[activeId] ? [selectedDocByConversation[activeId]] : [],
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
        <div className="mb-3 space-y-2 rounded-lg border border-gray-200 p-2">
          <input
            value={newBotName}
            onChange={(e) => setNewBotName(e.target.value)}
            placeholder="Bot name"
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-gray-400"
          />
          <select
            value={newBotDocId}
            onChange={(e) => setNewBotDocId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-gray-400"
          >
            <option value="">Core file (optional)</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.title || doc.file_name || 'Untitled'}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleNewConversation}
            className="w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
          >
            Create bot
          </button>
        </div>
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
                  onClick={() => setDeleteTargetId(conv.id)}
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
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">
              {activeConversation?.title || 'Chat'}
            </h2>
            {activeId && (
              <>
                <select
                  value={selectedDocByConversation[activeId] || ''}
                  onChange={(e) =>
                    setSelectedDocByConversation((prev) => ({
                      ...prev,
                      [activeId]: e.target.value,
                    }))
                  }
                  className="min-w-[220px] rounded-md border border-gray-300 px-2 py-1 text-xs outline-none focus:border-gray-400"
                >
                  <option value="">No core file</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title || doc.file_name || 'Untitled'}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleSaveCoreFile}
                  className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                >
                  Save core file
                </button>
              </>
            )}
          </div>
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

      {deleteTargetId ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">Delete bot</h3>
            <p className="mt-2 text-sm text-gray-600">Are you sure you want to delete this chatbot?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId('')}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteConversation(deleteTargetId)}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-black"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

