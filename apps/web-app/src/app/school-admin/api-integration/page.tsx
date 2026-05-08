import { getCurrentUser } from '@/lib/backend-auth'
import { redirect } from 'next/navigation'
import { teacherApiKeyRepository } from '@eduator/db'
import { getTranslations } from 'next-intl/server'
import { ApiIntegrationClient } from './api-integration-client'
import { getApiUrl } from '../../../lib/portal-urls'
import { getAccessToken } from '@/lib/backend-auth'

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
  const token = await getAccessToken()
  let geminiKeyStatus = { hasKey: false, keyHint: null as string | null }
  if (token) {
    const response = await fetch(`${API_BASE_V1}/users/me/ai-keys/gemini`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (response.ok) {
      const payload = (await response.json()) as { hasKey?: boolean; keyHint?: string | null }
      geminiKeyStatus = { hasKey: Boolean(payload.hasKey), keyHint: payload.keyHint ?? null }
    }
  }

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
        geminiKeyStatus={geminiKeyStatus}
      />
    </div>
  )
}

