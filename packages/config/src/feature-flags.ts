import { getFeatureFlags } from './env'

/**
 * Feature flag configuration for Eduator AI
 * Provides runtime feature toggles for gradual rollout
 */

export interface FeatureFlag {
  name: string
  description: string
  enabled: boolean
  rolloutPercentage?: number
  enabledForOrganizations?: string[]
  enabledForProfiles?: string[]
}

export type FeatureFlagKey =
  | 'aiChatbot'
  | 'lessonGenerator'
  | 'translation'
  | 'analyticsV2'
  | 'exportPipelines'
  | 'adaptiveDifficulty'

/**
 * Feature flag definitions
 */
const featureFlagDefinitions: Record<FeatureFlagKey, Omit<FeatureFlag, 'enabled'>> = {
  aiChatbot: {
    name: 'AI Teaching Assistant',
    description: 'Interactive student chatbot with context awareness',
  },
  lessonGenerator: {
    name: 'Lesson Synthesizer',
    description: 'Auto-generate lessons from curriculum documents',
  },
  translation: {
    name: 'Real-time Translation',
    description: '40+ languages for global accessibility',
  },
  analyticsV2: {
    name: 'Analytics V2',
    description: 'Enhanced analytics dashboard with new visualizations',
  },
  exportPipelines: {
    name: 'Export Pipelines',
    description: 'PDF, Excel, Word export with custom templates',
  },
  adaptiveDifficulty: {
    name: 'Adaptive Difficulty',
    description: 'AI-powered difficulty adjustment based on student performance',
  },
}

/**
 * Get all feature flags with their current status
 */
export function getAllFeatureFlags(): Record<FeatureFlagKey, FeatureFlag> {
  const envFlags = getFeatureFlags()

  return {
    aiChatbot: {
      ...featureFlagDefinitions.aiChatbot,
      enabled: envFlags.ENABLE_AI_CHATBOT,
    },
    lessonGenerator: {
      ...featureFlagDefinitions.lessonGenerator,
      enabled: envFlags.ENABLE_LESSON_GENERATOR,
    },
    translation: {
      ...featureFlagDefinitions.translation,
      enabled: envFlags.ENABLE_TRANSLATION,
    },
    analyticsV2: {
      ...featureFlagDefinitions.analyticsV2,
      enabled: true, // Always enabled
    },
    exportPipelines: {
      ...featureFlagDefinitions.exportPipelines,
      enabled: true, // Always enabled
    },
    adaptiveDifficulty: {
      ...featureFlagDefinitions.adaptiveDifficulty,
      enabled: true, // Always enabled
    },
  }
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(flagKey: FeatureFlagKey): boolean {
  const flags = getAllFeatureFlags()
  return flags[flagKey]?.enabled ?? false
}

/**
 * Check if feature is enabled for a specific organization
 */
export function isFeatureEnabledForOrganization(
  flagKey: FeatureFlagKey,
  organizationId: string
): boolean {
  const flags = getAllFeatureFlags()
  const flag = flags[flagKey]

  if (!flag) return false
  if (!flag.enabled) return false

  // If no organization restrictions, feature is enabled for all
  if (!flag.enabledForOrganizations || flag.enabledForOrganizations.length === 0) {
    return true
  }

  return flag.enabledForOrganizations.includes(organizationId)
}

/**
 * Check if feature is enabled for a specific profile/user
 */
export function isFeatureEnabledForProfile(flagKey: FeatureFlagKey, profileId: string): boolean {
  const flags = getAllFeatureFlags()
  const flag = flags[flagKey]

  if (!flag) return false
  if (!flag.enabled) return false

  // If no profile restrictions, feature is enabled for all
  if (!flag.enabledForProfiles || flag.enabledForProfiles.length === 0) {
    return true
  }

  return flag.enabledForProfiles.includes(profileId)
}

/**
 * Feature flag hook for React components
 * Returns a function to check feature availability
 */
export function createFeatureFlagChecker(context?: {
  organizationId?: string
  profileId?: string
}) {
  return (flagKey: FeatureFlagKey): boolean => {
    // First check global flag
    if (!isFeatureEnabled(flagKey)) return false

    // Check organization-specific if context provided
    if (context?.organizationId) {
      if (!isFeatureEnabledForOrganization(flagKey, context.organizationId)) {
        return false
      }
    }

    // Check profile-specific if context provided
    if (context?.profileId) {
      if (!isFeatureEnabledForProfile(flagKey, context.profileId)) {
        return false
      }
    }

    return true
  }
}
