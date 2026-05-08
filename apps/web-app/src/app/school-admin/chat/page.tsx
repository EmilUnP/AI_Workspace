import { getTranslations } from 'next-intl/server'
import { ChatClient } from './chat-client'

export default async function SchoolAdminChatPage() {
  const t = await getTranslations('teacherChat')
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
      </div>

      <ChatClient />
    </div>
  )
}

