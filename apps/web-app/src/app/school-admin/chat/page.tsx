import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getCurrentUser } from '@/lib/backend-auth'
import { ChatClient } from './chat-client'

async function getAdminInfo() {
  const user = await getCurrentUser()
  if (!user) return null
  if (user.role !== 'operator' && user.role !== 'admin') return null
  return { adminId: user.id, workspaceId: 'global', name: user.full_name }
}

export default async function SchoolAdminChatPage() {
  const t = await getTranslations('teacherChat')

  const adminData = await getAdminInfo()
  
  if (!adminData) {
    redirect('/auth/login')
  }
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
      </div>

      <ChatClient />
    </div>
  )
}

