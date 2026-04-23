import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AITutor } from '@eduator/ui'
import {
  getConversations,
  getConversation,
  sendMessage,
  createConversation,
  updateConversation,
  deleteConversation,
} from './actions'
import { createClient } from '@eduator/auth/supabase/server'

async function getStudentInfo() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .eq('profile_type', 'student')
    .single()

  return profile
}

export default async function StudentChatPage() {
  const [studentData, t] = await Promise.all([getStudentInfo(), getTranslations('studentChat')])

  if (!studentData) {
    redirect('/auth/login')
  }

  const chatLabels = {
    noSessionsStudent: t('noSessionsStudent'),
    startNewSession: t('startNewSession'),
    chooseSessionStudent: t('chooseSessionStudent'),
    inputPlaceholderStudent: t('inputPlaceholder'),
    askQuestionToStart: t('askQuestionToStart'),
    sendMessageAria: t('sendMessageAria'),
    aiGeneratedDisclaimer: t('aiGeneratedDisclaimer'),
    selectSession: t('selectSession'),
    untitledConversation: t('untitledConversation'),
    newConversation: t('newConversation'),
    loading: t('loading'),
    documentsCount: t('documentsCount'),
    shortAnswers: t('shortAnswers'),
    shortAnswersHint: t('shortAnswersHint'),
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {t('subtitle')}
        </p>
      </div>

      {/* AI Tutor Component - Students can only view, not create sessions */}
      <AITutor
        documents={[]}
        documentsPath="/student/chat"
        isStudent={true}
        labels={chatLabels}
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
