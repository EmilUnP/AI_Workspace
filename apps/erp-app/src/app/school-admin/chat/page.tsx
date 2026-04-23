import { createClient } from '@eduator/auth/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { AITutor } from '@eduator/ui'
import {
  getConversations,
  getConversation,
  createConversation,
  sendMessage,
  updateConversation,
  deleteConversation,
} from './actions'

async function getTeacherInfo() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id, full_name')
    .eq('user_id', user.id)
    .single()
  
  if (!profile?.organization_id) return null
  
  return { teacherId: profile.id, organizationId: profile.organization_id, name: profile.full_name }
}

async function getTeacherDocuments(teacherId: string, organizationId: string) {
  const supabase = await createClient()
  
  const { data: documents } = await supabase
    .from('documents')
    .select('id, title, file_type, file_name')
    .eq('organization_id', organizationId)
    .eq('created_by', teacherId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
  
  return documents || []
}

export default async function TeacherChatPage() {
  const t = await getTranslations('teacherChat')

  const teacherData = await getTeacherInfo()
  
  if (!teacherData) {
    redirect('/auth/login')
  }

  const documents = await getTeacherDocuments(teacherData.teacherId, teacherData.organizationId)

  return (
    <div className="space-y-3 max-w-6xl mx-auto">
      <div>
        <Link
          href="/school-admin"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('breadcrumb')}
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">{t('title')}</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {t('subtitle')}
        </p>
      </div>

      <AITutor
        documents={documents.map(doc => ({
          id: doc.id,
          title: doc.title,
          file_type: doc.file_type,
        }))}
        documentsPath="/school-admin/documents"
        labels={{
          createNewSession: t('createNewSession'),
          newSessionDialogTitle: t('newSessionDialogTitle'),
          newSessionDialogDescription: t('newSessionDialogDescription'),
          sessionTitleLabel: t('sessionTitleLabel'),
          sessionTitlePlaceholder: t('sessionTitlePlaceholder'),
          selectDocumentsOptional: t('selectDocumentsOptional'),
          selectedDocsRagHint: t('selectedDocsRagHint'),
          cancel: t('cancel'),
          creating: t('creating'),
          createTutorSession: t('createTutorSession'),
          newSession: t('newSession'),
          loading: t('loading'),
          noSessionsStudent: t('noSessionsStudent'),
          startNewSession: t('startNewSession'),
          untitledConversation: t('untitledConversation'),
          deleteSessionAria: t('deleteSessionAria'),
          documentsCount: t('documentsCount', { count: '{count}' }),
          untitled: t('untitled'),
          eduBot: t('eduBot'),
          askQuestionToStart: t('askQuestionToStart'),
          sources: t('sources'),
          documentsLabel: t('documentsLabel'),
          uploadDocumentsLink: t('uploadDocumentsLink'),
          uploadDocumentsHint: t('uploadDocumentsHint'),
          useDocumentsForContext: t('useDocumentsForContext'),
          selectAbove: t('selectAbove'),
          shortAnswers: t('shortAnswers'),
          shortAnswersHint: t('shortAnswersHint'),
          inputPlaceholder: t('inputPlaceholder'),
          inputPlaceholderStudent: t('inputPlaceholderStudent'),
          sendMessageAria: t('sendMessageAria'),
          aiGeneratedDisclaimer: t('aiGeneratedDisclaimer'),
          selectSession: t('selectSession'),
          noSessionSelected: t('noSessionSelected'),
          chooseSessionStudent: t('chooseSessionStudent'),
          createOrSelectSession: t('createOrSelectSession'),
          deleteConfirm: t('deleteConfirm'),
          deleteSuccess: t('deleteSuccess'),
          failedToSend: t('failedToSend'),
          newConversation: t('newConversation'),
        }}
        getConversations={getConversations}
        getConversation={getConversation}
        createConversation={createConversation}
        sendMessage={sendMessage}
        updateConversation={updateConversation}
        deleteConversation={deleteConversation}
      />
    </div>
  )
}

