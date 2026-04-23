/**
 * Feature flag configuration for Eduator AI
 * Provides runtime feature toggles for gradual rollout
 */
export interface FeatureFlag {
    name: string;
    description: string;
    enabled: boolean;
    rolloutPercentage?: number;
    enabledForOrganizations?: string[];
    enabledForProfiles?: string[];
}
export type FeatureFlagKey = 'aiChatbot' | 'lessonGenerator' | 'translation' | 'analyticsV2' | 'exportPipelines' | 'adaptiveDifficulty';
/**
 * Get all feature flags with their current status
 */
export declare function getAllFeatureFlags(): Record<FeatureFlagKey, FeatureFlag>;
/**
 * Check if a specific feature is enabled
 */
export declare function isFeatureEnabled(flagKey: FeatureFlagKey): boolean;
/**
 * Check if feature is enabled for a specific organization
 */
export declare function isFeatureEnabledForOrganization(flagKey: FeatureFlagKey, organizationId: string): boolean;
/**
 * Check if feature is enabled for a specific profile/user
 */
export declare function isFeatureEnabledForProfile(flagKey: FeatureFlagKey, profileId: string): boolean;
/**
 * Feature flag hook for React components
 * Returns a function to check feature availability
 */
export declare function createFeatureFlagChecker(context?: {
    organizationId?: string;
    profileId?: string;
}): (flagKey: FeatureFlagKey) => boolean;
//# sourceMappingURL=feature-flags.d.ts.map