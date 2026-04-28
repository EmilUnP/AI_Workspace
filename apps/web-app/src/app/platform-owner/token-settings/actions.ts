'use server'

import { revalidatePath } from 'next/cache'
import { tokenRepository } from '@eduator/db/repositories/tokens'

export async function updateTokenSetting(
  key: string,
  payload: { tokens: number; label?: string }
) {
  const updated = await tokenRepository.updateUsageSetting(key, payload)
  if (!updated) {
    return { error: 'Failed to update setting' }
  }
  revalidatePath('/platform-owner/token-settings')
  return { data: updated }
}
