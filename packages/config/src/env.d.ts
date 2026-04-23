import { z } from 'zod';
/**
 * Environment variable validation schemas
 */
declare const serverEnvSchema: z.ZodObject<{
    NEXT_PUBLIC_SUPABASE_URL: z.ZodString;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.ZodString;
    SUPABASE_SERVICE_ROLE_KEY: z.ZodString;
    GOOGLE_GENERATIVE_AI_KEY: z.ZodString;
    API_PORT: z.ZodDefault<z.ZodString>;
    API_HOST: z.ZodDefault<z.ZodString>;
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["fatal", "error", "warn", "info", "debug", "trace"]>>;
    JWT_SECRET: z.ZodOptional<z.ZodString>;
    RATE_LIMIT_MAX: z.ZodDefault<z.ZodString>;
    RATE_LIMIT_WINDOW: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NEXT_PUBLIC_SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    GOOGLE_GENERATIVE_AI_KEY: string;
    API_PORT: string;
    API_HOST: string;
    NODE_ENV: "development" | "production" | "test";
    LOG_LEVEL: "error" | "fatal" | "warn" | "info" | "debug" | "trace";
    RATE_LIMIT_MAX: string;
    RATE_LIMIT_WINDOW: string;
    JWT_SECRET?: string | undefined;
}, {
    NEXT_PUBLIC_SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    GOOGLE_GENERATIVE_AI_KEY: string;
    API_PORT?: string | undefined;
    API_HOST?: string | undefined;
    NODE_ENV?: "development" | "production" | "test" | undefined;
    LOG_LEVEL?: "error" | "fatal" | "warn" | "info" | "debug" | "trace" | undefined;
    JWT_SECRET?: string | undefined;
    RATE_LIMIT_MAX?: string | undefined;
    RATE_LIMIT_WINDOW?: string | undefined;
}>;
declare const clientEnvSchema: z.ZodObject<{
    NEXT_PUBLIC_SUPABASE_URL: z.ZodString;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.ZodString;
    NEXT_PUBLIC_API_URL: z.ZodDefault<z.ZodString>;
    NEXT_PUBLIC_ERP_URL: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    NEXT_PUBLIC_API_URL: string;
    NEXT_PUBLIC_ERP_URL: string;
}, {
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    NEXT_PUBLIC_API_URL?: string | undefined;
    NEXT_PUBLIC_ERP_URL?: string | undefined;
}>;
declare const featureFlagsSchema: z.ZodObject<{
    ENABLE_AI_CHATBOT: z.ZodDefault<z.ZodEffects<z.ZodString, boolean, string>>;
    ENABLE_LESSON_GENERATOR: z.ZodDefault<z.ZodEffects<z.ZodString, boolean, string>>;
    ENABLE_TRANSLATION: z.ZodDefault<z.ZodEffects<z.ZodString, boolean, string>>;
}, "strip", z.ZodTypeAny, {
    ENABLE_AI_CHATBOT: boolean;
    ENABLE_LESSON_GENERATOR: boolean;
    ENABLE_TRANSLATION: boolean;
}, {
    ENABLE_AI_CHATBOT?: string | undefined;
    ENABLE_LESSON_GENERATOR?: string | undefined;
    ENABLE_TRANSLATION?: string | undefined;
}>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type FeatureFlags = z.infer<typeof featureFlagsSchema>;
/**
 * Validates and returns server environment variables
 * Call this at server startup
 */
export declare function validateServerEnv(): ServerEnv;
/**
 * Validates and returns client environment variables
 * Safe to use in browser
 */
export declare function validateClientEnv(): ClientEnv;
/**
 * Get feature flags from environment
 */
export declare function getFeatureFlags(): FeatureFlags;
/**
 * Helper to get environment variable with fallback
 */
export declare function getEnv(key: string, fallback?: string): string;
/**
 * Check if running in development mode
 */
export declare function isDevelopment(): boolean;
/**
 * Check if running in production mode
 */
export declare function isProduction(): boolean;
/**
 * Check if running in test mode
 */
export declare function isTest(): boolean;
export {};
//# sourceMappingURL=env.d.ts.map