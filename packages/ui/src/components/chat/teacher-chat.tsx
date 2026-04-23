'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { Bot, MessageSquare, Plus, Trash2, FileText, Sparkles, Send, Loader2, BookOpen } from 'lucide-react'
import { RichTextWithMath } from '../math/rich-text-with-math'

export interface ChatMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  metadata?: {
    tokens_used?: number
    model_used?: string
    response_time_ms?: number
    sources?: Array<{
      type: string
      title: string
      url?: string
      snippet?: string
    }>
  }
}

// Chat actions are passed in as individual props to avoid
// nesting server actions inside an object prop (which Next.js cannot serialize).

interface Conversation {
  id: string
  title: string | null
  document_ids: string[]
  context: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
  class_id?: string | null
  class_name?: string | null
}

interface Document {
  id: string
  title: string
  file_type: string
}

export interface AITutorLabels {
  createNewSession?: string
  newSessionDialogTitle?: string
  newSessionDialogDescription?: string
  sessionTitleLabel?: string
  sessionTitlePlaceholder?: string
  selectDocumentsOptional?: string
  selectedDocsRagHint?: string
  cancel?: string
  creating?: string
  createTutorSession?: string
  newSession?: string
  loading?: string
  noSessionsStudent?: string
  startNewSession?: string
  untitledConversation?: string
  deleteSessionAria?: string
  documentsCount?: string // "{count} document(s)" - use placeholder
  untitled?: string
  eduBot?: string
  askQuestionToStart?: string
  sources?: string
  documentsLabel?: string
  uploadDocumentsLink?: string
  uploadDocumentsHint?: string
  useDocumentsForContext?: string
  selectAbove?: string
  shortAnswers?: string
  shortAnswersHint?: string
  inputPlaceholder?: string
  inputPlaceholderStudent?: string
  sendMessageAria?: string
  aiGeneratedDisclaimer?: string
  selectSession?: string
  noSessionSelected?: string
  chooseSessionStudent?: string
  createOrSelectSession?: string
  deleteConfirm?: string
  deleteSuccess?: string
  failedToSend?: string
  newConversation?: string
}

interface AITutorProps {
  documents?: Document[]
  documentsPath?: string
  isStudent?: boolean // If true, hide create/delete buttons and show class names
  labels?: AITutorLabels
  getConversations: () => Promise<{ data?: any[]; error?: string }>
  getConversation: (id: string) => Promise<{ data?: any; error?: string }>
  createConversation: (input: { title?: string; document_ids?: string[]; context?: any }) => Promise<{ data?: any; error?: string }>
  sendMessage: (input: { conversation_id: string; message: string; use_rag?: boolean; short_answer?: boolean }) => Promise<{ data?: any; error?: string }>
  updateConversation: (id: string, updates: any) => Promise<{ data?: any; error?: string }>
  deleteConversation: (id: string) => Promise<{ success?: boolean; error?: string }>
}

const DEFAULT_AITUTOR_LABELS: AITutorLabels = {
  createNewSession: 'Create New Tutor Session',
  newSessionDialogTitle: 'Create New Tutor Session',
  newSessionDialogDescription: 'Give your tutor session a name to help you organize your learning conversations',
  sessionTitleLabel: 'Tutor Session Title *',
  sessionTitlePlaceholder: 'e.g., Math Lesson Planning, Exam Questions Help, Science Curriculum...',
  selectDocumentsOptional: 'Select Documents (Optional)',
  selectedDocsRagHint: 'Selected documents will be used for RAG (context-aware responses)',
  cancel: 'Cancel',
  creating: 'Creating...',
  createTutorSession: 'Create Tutor Session',
  newSession: 'New session',
  loading: 'Loading...',
  noSessionsStudent: 'No tutor sessions from your classes yet.',
  startNewSession: 'Start a new session to begin.',
  untitledConversation: 'Untitled Conversation',
  deleteSessionAria: 'Delete tutor session',
  documentsCount: '{count} document(s)',
  untitled: 'Untitled',
  eduBot: 'EduBot',
  askQuestionToStart: 'Ask a question below to start.',
  sources: 'Sources',
  documentsLabel: 'Documents:',
  uploadDocumentsLink: 'Upload documents',
  uploadDocumentsHint: 'to use them for context.',
  useDocumentsForContext: 'Use documents for context',
  selectAbove: '(select above)',
  shortAnswers: 'Short answers',
  shortAnswersHint: '(clear = detailed)',
  inputPlaceholder: 'Ask about lesson planning, exams, teaching strategies...',
  inputPlaceholderStudent: 'Ask a question...',
  sendMessageAria: 'Send message',
  aiGeneratedDisclaimer: 'AI-generated. Verify important information.',
  selectSession: 'Select a session',
  noSessionSelected: 'No session selected',
  chooseSessionStudent: 'Choose a tutor session from the list to start.',
  createOrSelectSession: 'Create a new session or select one from the list.',
  deleteConfirm: 'Are you sure you want to delete this conversation?',
  deleteSuccess: 'Conversation deleted.',
  failedToSend: 'Failed to send message',
  newConversation: 'New Conversation',
}

