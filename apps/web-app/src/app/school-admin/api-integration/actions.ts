'use server'

import { getAccessToken, getCurrentUser } from '@/lib/backend-auth'
import { getApiUrl } from '@/lib/portal-urls'
import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'
import { revalidatePath } from 'next/cache'

export type CreateKeyResult = { error?: string; key?: string; name?: string }
export type RevokeResult = { error?: string }
export type ApiKeysResult = {
  error?: string
  items?: Array<{
    id: string
    name: string
    key_prefix: string
    is_active: boolean
    created_at: string
    last_used_at: string | null
  }>
}
export type GeminiKeyStatusResult = { error?: string; hasKey?: boolean; keyHint?: string | null }
export type SaveGeminiKeyResult = { error?: string; hasKey?: boolean; keyHint?: string | null }

export type UsageDateRange = 'today' | '30d' | 'all'

export type UsageStatsResult = {
  error?: string
  totalRequests?: number
  successCount?: number
  errorCount?: number
  byKey?: Array<{ keyId: string; keyName: string; keyPrefix: string; total: number; success: number; error: number }>
  byEndpoint?: Array<{ method: string; endpoint: string; total: number; success: number; error: number }>
  recent?: Array<{
    method: string
    endpoint: string
    status: string
    statusCode: number | null
    createdAt: string
    apiKeyId?: string | null
  }>
  range?: UsageDateRange
}

const getBackendBase = () => getApiUrl()

export async function createApiKey(_prev: unknown, formData: FormData): Promise<CreateKeyResult> {
  const name = (formData.get('name') as string)?.trim()
  if (!name || name.length < 1) {
    return { error: 'Key name is required' }
  }

  const user = await getCurrentUser()
  if (!user) return { error: 'Not authenticated' }
  if (user.role !== 'operator' && user.role !== 'admin') return { error: 'Not authorized' }
  const token = await getAccessToken()
  if (!token) return { error: 'Not authenticated' }
  const response = await fetch(`${getApiUrl()}/v1/users/me/api-keys`, {
    method: 'POST',
    headers: {
      ...webAppBackendAuthHeaders(token),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name }),
    cache: 'no-store'
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    return { error: payload.error || 'Failed to create API key' }
  }
  const created = (await response.json()) as { key?: string; row?: { name?: string } }
  if (!created.key || !created.row?.name) return { error: 'Failed to create API key' }

  revalidatePath('/school-admin/api-integration')
  return { key: created.key, name: created.row.name }
}

export async function revokeApiKey(keyId: string): Promise<RevokeResult> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Not authenticated' }
  if (user.role !== 'operator' && user.role !== 'admin') return { error: 'Not authorized' }
  const token = await getAccessToken()
  if (!token) return { error: 'Not authenticated' }
  const response = await fetch(`${getApiUrl()}/v1/users/me/api-keys/${keyId}`, {
    method: 'DELETE',
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store'
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    return { error: payload.error || 'Failed to revoke key' }
  }

  revalidatePath('/school-admin/api-integration')
  return {}
}

export async function getApiKeys(): Promise<ApiKeysResult> {
  const token = await getAccessToken()
  if (!token) return { error: 'Not authenticated' }
  const response = await fetch(`${getApiUrl()}/v1/users/me/api-keys`, {
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store'
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    return { error: payload.error || 'Failed to load API keys' }
  }
  const payload = (await response.json()) as ApiKeysResult
  return { items: payload.items ?? [] }
}

export async function getGeminiKeyStatus(): Promise<GeminiKeyStatusResult> {
  const token = await getAccessToken()
  if (!token) return { error: 'Not authenticated' }

  const response = await fetch(`${getApiUrl()}/v1/users/me/ai-keys/gemini`, {
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store'
  })
  if (!response.ok) return { error: 'Failed to load Gemini key status' }
  const payload = (await response.json()) as { hasKey?: boolean; keyHint?: string | null }
  return { hasKey: Boolean(payload.hasKey), keyHint: payload.keyHint ?? null }
}

export async function saveGeminiKey(apiKey: string): Promise<SaveGeminiKeyResult> {
  const token = await getAccessToken()
  if (!token) return { error: 'Not authenticated' }
  const response = await fetch(`${getApiUrl()}/v1/users/me/ai-keys/gemini`, {
    method: 'PUT',
    headers: {
      ...webAppBackendAuthHeaders(token),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ apiKey }),
    cache: 'no-store'
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      issues?: Array<{ message?: string }>
    }
    const validationDetail = payload.issues?.find((issue) => issue.message)?.message
    return { error: validationDetail || payload.error || 'Failed to save Gemini key' }
  }
  const payload = (await response.json()) as { hasKey?: boolean; keyHint?: string | null }
  revalidatePath('/school-admin/api-integration')
  return { hasKey: Boolean(payload.hasKey), keyHint: payload.keyHint ?? null }
}

export async function getUsageStats(range: UsageDateRange = 'all'): Promise<UsageStatsResult> {
  const token = await getAccessToken()
  if (!token) return { error: 'Not authenticated' }

  const qs = range === 'all' ? '' : `?range=${encodeURIComponent(range)}`
  const response = await fetch(`${getApiUrl()}/v1/users/me/api-keys/usage${qs}`, {
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store',
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    return { error: payload.error || 'Failed to load usage' }
  }
  const payload = (await response.json()) as UsageStatsResult
  return {
    totalRequests: payload.totalRequests ?? 0,
    successCount: payload.successCount ?? 0,
    errorCount: payload.errorCount ?? 0,
    byKey: payload.byKey ?? [],
    byEndpoint: payload.byEndpoint ?? [],
    recent: payload.recent ?? [],
    range: payload.range ?? range,
  }
}

export async function deleteGeminiKey(): Promise<SaveGeminiKeyResult> {
  const token = await getAccessToken()
  if (!token) return { error: 'Not authenticated' }
  const response = await fetch(`${getApiUrl()}/v1/users/me/ai-keys/gemini`, {
    method: 'DELETE',
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store'
  })
  if (!response.ok) return { error: 'Failed to delete Gemini key' }
  const payload = (await response.json()) as { hasKey?: boolean; keyHint?: string | null }
  revalidatePath('/school-admin/api-integration')
  return { hasKey: Boolean(payload.hasKey), keyHint: payload.keyHint ?? null }
}

