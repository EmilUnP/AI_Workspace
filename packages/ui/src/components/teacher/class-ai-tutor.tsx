'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageSquare, Bot, Plus, Loader2, Link2, X, CheckCircle } from 'lucide-react'

interface Conversation {
  id: string
  title: string | null
  document_ids: string[]
  context: Record<string, any>
  is_active: boolean
  created_at: string
  updated_at: string
  class_id?: string | null
}

export interface ClassAITutorLabels {
  title: string
  descriptionConnected: string
  descriptionNotConnected: string
  chatTitleFallback: string
  lastUpdated: string
  subjectLabel: string
  gradeLabel: string
  documentsContext: string
  documentsContextPlural: string
  openChat: string
  unlink: string
  creating: string
  createNewChat: string
  loading: string
  linkExistingChat: string
  viewAllChats: string
  linkDialogTitle: string
  linkDialogSubtitle: string
  noChatsToLink: string
  untitledChat: string
  failedToLoadConversations: string
}

const DEFAULT_AI_TUTOR_LABELS: ClassAITutorLabels = {
  title: 'AI Tutor Chat',
  descriptionConnected: 'An AI tutor chat is connected to this class. Students can access it for help.',
  descriptionNotConnected: 'Connect an AI tutor chat to this class. Students enrolled in this class can access it to get help with learning materials.',
  chatTitleFallback: 'AI Tutor Chat',
  lastUpdated: 'Last updated:',
  subjectLabel: 'Subject:',
  gradeLabel: 'Grade:',
  documentsContext: '1 document will be available for context',
  documentsContextPlural: '{count} documents will be available for context',
  openChat: 'Open Chat',
  unlink: 'Unlink',
  creating: 'Creating...',
  createNewChat: 'Create New Chat',
  linkExistingChat: 'Link Existing Chat',
  viewAllChats: 'View All Chats',
  loading: 'Loading...',
  linkDialogTitle: 'Link Existing Chat',
  linkDialogSubtitle: 'Select a chat to connect to this class',
  noChatsToLink: 'No available chats to link. Create a new chat first.',
  untitledChat: 'Untitled Chat',
  failedToLoadConversations: 'Failed to load conversations',
}

interface ClassAITutorProps {
  classId: string
  className: string
  subject?: string | null
  gradeLevel?: string | null
  classDocuments: Array<{ id: string; title: string; file_type: string }>
  existingConversation?: Conversation | null
  labels?: Partial<ClassAITutorLabels>
  onCreateConversation: (input: {
    title?: string
    document_ids?: string[]
    class_id?: string | null
    context?: {
      subject?: string
      grade_level?: string
    }
  }) => Promise<{ data?: any; error?: string }>
  onUpdateConversation: (conversationId: string, updates: {
    class_id?: string | null
    document_ids?: string[]
    context?: Record<string, any>
  }) => Promise<{ data?: any; error?: string }>
  onGetConversations: () => Promise<{ data?: Conversation[]; error?: string }>
}

