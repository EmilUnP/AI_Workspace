'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  createAssistant,
  createConversation,
  deleteAssistant,
  deleteConversation,
  getAssistants,
  getConversation,
  getConversations,
  getDocuments,
  sendMessage,
  updateAssistant,
} from './actions'

type ChatMessage = {
  id: string
  role: string
  content: string
  created_at?: string
}

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

type DocItem = {
  id: string
  title?: string
  file_name?: string
}

export function ChatClient() {
  const t = useTranslations('teacherChat')
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeAssistantId, setActiveAssistantId] = useState('')
  const [activeConversationId, setActiveConversationId] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [loadingAssistants, setLoadingAssistants] = useState(true)
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [documents, setDocuments] = useState<DocItem[]>([])
  const [newAssistantName, setNewAssistantName] = useState('')
  const [newAssistantDocId, setNewAssistantDocId] = useState('')
  const [coreDocId, setCoreDocId] = useState('')
  const [deleteAssistantId, setDeleteAssistantId] = useState('')
  const [deleteConversationId, setDeleteConversationId] = useState('')
  const [shortAnswer, setShortAnswer] = useState(true)

  const activeAssistant = useMemo(
    () => assistants.find((item) => item.id === activeAssistantId) || null,
    [assistants, activeAssistantId]
  )

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) || null,
    [conversations, activeConversationId]
  )

  const loadAssistants = async () => {
    setLoadingAssistants(true)
    setError('')
    const result = await getAssistants()
    if (result.error) {
      setError(result.error)
      setAssistants([])
      setLoadingAssistants(false)
      return
    }
    const items = (result.data || []) as Assistant[]
    setAssistants(items)
    if (!activeAssistantId && items[0]?.id) {
      setActiveAssistantId(items[0].id)
    }
    setLoadingAssistants(false)
  }

  const loadConversations = async (assistantId: string) => {
    if (!assistantId) {
      setConversations([])
      setActiveConversationId('')
      return
    }
    setLoadingConversations(true)
    setError('')
    const result = await getConversations(assistantId)
    if (result.error) {
      setError(result.error)
      setConversations([])
      setActiveConversationId('')
      setLoadingConversations(false)
      return
    }
    const items = (result.data || []) as Conversation[]
    setConversations(items)
    setActiveConversationId((prev) => {
      if (prev && items.some((c) => c.id === prev)) return prev
      return items[0]?.id || ''
    })
    setLoadingConversations(false)
  }

  const loadDocuments = async () => {
    const result = await getDocuments()
    if (result.error) return
    setDocuments((result.data || []) as DocItem[])
  }

  const loadMessages = async (conversationId: string) => {
    if (!conversationId) {
      setMessages([])
      return
    }
    setError('')
    const result = await getConversation(conversationId)
    if (result.error) {
      setError(result.error)
      setMessages([])
      return
    }
    const data = result.data as { messages?: ChatMessage[]; document_ids?: string[] } | undefined
    setMessages((data?.messages || []) as ChatMessage[])
    if (data?.document_ids?.length) {
      setCoreDocId(String(data.document_ids[0] || ''))
    }
  }

  useEffect(() => {
    void loadAssistants()
    void loadDocuments()
  }, [])

  useEffect(() => {
    if (!activeAssistantId) {
      setConversations([])
      setActiveConversationId('')
      return
    }
    const docIds = activeAssistant?.document_ids
    setCoreDocId(Array.isArray(docIds) ? String(docIds[0] || '') : '')
    void loadConversations(activeAssistantId)
  }, [activeAssistantId])

  useEffect(() => {
    void loadMessages(activeConversationId)
  }, [activeConversationId])

  const handleCreateAssistant = async () => {
    setError('')
    const title = newAssistantName.trim() || t('newAssistantDefault')
    const docIds = newAssistantDocId ? [newAssistantDocId] : []
    const result = await createAssistant({ title, document_ids: docIds })
    if (result.error || !result.data) {
      setError(result.error || t('createAssistantFailed'))
      return
    }
    const created = result.data as Assistant
    setAssistants((prev) => [created, ...prev])
    setActiveAssistantId(created.id)
    setNewAssistantName('')
    setNewAssistantDocId('')
    setCoreDocId(docIds[0] || '')
    setConversations([])
    setActiveConversationId('')
    setMessages([])
  }

  const handleNewChat = async () => {
    if (!activeAssistantId) return
    setError('')
    const result = await createConversation(activeAssistantId)
    if (result.error || !result.data) {
      setError(result.error || t('createConversationFailed'))
      return
    }
    const created = result.data as Conversation
    setConversations((prev) => [created, ...prev])
    setActiveConversationId(created.id)
    setMessages([])
  }

  const handleDeleteAssistant = async (id: string) => {
    const result = await deleteAssistant(id)
    if (result.error) {
      setError(result.error)
      return
    }
    setAssistants((prev) => prev.filter((item) => item.id !== id))
    if (activeAssistantId === id) {
      const next = assistants.find((item) => item.id !== id)
      setActiveAssistantId(next?.id || '')
    }
    setDeleteAssistantId('')
  }

  const handleDeleteConversation = async (id: string) => {
    const result = await deleteConversation(id)
    if (result.error) {
      setError(result.error)
      return
    }
    setConversations((prev) => prev.filter((item) => item.id !== id))
    if (activeConversationId === id) {
      const next = conversations.find((item) => item.id !== id)
      setActiveConversationId(next?.id || '')
    }
    setDeleteConversationId('')
  }

  const handleSaveCoreFile = async () => {
    if (!activeAssistantId) return
    const result = await updateAssistant(activeAssistantId, {
      document_ids: coreDocId ? [coreDocId] : [],
    })
    if (result.error) {
      setError(result.error)
      return
    }
    const updated = result.data as Assistant
    setAssistants((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
  }

  const handleSend = async () => {
    const body = text.trim()
    if (!body || !activeConversationId || sending) return
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
      conversation_id: activeConversationId,
      message: body,
      short_answer: shortAnswer,
      document_ids: coreDocId ? [coreDocId] : [],
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
    <div className="grid gap-3 lg:grid-cols-[260px_220px_1fr]">
      <aside className="rounded-xl border border-gray-200 bg-white p-3 lg:h-[calc(100vh-220px)] lg:overflow-hidden">
        <div className="mb-3 space-y-2 rounded-lg border border-gray-200 p-2">
          <p className="text-xs font-medium text-gray-500">{t('createAssistantSection')}</p>
          <input
            value={newAssistantName}
            onChange={(e) => setNewAssistantName(e.target.value)}
            placeholder={t('botNamePlaceholder')}
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-gray-400"
          />
          <select
            value={newAssistantDocId}
            onChange={(e) => setNewAssistantDocId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-gray-400"
          >
            <option value="">{t('coreFileOptional')}</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.title || doc.file_name || t('untitled')}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleCreateAssistant}
            className="w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
          >
            {t('createBot')}
          </button>
        </div>
        <p className="mb-1 px-1 text-xs font-medium uppercase tracking-wide text-gray-500">
          {t('assistantsLabel')}
        </p>
        <div className="space-y-1 lg:max-h-[calc(100vh-360px)] lg:overflow-y-auto pr-1">
          {loadingAssistants ? (
            <p className="px-2 py-1 text-sm text-gray-500">{t('loading')}</p>
          ) : assistants.length === 0 ? (
            <p className="px-2 py-1 text-sm text-gray-500">{t('noAssistantsYet')}</p>
          ) : (
            assistants.map((assistant) => (
              <div key={assistant.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveAssistantId(assistant.id)}
                  className={`flex-1 truncate rounded-md px-2 py-2 text-left text-sm ${
                    activeAssistantId === assistant.id
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {assistant.title || t('untitled')}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteAssistantId(assistant.id)}
                  className="rounded-md px-2 py-2 text-xs text-gray-500 hover:bg-gray-100"
                  aria-label={t('deleteAssistant')}
                >
                  x
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      <aside className="rounded-xl border border-gray-200 bg-white p-3 lg:h-[calc(100vh-220px)] lg:flex lg:flex-col">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('chatsLabel')}</p>
          <button
            type="button"
            onClick={handleNewChat}
            disabled={!activeAssistantId}
            className="rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white hover:bg-black disabled:opacity-50"
          >
            {t('newChat')}
          </button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto pr-1">
          {!activeAssistantId ? (
            <p className="text-sm text-gray-500">{t('selectAssistantFirst')}</p>
          ) : loadingConversations ? (
            <p className="text-sm text-gray-500">{t('loading')}</p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-gray-500">{t('noChatsYet')}</p>
          ) : (
            conversations.map((conv) => (
              <div key={conv.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`flex-1 truncate rounded-md px-2 py-2 text-left text-sm ${
                    activeConversationId === conv.id
                      ? 'bg-violet-100 text-violet-950'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {conv.title || t('untitled')}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConversationId(conv.id)}
                  className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                  aria-label={t('deleteConversation')}
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
              {activeAssistant?.title || t('chatTitleFallback')}
            </h2>
            {activeConversation && (
              <span className="text-xs text-gray-500">· {activeConversation.title}</span>
            )}
            {activeAssistantId && (
              <>
                <select
                  value={coreDocId}
                  onChange={(e) => setCoreDocId(e.target.value)}
                  className="min-w-[200px] rounded-md border border-gray-300 px-2 py-1 text-xs outline-none focus:border-gray-400"
                >
                  <option value="">{t('noCoreFile')}</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title || doc.file_name || t('untitled')}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleSaveCoreFile}
                  className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                >
                  {t('saveCoreFile')}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3 overflow-y-auto p-4 lg:flex-1 lg:min-h-0">
          {!activeConversationId ? (
            <p className="text-sm text-gray-500">
              {activeAssistantId ? t('startNewChatHint') : t('createOrSelectAssistant')}
            </p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-gray-500">{t('sendMessageToStart')}</p>
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
          <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={shortAnswer}
              onChange={(e) => setShortAnswer(e.target.checked)}
              disabled={!activeConversationId || sending}
              className="rounded border-gray-300 text-gray-900 focus:ring-gray-400"
            />
            {t('shortAnswer')}
          </label>
          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                activeConversationId ? t('typeMessage') : t('createConversationFirst')
              }
              disabled={!activeConversationId || sending}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 disabled:bg-gray-100"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!activeConversationId || sending || !text.trim()}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
            >
              {sending ? t('sending') : t('send')}
            </button>
          </div>
        </div>
      </section>

      {deleteAssistantId ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">{t('deleteBotTitle')}</h3>
            <p className="mt-2 text-sm text-gray-600">{t('deleteBotConfirm')}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteAssistantId('')}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAssistant(deleteAssistantId)}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-black"
              >
                {t('yesDelete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteConversationId ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">{t('deleteChatTitle')}</h3>
            <p className="mt-2 text-sm text-gray-600">{t('deleteChatConfirm')}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConversationId('')}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteConversation(deleteConversationId)}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-black"
              >
                {t('yesDelete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
