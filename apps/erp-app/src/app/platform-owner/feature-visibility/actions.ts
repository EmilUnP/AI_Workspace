'use server'

import { revalidatePath } from 'next/cache'
import { getSessionWithProfile } from '@eduator/auth/supabase/server'
import { featureVisibilityRepository } from '@eduator/db/repositories'
import { type FeatureAppSource, type FeatureRole } from '@eduator/core/utils'

export async function updateFeatureVisibility(input: {
  appSource: FeatureAppSource
  role: FeatureRole
  featureKey: string
  enabled: boolean
}) {
  const session = await getSessionWithProfile()
  const profile = session?.profile

  if (!session?.user || profile?.profile_type !== 'platform_owner') {
    return { error: 'Unauthorized' }
  }

  const ok = await featureVisibilityRepository.setRule({
    appSource: input.appSource,
    role: input.role,
    featureKey: input.featureKey,
    enabled: input.enabled,
    updatedBy: session.user.id,
  })

  if (!ok) {
    return { error: 'Failed to update visibility rule' }
  }

  revalidatePath('/platform-owner/feature-visibility')
  return { success: true }
}

export async function updateFeatureOrder(input: {
  appSource: FeatureAppSource
  role: FeatureRole
  featureKey: string
  sortOrder: number
}) {
  const session = await getSessionWithProfile()
  const profile = session?.profile

  if (!session?.user || profile?.profile_type !== 'platform_owner') {
    return { error: 'Unauthorized' }
  }

  const ok = await featureVisibilityRepository.setSortOrder({
    appSource: input.appSource,
    role: input.role,
    featureKey: input.featureKey,
    sortOrder: input.sortOrder,
    updatedBy: session.user.id,
  })

  if (!ok) {
    return { error: 'Failed to update feature order' }
  }

  revalidatePath('/platform-owner/feature-visibility')
  return { success: true }
}

export async function updateFeatureOrderBulk(input: {
  appSource: FeatureAppSource
  role: FeatureRole
  orderedFeatureKeys: string[]
}) {
  const session = await getSessionWithProfile()
  const profile = session?.profile

  if (!session?.user || profile?.profile_type !== 'platform_owner') {
    return { error: 'Unauthorized' }
  }

  const ok = await featureVisibilityRepository.setSortOrderBulk({
    appSource: input.appSource,
    role: input.role,
    orderedFeatureKeys: input.orderedFeatureKeys,
    updatedBy: session.user.id,
  })

  if (!ok) {
    return { error: 'Failed to update feature order' }
  }

  revalidatePath('/platform-owner/feature-visibility')
  return { success: true }
}

export async function updateFeatureParent(input: {
  appSource: FeatureAppSource
  role: FeatureRole
  featureKey: string
  parentFeatureKey: string | null
}) {
  const session = await getSessionWithProfile()
  const profile = session?.profile

  if (!session?.user || profile?.profile_type !== 'platform_owner') {
    return { error: 'Unauthorized' }
  }

  const ok = await featureVisibilityRepository.setParent({
    appSource: input.appSource,
    role: input.role,
    featureKey: input.featureKey,
    parentFeatureKey: input.parentFeatureKey,
    updatedBy: session.user.id,
  })

  if (!ok) {
    return { error: 'Failed to update feature group' }
  }

  revalidatePath('/platform-owner/feature-visibility')
  return { success: true }
}

