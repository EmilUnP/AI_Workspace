import { getAccessToken, getCurrentUser } from '@/lib/backend-auth'
import { getApiUrl } from '@/lib/portal-urls'
import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'
import { redirect } from 'next/navigation'
import { AiProvidersClient } from './ai-providers-client'

export default async function AiProvidersPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  if (user.role !== 'admin') redirect('/app')

  const token = await getAccessToken()
  if (!token) redirect('/auth/login')

  const response = await fetch(`${getApiUrl()}/v1/admin/ai-providers`, {
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store',
  })

  if (!response.ok) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">AI Providers</h1>
        <p className="text-sm text-red-700">
          Failed to load AI provider settings ({response.status}). Ensure migration 018 is applied and you are signed in as admin.
        </p>
      </div>
    )
  }

  const overview = (await response.json()) as {
    credential: {
      hasKey: boolean
      keyHint: string | null
      source: string
      isActive: boolean
      lastTestedAt: string | null
      lastTestStatus: string | null
      lastTestError: string | null
      version: number
      updatedAt: string | null
    }
    policies: Array<{
      workload: string
      model_chain: string[]
      require_structured_outputs: boolean
      prefer_zdr: boolean
      is_enabled: boolean
      notes: string | null
      version: number
    }>
    catalog: Array<{
      model_id: string
      display_name: string
      context_length: number | null
      output_modalities: string[]
      prompt_price_per_million: string | null
      completion_price_per_million: string | null
      is_enabled: boolean
      is_deprecated: boolean
    }>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">AI Providers</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage the single platform OpenRouter key, then control which Gemini models each AI workload uses.
        </p>
      </div>
      <AiProvidersClient
        credential={overview.credential}
        policies={overview.policies}
        catalog={overview.catalog}
      />
    </div>
  )
}
