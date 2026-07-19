'use server'

import { getAccessToken, getCurrentUser } from '@/lib/backend-auth'
import { getApiUrl } from '@/lib/portal-urls'
import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'
import { revalidatePath } from 'next/cache'

async function requireAdminToken() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return { error: 'Not authorized' as const }
  const token = await getAccessToken()
  if (!token) return { error: 'Not authenticated' as const }
  return { token }
}

async function adminFetch(path: string, init?: RequestInit) {
  const auth = await requireAdminToken()
  if ('error' in auth) return { error: auth.error }
  const response = await fetch(`${getApiUrl()}/v1${path}`, {
    ...init,
    headers: {
      ...webAppBackendAuthHeaders(auth.token),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    return {
      error: (payload as { error?: string; message?: string }).error
        || (payload as { message?: string }).message
        || `Request failed (${response.status})`,
    }
  }
  return { data: payload }
}

export async function getAiProvidersOverview() {
  return adminFetch('/admin/ai-providers')
}

export async function saveOpenRouterKey(formData: FormData) {
  const apiKey = String(formData.get('apiKey') || '').trim()
  const expectedVersion = Number(formData.get('expectedVersion') || 0)
  const result = await adminFetch('/admin/ai-providers/credential', {
    method: 'PUT',
    body: JSON.stringify({
      apiKey,
      expectedVersion: expectedVersion > 0 ? expectedVersion : undefined,
    }),
  })
  if (!('error' in result)) revalidatePath('/platform-owner/ai-providers')
  return result
}

export async function deleteOpenRouterKey() {
  const result = await adminFetch('/admin/ai-providers/credential', { method: 'DELETE' })
  if (!('error' in result)) revalidatePath('/platform-owner/ai-providers')
  return result
}

export async function testOpenRouterKey() {
  const result = await adminFetch('/admin/ai-providers/credential/test', { method: 'POST' })
  if (!('error' in result)) revalidatePath('/platform-owner/ai-providers')
  return result
}

export async function syncModelCatalog() {
  const result = await adminFetch('/admin/ai-providers/catalog/sync', { method: 'POST' })
  if (!('error' in result)) revalidatePath('/platform-owner/ai-providers')
  return result
}

export async function setModelEnabled(modelId: string, isEnabled: boolean) {
  const result = await adminFetch('/admin/ai-providers/catalog/enabled', {
    method: 'PATCH',
    body: JSON.stringify({ modelId, isEnabled }),
  })
  if (!('error' in result)) revalidatePath('/platform-owner/ai-providers')
  return result
}

export async function updateWorkloadPolicy(input: {
  workload: string
  modelChain: string[]
  expectedVersion: number
  requireStructuredOutputs?: boolean
  preferZdr?: boolean
  isEnabled?: boolean
}) {
  const result = await adminFetch(`/admin/ai-providers/policies/${encodeURIComponent(input.workload)}`, {
    method: 'PUT',
    body: JSON.stringify({
      modelChain: input.modelChain,
      expectedVersion: input.expectedVersion,
      requireStructuredOutputs: input.requireStructuredOutputs,
      preferZdr: input.preferZdr,
      isEnabled: input.isEnabled,
    }),
  })
  if (!('error' in result)) revalidatePath('/platform-owner/ai-providers')
  return result
}
