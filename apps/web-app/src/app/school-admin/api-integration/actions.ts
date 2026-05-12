'use server'

import { getAccessToken, getCurrentUser } from '@/lib/backend-auth'
import { revalidatePath } from 'next/cache'
import { getApiUrl } from '@/lib/portal-urls'

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
  const response = await fetch(`${getBackendBase()}/v1/users/me/api-keys`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
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
  const response = await fetch(`${getBackendBase()}/v1/users/me/api-keys/${keyId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
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
  const response = await fetch(`${getBackendBase()}/v1/users/me/api-keys`, {
    headers: { Authorization: `Bearer ${token}` },
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

  const response = await fetch(`${getBackendBase()}/v1/users/me/ai-keys/gemini`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  })
  if (!response.ok) return { error: 'Failed to load Gemini key status' }
  const payload = (await response.json()) as { hasKey?: boolean; keyHint?: string | null }
  return { hasKey: Boolean(payload.hasKey), keyHint: payload.keyHint ?? null }
}

export async function saveGeminiKey(apiKey: string): Promise<SaveGeminiKeyResult> {
  const token = await getAccessToken()
  if (!token) return { error: 'Not authenticated' }
  const response = await fetch(`${getBackendBase()}/v1/users/me/ai-keys/gemini`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ apiKey }),
    cache: 'no-store'
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    return { error: payload.error || 'Failed to save Gemini key' }
  }
  const payload = (await response.json()) as { hasKey?: boolean; keyHint?: string | null }
  revalidatePath('/school-admin/api-integration')
  return { hasKey: Boolean(payload.hasKey), keyHint: payload.keyHint ?? null }
}

export async function deleteGeminiKey(): Promise<SaveGeminiKeyResult> {
  const token = await getAccessToken()
  if (!token) return { error: 'Not authenticated' }
  const response = await fetch(`${getBackendBase()}/v1/users/me/ai-keys/gemini`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  })
  if (!response.ok) return { error: 'Failed to delete Gemini key' }
  const payload = (await response.json()) as { hasKey?: boolean; keyHint?: string | null }
  revalidatePath('/school-admin/api-integration')
  return { hasKey: Boolean(payload.hasKey), keyHint: payload.keyHint ?? null }
}

