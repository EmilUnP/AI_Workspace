"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateServerEnv = validateServerEnv;
exports.validateClientEnv = validateClientEnv;
exports.getFeatureFlags = getFeatureFlags;
exports.getEnv = getEnv;
exports.isDevelopment = isDevelopment;
exports.isProduction = isProduction;
exports.isTest = isTest;
const zod_1 = require("zod");
/**
 * Environment variable validation schemas
 */
// Server-side environment variables
const serverEnvSchema = zod_1.z.object({
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: zod_1.z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: zod_1.z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().min(1),
    // Google Gemini AI
    GOOGLE_GENERATIVE_AI_KEY: zod_1.z.string().min(1),
    // API Server
    API_PORT: zod_1.z.string().default('4000'),
    API_HOST: zod_1.z.string().default('localhost'),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: zod_1.z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    // JWT
    JWT_SECRET: zod_1.z.string().min(32).optional(),
    // Rate Limiting
    RATE_LIMIT_MAX: zod_1.z.string().default('100'),
    RATE_LIMIT_WINDOW: zod_1.z.string().default('60000'),
});
// Client-side environment variables (must be prefixed with NEXT_PUBLIC_)
const clientEnvSchema = zod_1.z.object({
    NEXT_PUBLIC_SUPABASE_URL: zod_1.z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: zod_1.z.string().min(1),
    NEXT_PUBLIC_API_URL: zod_1.z.string().url().default('http://localhost:4000'),
    NEXT_PUBLIC_ERP_URL: zod_1.z.string().url().default('http://localhost:3001'),
});
// Feature flags schema
const featureFlagsSchema = zod_1.z.object({
    ENABLE_AI_CHATBOT: zod_1.z.string().transform((v) => v === 'true').default('true'),
    ENABLE_LESSON_GENERATOR: zod_1.z.string().transform((v) => v === 'true').default('false'),
    ENABLE_TRANSLATION: zod_1.z.string().transform((v) => v === 'true').default('false'),
});
/**
 * Validates and returns server environment variables
 * Call this at server startup
 */
function validateServerEnv() {
    const result = serverEnvSchema.safeParse(process.env);
    if (!result.success) {
        console.error('❌ Invalid server environment variables:');
        console.error(result.error.format());
        throw new Error('Invalid server environment configuration');
    }
    return result.data;
}
/**
 * Validates and returns client environment variables
 * Safe to use in browser
 */
function validateClientEnv() {
    const result = clientEnvSchema.safeParse({
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        NEXT_PUBLIC_ERP_URL: process.env.NEXT_PUBLIC_ERP_URL,
    });
    if (!result.success) {
        console.error('❌ Invalid client environment variables:');
        console.error(result.error.format());
        throw new Error('Invalid client environment configuration');
    }
    return result.data;
}
/**
 * Get feature flags from environment
 */
function getFeatureFlags() {
    const result = featureFlagsSchema.safeParse({
        ENABLE_AI_CHATBOT: process.env.ENABLE_AI_CHATBOT,
        ENABLE_LESSON_GENERATOR: process.env.ENABLE_LESSON_GENERATOR,
        ENABLE_TRANSLATION: process.env.ENABLE_TRANSLATION,
    });
    if (!result.success) {
        // Return defaults if parsing fails
        return {
            ENABLE_AI_CHATBOT: true,
            ENABLE_LESSON_GENERATOR: false,
            ENABLE_TRANSLATION: false,
        };
    }
    return result.data;
}
/**
 * Helper to get environment variable with fallback
 */
function getEnv(key, fallback) {
    const value = process.env[key];
    if (value === undefined) {
        if (fallback !== undefined)
            return fallback;
        throw new Error(`Missing environment variable: ${key}`);
    }
    return value;
}
/**
 * Check if running in development mode
 */
function isDevelopment() {
    return process.env.NODE_ENV === 'development';
}
/**
 * Check if running in production mode
 */
function isProduction() {
    return process.env.NODE_ENV === 'production';
}
/**
 * Check if running in test mode
 */
function isTest() {
    return process.env.NODE_ENV === 'test';
}
//# sourceMappingURL=env.js.map