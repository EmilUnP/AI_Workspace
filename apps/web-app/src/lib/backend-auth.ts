import { cookies } from 'next/headers'

export type BackendUser = {
  id: string
  email: string
  role: string
  full_name?: string | null
  created_at?: string
  updated_at?: string
}

const getBackendBase = () => process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'

export const getAccessToken = async (): Promise<string | null> => {
  const cookieStore = await cookies()
  return cookieStore.get('access_token')?.value ?? null
}

export const getCurrentUser = async (): Promise<BackendUser | null> => {
  const token = await getAccessToken()
  if (!token) return null

  const response = await fetch(`${getBackendBase()}/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
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
  const response = await fetch(`${getBackendBase()}/v1/users?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (!response.ok) return []
  const payload = (await response.json()) as { items?: BackendUser[] }
  return payload.items ?? []
}

