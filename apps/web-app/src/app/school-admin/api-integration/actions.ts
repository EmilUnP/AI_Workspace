'use server'

import { createClient } from '@eduator/auth/supabase/server'
import { revalidatePath } from 'next/cache'
import { teacherApiKeyRepository } from '@eduator/db'

export type CreateKeyResult = { error?: string; key?: string; name?: string }
export type RevokeResult = { error?: string }

export async function createApiKey(_prev: unknown, formData: FormData): Promise<CreateKeyResult> {
  const name = (formData.get('name') as string)?.trim()
  if (!name || name.length < 1) {
    return { error: 'Key name is required' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, metadata')
    .eq('user_id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found' }

  const metadata = profile.metadata as { api_integration_enabled?: boolean } | null
  if (!metadata?.api_integration_enabled) {
    return { error: 'API integration is not enabled for your account' }
  }

  const result = teacherApiKeyRepository.create(profile.id, name)
  const created = await result
  if (!created) return { error: 'Failed to create API key' }

  revalidatePath('/school-admin/api-integration')
  return { key: created.key, name: created.row.name }
}

export async function revokeApiKey(keyId: string): Promise<RevokeResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found' }

  const ok = await teacherApiKeyRepository.revoke(keyId, profile.id)
  if (!ok) return { error: 'Failed to revoke key' }

  revalidatePath('/school-admin/api-integration')
  return {}
}