export function AITutor({
  documents = [],
  documentsPath = '/teacher/documents',
  isStudent = false,
  labels = {},
  getConversations,
  getConversation,
  createConversation,
  sendMessage,
  updateConversation,
  deleteConversation,
}: AITutorProps) {
  const L = { ...DEFAULT_AITUTOR_LABELS, ...labels }
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [useRAG, setUseRAG] = useState(true)
  const [shortAnswer, setShortAnswer] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false)
  const [newConversationTitle, setNewConversationTitle] = useState('')
  const [newConversationDocs, setNewConversationDocs] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [, startTransition] = useTransition()

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id)
      setSelectedDocuments(currentConversation.document_ids || [])
    } else {
      setMessages([])
      setSelectedDocuments([])
    }
  }, [currentConversation])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversations = async () => {
    setIsLoadingConversations(true)
    const result = await getConversations()
    if (result.data) {
      setConversations(result.data)
      // Auto-select first conversation if available
      if (result.data.length > 0 && !currentConversation) {
        setCurrentConversation(result.data[0])
      }
    }
    setIsLoadingConversations(false)
  }

  const loadMessages = async (conversationId: string) => {
    const result = await getConversation(conversationId)
    if (result.data) {
      setMessages(result.data.messages || [])
    }
  }

  const handleNewConversation = async () => {
    if (isStudent) return // Students can't create conversations
    
    // Open dialog for teachers to set title
    setNewConversationTitle('')
    setNewConversationDocs(selectedDocuments)
    setShowNewConversationDialog(true)
  }

  const handleCreateConversation = async () => {
    if (!newConversationTitle.trim()) {
      return // Title is required
    }

    const result = await createConversation({
      title: newConversationTitle.trim(),
      document_ids: newConversationDocs,
    })
    
    if (result.data) {
      setShowNewConversationDialog(false)
      setNewConversationTitle('')
      setNewConversationDocs([])
      await loadConversations()
      setCurrentConversation(result.data)
      setSelectedDocuments(newConversationDocs)
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    if (!currentConversation) {
      // Create new conversation first
      const convResult = await createConversation({
        title: input.substring(0, 50) || (L.newConversation ?? 'New Conversation'),
        document_ids: selectedDocuments,
      })
      if (!convResult.data) return
      setCurrentConversation(convResult.data)
      await loadConversations()
    }

    const messageText = input.trim()
    setInput('')
    setIsLoading(true)

    // Add user message optimistically
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: currentConversation!.id,
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMessage])

    startTransition(async () => {
      const result = await sendMessage({
        conversation_id: currentConversation!.id,
        message: messageText,
        use_rag: useRAG && selectedDocuments.length > 0,
        short_answer: shortAnswer,
      })

      if (result.data) {
        // Replace temp message with real ones
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== tempUserMessage.id)
          return [...filtered, result.data!.user_message, result.data!.assistant_message]
        })
        await loadConversations() // Refresh to update timestamp
      } else {
        // Remove temp message on error
        setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id))
        alert(result.error || 'Failed to send message')
      }
      setIsLoading(false)
    })
  }

  const handleDeleteConversation = async (conversationId: string) => {
    if (!confirm(L.deleteConfirm ?? 'Are you sure you want to delete this conversation?')) return

    const result = await deleteConversation(conversationId)
    if (result.success) {
      await loadConversations()
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null)
        setMessages([])
      }
      alert(L.deleteSuccess ?? 'Conversation deleted.')
    } else if (result.error) {
      alert(result.error)
    }
  }

  const handleUpdateDocuments = async (documentIds: string[]) => {
    setSelectedDocuments(documentIds)
    if (currentConversation) {
      await updateConversation(currentConversation.id, { document_ids: documentIds })
      await loadConversations()
    }
  }

  return (
    <>
      {/* New Conversation Dialog */}
      {showNewConversationDialog && !isStudent && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowNewConversationDialog(false)}
          />

          {/* Dialog Container */}
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="relative w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">{L.newSessionDialogTitle}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {L.newSessionDialogDescription}
                  </p>
                </div>

                {/* Content */}
                <div className="px-6 py-4 space-y-4">
                  {/* Title Input */}
                  <div>
                    <label htmlFor="conversation-title" className="block text-sm font-medium text-gray-700 mb-2">
                      {L.sessionTitleLabel}
                    </label>
                    <input
                      id="conversation-title"
                      type="text"
                      value={newConversationTitle}
                      onChange={(e) => setNewConversationTitle(e.target.value)}
                      placeholder={L.sessionTitlePlaceholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newConversationTitle.trim()) {
                          handleCreateConversation()
                        }
                      }}
                    />
                  </div>

                  {/* Document Selection */}
                  {documents.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {L.selectDocumentsOptional}
                      </label>
                      <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3">
                        {documents.map((doc) => (
                          <label key={doc.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={newConversationDocs.includes(doc.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewConversationDocs([...newConversationDocs, doc.id])
                                } else {
                                  setNewConversationDocs(newConversationDocs.filter(id => id !== doc.id))
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700 flex-1 truncate">{doc.title}</span>
                          </label>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {L.selectedDocsRagHint}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50">
                  <button
                    onClick={() => {
                      setShowNewConversationDialog(false)
                      setNewConversationTitle('')
                      setNewConversationDocs([])
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {L.cancel}
                  </button>
                  <button
                    onClick={handleCreateConversation}
                    disabled={!newConversationTitle.trim() || isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {L.creating}
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        {L.createTutorSession}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-[420px] h-[calc(100vh-6rem)] rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Sidebar - Conversations */}
      <div className="w-72 sm:w-80 flex-shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/50 min-h-0">
        {!isStudent && (
          <div className="p-3 border-b border-gray-100">
            <button
              onClick={handleNewConversation}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
            >
              <Plus className="h-4 w-4" />
              {L.newSession}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          {isLoadingConversations ? (
            <div className="p-4 text-center text-sm text-gray-500">{L.loading}</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              {isStudent ? L.noSessionsStudent : L.startNewSession}
            </div>
          ) : (
            <div className="px-2 space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`w-full p-3 rounded-xl transition-colors ${
                    currentConversation?.id === conv.id
                      ? 'bg-white border border-blue-200 shadow-sm ring-1 ring-blue-100'
                      : 'hover:bg-white/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => setCurrentConversation(conv)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {conv.title || L.untitledConversation}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(conv.updated_at).toLocaleDateString()}
                      </p>
                      {isStudent && conv.class_name && (
                        <p className="text-xs text-green-600 mt-1 font-medium">
                          {conv.class_name}
                        </p>
                      )}
                      {conv.document_ids && conv.document_ids.length > 0 && (
                        <p className="text-xs text-blue-600 mt-1">
                          {(L.documentsCount ?? '{count} document(s)').replace('{count}', String(conv.document_ids.length))}
                        </p>
                      )}
                    </button>
                    {!isStudent && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteConversation(conv.id)
                        }}
                        className="flex-shrink-0 p-1 rounded hover:bg-red-100 text-red-600"
                        aria-label="Delete tutor session"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {currentConversation ? (
          <>
            {/* Chat Header */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {currentConversation.title || L.untitled}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedDocuments.length > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {(L.documentsCount ?? '{count} document(s)').replace('{count}', String(selectedDocuments.length))}
                      </span>
                    ) : (
                      L.eduBot
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages - scrollable, takes all remaining space */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-gray-50/30">
              <div className="mx-auto max-w-2xl space-y-5">
                {messages.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 mb-4">
                      <Bot className="h-7 w-7" />
                    </div>
                    <p className="text-gray-500 text-sm">{L.askQuestionToStart}</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start gap-3 ${
                        message.role === 'user' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-600'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <MessageSquare className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>
                      <div className={`flex-1 min-w-0 ${message.role === 'user' ? 'text-right' : ''}`}>
                        <div
                          className={`inline-block text-left rounded-2xl max-w-[92%] sm:max-w-2xl ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white rounded-tr-md px-4 py-2.5'
                              : 'bg-white border border-gray-100 text-gray-800 shadow-sm rounded-tl-md px-5 py-4'
                          }`}
                        >
                          <div
                            className={
                              message.role === 'user'
                                ? 'text-sm leading-relaxed'
                                : 'text-sm leading-relaxed [&_.rich-text-with-math]:break-words [&_.rich-text-with-math]:whitespace-pre-wrap'
                            }
                          >
                            <RichTextWithMath
                              content={message.content}
                              asHtml={false}
                              className="block"
                              as="div"
                            />
                          </div>
                          {message.metadata?.sources && message.metadata.sources.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-gray-100">
                              <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                                <BookOpen className="h-3.5 w-3.5" />
                                {L.sources}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {message.metadata.sources.map((source, idx) => (
                                  <a
                                    key={idx}
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center rounded-lg bg-gray-50 px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700 border border-gray-100 transition-colors"
                                  >
                                    {source.title}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="rounded-2xl rounded-tl-md bg-white border border-gray-100 px-4 py-3 shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-white">
              <div className="mx-auto max-w-3xl space-y-3">
                {/* Document Selection - Only for teachers */}
                {!isStudent && (
                  documents.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">{L.documentsLabel}</span>
                    {documents.map((doc) => (
                      <label
                        key={doc.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 bg-gray-50 text-xs cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDocuments.includes(doc.id)}
                          onChange={(e) => {
                            const newSelection = e.target.checked
                              ? [...selectedDocuments, doc.id]
                              : selectedDocuments.filter(id => id !== doc.id)
                            handleUpdateDocuments(newSelection)
                          }}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                        />
                        <FileText className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                        <span className="truncate max-w-[140px]">{doc.title}</span>
                      </label>
                    ))}
                  </div>
                  ) : (
                  <p className="text-xs text-gray-500">
                    <a href={documentsPath} className="text-blue-600 hover:underline">{L.uploadDocumentsLink}</a>
                    {' '}{L.uploadDocumentsHint}
                  </p>
                  )
                )}

                {/* Options row: RAG + Short answer */}
                <div className="flex flex-wrap items-center gap-4 py-1">
                  {!isStudent && documents.length > 0 && (
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="use-rag"
                        checked={useRAG}
                        onChange={(e) => setUseRAG(e.target.checked)}
                        disabled={selectedDocuments.length === 0}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        <Sparkles className="inline h-3.5 w-3.5 mr-1 text-amber-500" />
                        {L.useDocumentsForContext}
                        {selectedDocuments.length === 0 && (
                          <span className="text-gray-400"> {L.selectAbove}</span>
                        )}
                      </span>
                    </label>
                  )}
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="short-answer"
                      checked={shortAnswer}
                      onChange={(e) => setShortAnswer(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      {L.shortAnswers}
                      <span className="text-gray-400 ml-0.5">{L.shortAnswersHint}</span>
                    </span>
                  </label>
                </div>

                {/* Message Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSendMessage()
                  }}
                  className="flex gap-2 items-end"
                >
                  <div className="flex-1 min-w-0">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      rows={2}
                      placeholder={isStudent ? L.inputPlaceholderStudent : L.inputPlaceholder}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none bg-gray-50/80"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    aria-label={L.sendMessageAria}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </form>
                <p className="text-xs text-gray-400">
                  {L.aiGeneratedDisclaimer}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50/30">
            <div className="text-center px-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 mb-4">
                <Bot className="h-8 w-8" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {isStudent ? L.selectSession : L.noSessionSelected}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {isStudent ? L.chooseSessionStudent : L.createOrSelectSession}
              </p>
              {!isStudent && (
                <button
                  onClick={handleNewConversation}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Plus className="h-4 w-4" />
                  {L.newSession}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
