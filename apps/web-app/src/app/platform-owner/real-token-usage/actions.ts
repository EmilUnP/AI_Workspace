'use server'

import { revalidatePath } from 'next/cache'
import { getSessionWithProfile } from '@eduator/auth/supabase/server'
import { tokenRepository } from '@eduator/db/repositories/tokens'

export async function updateModelPricing(input: {
  id: string
  displayName: string
  sourceUrl?: string | null
  inputCostPer1M: number
  outputCostPer1M: number
}) {
  const session = await getSessionWithProfile()
  const profile = session?.profile

  if (!session?.user || profile?.profile_type !== 'platform_owner') {
    return { error: 'Unauthorized' }
  }

  if (!input.id || input.inputCostPer1M < 0 || input.outputCostPer1M < 0) {
    return { error: 'Invalid pricing input' }
  }

  const ok = await tokenRepository.updateModelPricingSetting({
    id: input.id,
    displayName: input.displayName,
    sourceUrl: input.sourceUrl ?? null,
    inputCostPer1M: input.inputCostPer1M,
    outputCostPer1M: input.outputCostPer1M,
  })

  if (!ok) {
    return { error: 'Failed to update model pricing' }
  }

  revalidatePath('/platform-owner/real-token-usage')
  return { success: true }
}

