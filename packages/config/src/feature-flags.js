"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllFeatureFlags = getAllFeatureFlags;
exports.isFeatureEnabled = isFeatureEnabled;
exports.isFeatureEnabledForOrganization = isFeatureEnabledForOrganization;
exports.isFeatureEnabledForProfile = isFeatureEnabledForProfile;
exports.createFeatureFlagChecker = createFeatureFlagChecker;
const env_1 = require("./env");
/**
 * Feature flag definitions
 */
const featureFlagDefinitions = {
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
};
/**
 * Get all feature flags with their current status
 */
function getAllFeatureFlags() {
    const envFlags = (0, env_1.getFeatureFlags)();
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
    };
}
/**
 * Check if a specific feature is enabled
 */
function isFeatureEnabled(flagKey) {
    const flags = getAllFeatureFlags();
    return flags[flagKey]?.enabled ?? false;
}
/**
 * Check if feature is enabled for a specific organization
 */
function isFeatureEnabledForOrganization(flagKey, organizationId) {
    const flags = getAllFeatureFlags();
    const flag = flags[flagKey];
    if (!flag)
        return false;
    if (!flag.enabled)
        return false;
    // If no organization restrictions, feature is enabled for all
    if (!flag.enabledForOrganizations || flag.enabledForOrganizations.length === 0) {
        return true;
    }
    return flag.enabledForOrganizations.includes(organizationId);
}
/**
 * Check if feature is enabled for a specific profile/user
 */
function isFeatureEnabledForProfile(flagKey, profileId) {
    const flags = getAllFeatureFlags();
    const flag = flags[flagKey];
    if (!flag)
        return false;
    if (!flag.enabled)
        return false;
    // If no profile restrictions, feature is enabled for all
    if (!flag.enabledForProfiles || flag.enabledForProfiles.length === 0) {
        return true;
    }
    return flag.enabledForProfiles.includes(profileId);
}
/**
 * Feature flag hook for React components
 * Returns a function to check feature availability
 */
function createFeatureFlagChecker(context) {
    return (flagKey) => {
        // First check global flag
        if (!isFeatureEnabled(flagKey))
            return false;
        // Check organization-specific if context provided
        if (context?.organizationId) {
            if (!isFeatureEnabledForOrganization(flagKey, context.organizationId)) {
                return false;
            }
        }
        // Check profile-specific if context provided
        if (context?.profileId) {
            if (!isFeatureEnabledForProfile(flagKey, context.profileId)) {
                return false;
            }
        }
        return true;
    };
}
//# sourceMappingURL=feature-flags.js.map