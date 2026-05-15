import { getCurrentUser, getAccessToken } from '@/lib/backend-auth'
import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ApiIntegrationClient } from './api-integration-client'

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'
const API_BASE_V1 = `${API_BASE}/v1`

export default async function ApiIntegrationPage() {
  const t = await getTranslations('teacherApiIntegration')
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  if (user.role !== 'operator' && user.role !== 'admin') redirect('/app')
  const token = await getAccessToken()
  let keys: Array<{
    id: string
    name: string
    key_prefix: string
    is_active: boolean
    created_at: string
    last_used_at: string | null
  }> = []
  let usageStats = {
    totalRequests: 0,
    successCount: 0,
    errorCount: 0,
    byKey: [] as Array<{ keyId: string; keyName: string; keyPrefix: string; total: number; success: number; error: number }>,
    byEndpoint: [] as Array<{ method: string; endpoint: string; total: number; success: number; error: number }>,
    recent: [] as Array<{ method: string; endpoint: string; status: string; statusCode: number | null; createdAt: string }>,
  }
  let geminiKeyStatus = { hasKey: false, keyHint: null as string | null }
  if (token) {
    const [keysResponse, usageResponse, geminiResponse] = await Promise.all([
      fetch(`${API_BASE_V1}/users/me/api-keys`, {
        headers: webAppBackendAuthHeaders(token),
        cache: 'no-store',
      }),
      fetch(`${API_BASE_V1}/users/me/api-keys/usage`, {
        headers: webAppBackendAuthHeaders(token),
        cache: 'no-store',
      }),
      fetch(`${API_BASE_V1}/users/me/ai-keys/gemini`, {
        headers: webAppBackendAuthHeaders(token),
        cache: 'no-store',
      }),
    ])

    if (keysResponse.ok) {
      const payload = (await keysResponse.json()) as { items?: typeof keys }
      keys = payload.items ?? []
    }
    if (usageResponse.ok) {
      usageStats = (await usageResponse.json()) as typeof usageStats
    }
    if (geminiResponse.ok) {
      const payload = (await geminiResponse.json()) as { hasKey?: boolean; keyHint?: string | null }
      geminiKeyStatus = { hasKey: Boolean(payload.hasKey), keyHint: payload.keyHint ?? null }
    }
  }

  return (
    <div className="w-full max-w-none space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-gray-600">{t('pageSubtitle')}</p>
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

