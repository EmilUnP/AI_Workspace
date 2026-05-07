'use server'

import { getCurrentUser } from '@/lib/backend-auth'
import { revalidatePath } from 'next/cache'
import { teacherApiKeyRepository } from '@eduator/db'

export type CreateKeyResult = { error?: string; key?: string; name?: string }
export type RevokeResult = { error?: string }

export async function createApiKey(_prev: unknown, formData: FormData): Promise<CreateKeyResult> {
  const name = (formData.get('name') as string)?.trim()
  if (!name || name.length < 1) {
    return { error: 'Key name is required' }
  }

  const user = await getCurrentUser()
  if (!user) return { error: 'Not authenticated' }
  if (user.role !== 'operator' && user.role !== 'admin') return { error: 'Not authorized' }

  const result = teacherApiKeyRepository.create(user.id, name)
  const created = await result
  if (!created) return { error: 'Failed to create API key' }

  revalidatePath('/school-admin/api-integration')
  return { key: created.key, name: created.row.name }
}

export async function revokeApiKey(keyId: string): Promise<RevokeResult> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Not authenticated' }
  if (user.role !== 'operator' && user.role !== 'admin') return { error: 'Not authorized' }

  const ok = await teacherApiKeyRepository.revoke(keyId, user.id)
  if (!ok) return { error: 'Failed to revoke key' }

  revalidatePath('/school-admin/api-integration')
  return {}
}

