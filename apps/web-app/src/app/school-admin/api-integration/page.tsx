import { getCurrentUser } from '@/lib/backend-auth'
import { redirect } from 'next/navigation'
import { teacherApiKeyRepository } from '@eduator/db'
import { getTranslations } from 'next-intl/server'
import { ApiIntegrationClient } from './api-integration-client'
import { getApiUrl } from '../../../lib/portal-urls'

const API_BASE = getApiUrl()
const API_BASE_V1 = `${API_BASE}/v1`

export default async function ApiIntegrationPage() {
  const t = await getTranslations('teacherApiIntegration')
  const title = t('title') === 'title' ? 'API Integration' : t('title')
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  if (user.role !== 'operator' && user.role !== 'admin') redirect('/app')

  const [keys, usageStats] = await Promise.all([
    teacherApiKeyRepository.listByProfile(user.id),
    teacherApiKeyRepository.getUsageStats(user.id),
  ])

  return (
    <div className="w-full max-w-none space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {title}
        </h1>
      </header>

      <ApiIntegrationClient
        keys={keys}
        usageStats={usageStats}
        apiBaseUrl={API_BASE_V1}
      />
    </div>
  )
}