export function ClassAITutor({
  classId,
  className,
  subject,
  gradeLevel,
  classDocuments,
  existingConversation: initialConversation,
  labels: labelsProp,
  onCreateConversation,
  onUpdateConversation,
  onGetConversations,
}: ClassAITutorProps) {
  const L = { ...DEFAULT_AI_TUTOR_LABELS, ...labelsProp }
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [existingConversation, setExistingConversation] = useState<Conversation | null>(initialConversation || null)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [availableConversations, setAvailableConversations] = useState<Conversation[]>([])
  const [loadingConversations, setLoadingConversations] = useState(false)

  useEffect(() => {
    setExistingConversation(initialConversation || null)
  }, [initialConversation])

  const handleCreateNewChat = () => {
    setError(null)
    
    startTransition(async () => {
      const documentIds = classDocuments.map(doc => doc.id)
      
      const result = await onCreateConversation({
        title: `AI Tutor - ${className}`,
        document_ids: documentIds,
        class_id: classId,
        context: {
          subject: subject || undefined,
          grade_level: gradeLevel || undefined,
        },
      })

      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        setExistingConversation(result.data)
        router.push(`/teacher/chat?conversation=${result.data.id}`)
      }
    })
  }

  const handleLinkExistingChat = async () => {
    setLoadingConversations(true)
    setError(null)
    
    try {
      const result = await onGetConversations()
      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        // Filter out conversations already linked to other classes
        const available = result.data.filter(conv => !conv.class_id || conv.class_id === classId)
        setAvailableConversations(available)
        setShowLinkDialog(true)
      }
    } catch (err) {
      setError(L.failedToLoadConversations)
    } finally {
      setLoadingConversations(false)
    }
  }

  const handleSelectConversation = (conversationId: string) => {
    setError(null)
    
    startTransition(async () => {
      const documentIds = classDocuments.map(doc => doc.id)
      
      const result = await onUpdateConversation(conversationId, {
        class_id: classId,
        document_ids: documentIds,
        context: {
          subject: subject || undefined,
          grade_level: gradeLevel || undefined,
        },
      })

      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        setExistingConversation(result.data)
        setShowLinkDialog(false)
        router.push(`/teacher/chat?conversation=${conversationId}`)
      }
    })
  }

  const handleOpenChat = () => {
    if (existingConversation) {
      router.push(`/teacher/chat?conversation=${existingConversation.id}`)
    }
  }

  const handleUnlinkChat = () => {
    if (!existingConversation) return
    
    setError(null)
    
    startTransition(async () => {
      const result = await onUpdateConversation(existingConversation.id, {
        class_id: null,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setExistingConversation(null)
      }
    })
  }

  return (
    <>
      <div className="rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 flex-shrink-0">
            <Bot className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{L.title}</h3>
                <p className="text-sm text-gray-600">
                  {existingConversation ? L.descriptionConnected : L.descriptionNotConnected}
                </p>
              </div>
            </div>

            {existingConversation ? (
              <div className="mb-4 rounded-lg border border-purple-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <p className="font-medium text-gray-900 truncate">
                        {existingConversation.title || L.chatTitleFallback}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {L.lastUpdated} {new Date(existingConversation.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {(subject || gradeLevel) && (
                  <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
                    {subject && <span>{L.subjectLabel} {subject}</span>}
                    {gradeLevel && <span>{L.gradeLabel} {gradeLevel}</span>}
                  </div>
                )}
                {classDocuments.length > 0 && (
                  <p className="text-xs text-gray-500 mb-3">
                    {classDocuments.length === 1 ? L.documentsContext : L.documentsContextPlural.replace('{count}', String(classDocuments.length))}
                  </p>
                )}
              </>
            )}

            {error && (
              <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              {existingConversation ? (
                <>
                  <button
                    onClick={handleOpenChat}
                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors shadow-sm"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {L.openChat}
                  </button>
                  <button
                    onClick={handleUnlinkChat}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    {L.unlink}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCreateNewChat}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {L.creating}
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        {L.createNewChat}
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleLinkExistingChat}
                    disabled={loadingConversations || isPending}
                    className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2.5 text-sm font-medium text-purple-700 hover:bg-purple-50 disabled:opacity-50 transition-colors"
                  >
                    {loadingConversations ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {L.loading}
                      </>
                    ) : (
                      <>
                        <Link2 className="h-4 w-4" />
                        {L.linkExistingChat}
                      </>
                    )}
                  </button>
                </>
              )}
              <Link
                href="/teacher/chat"
                className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2.5 text-sm font-medium text-purple-700 hover:bg-purple-50 transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                {L.viewAllChats}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Link Existing Chat Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowLinkDialog(false)}
          />
          
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{L.linkDialogTitle}</h2>
                    <p className="text-purple-100 text-sm mt-0.5">
                      {L.linkDialogSubtitle}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowLinkDialog(false)}
                    className="rounded-lg p-1 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 max-h-96 overflow-y-auto">
                {availableConversations.length === 0 ? (
                  <div className="py-8 text-center">
                    <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">
                      {L.noChatsToLink}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv.id)}
                        disabled={isPending}
                        className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors disabled:opacity-50"
                      >
                        <p className="font-medium text-gray-900 mb-1">
                          {conv.title || L.untitledChat}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(conv.updated_at).toLocaleDateString()}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
