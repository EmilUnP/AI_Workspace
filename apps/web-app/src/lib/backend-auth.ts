import { cookies } from 'next/headers'
import { getApiUrl } from '@/lib/portal-urls'
import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'

export type BackendUser = {
  id: string
  email: string
  role: string
  full_name?: string | null
  manual_note?: string | null
  created_at?: string
  updated_at?: string
}

export const getAccessToken = async (): Promise<string | null> => {
  const cookieStore = await cookies()
  return cookieStore.get('access_token')?.value ?? null
}

export const getCurrentUser = async (): Promise<BackendUser | null> => {
  const token = await getAccessToken()
  if (!token) return null

  const response = await fetch(`${getApiUrl()}/v1/auth/me`, {
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store',
  })

  if (!response.ok) return null
  const payload = (await response.json()) as { user?: BackendUser }
  return payload.user ?? null
}

export const listUsers = async (params?: { limit?: number; offset?: number }): Promise<BackendUser[]> => {
  const token = await getAccessToken()
  if (!token) return []

  const limit = Math.min(Math.max(params?.limit ?? 100, 1), 200)
  const offset = Math.max(params?.offset ?? 0, 0)
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) }).toString()
  const response = await fetch(`${getApiUrl()}/v1/users?${query}`, {
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store',
  })

  if (!response.ok) return []
  const payload = (await response.json()) as { items?: BackendUser[] }
  return payload.items ?? []
}

export const getUserById = async (id: string): Promise<BackendUser | null> => {
  if (!id) return null

  const pageSize = 200
  const maxPages = 50

  for (let page = 0; page < maxPages; page += 1) {
    const items = await listUsers({ limit: pageSize, offset: page * pageSize })
    if (items.length === 0) break

    const match = items.find((user) => user.id === id)
    if (match) return match

    if (items.length < pageSize) break
  }

  return null
}

