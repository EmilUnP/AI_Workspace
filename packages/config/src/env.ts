import { z } from 'zod'

/**
 * Environment variable validation schemas
 */

// Server-side environment variables
const serverEnvSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Google Gemini AI
  GOOGLE_GENERATIVE_AI_KEY: z.string().min(1),

  // API Server
  API_PORT: z.string().default('4000'),
  API_HOST: z.string().default('localhost'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // JWT
  JWT_SECRET: z.string().min(32).optional(),

  // Rate Limiting
  RATE_LIMIT_MAX: z.string().default('100'),
  RATE_LIMIT_WINDOW: z.string().default('60000'),
})

// Client-side environment variables (must be prefixed with NEXT_PUBLIC_)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
  NEXT_PUBLIC_ERP_URL: z.string().url().default('http://localhost:3001'),
})

// Feature flags schema
const featureFlagsSchema = z.object({
  ENABLE_AI_CHATBOT: z.string().transform((v) => v === 'true').default('true'),
  ENABLE_LESSON_GENERATOR: z.string().transform((v) => v === 'true').default('false'),
  ENABLE_TRANSLATION: z.string().transform((v) => v === 'true').default('false'),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>
export type ClientEnv = z.infer<typeof clientEnvSchema>
export type FeatureFlags = z.infer<typeof featureFlagsSchema>

/**
 * Validates and returns server environment variables
 * Call this at server startup
 */
export function validateServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env)

  if (!result.success) {
    console.error('❌ Invalid server environment variables:')
    console.error(result.error.format())
    throw new Error('Invalid server environment configuration')
  }

  return result.data
}

/**
 * Validates and returns client environment variables
 * Safe to use in browser
 */
export function validateClientEnv(): ClientEnv {
  const result = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_ERP_URL: process.env.NEXT_PUBLIC_ERP_URL,
  })

  if (!result.success) {
    console.error('❌ Invalid client environment variables:')
    console.error(result.error.format())
    throw new Error('Invalid client environment configuration')
  }

  return result.data
}

/**
 * Get feature flags from environment
 */
export function getFeatureFlags(): FeatureFlags {
  const result = featureFlagsSchema.safeParse({
    ENABLE_AI_CHATBOT: process.env.ENABLE_AI_CHATBOT,
    ENABLE_LESSON_GENERATOR: process.env.ENABLE_LESSON_GENERATOR,
    ENABLE_TRANSLATION: process.env.ENABLE_TRANSLATION,
  })

  if (!result.success) {
    // Return defaults if parsing fails
    return {
      ENABLE_AI_CHATBOT: true,
      ENABLE_LESSON_GENERATOR: false,
      ENABLE_TRANSLATION: false,
    }
  }

  return result.data
}

/**
 * Helper to get environment variable with fallback
 */
export function getEnv(key: string, fallback?: string): string {
  const value = process.env[key]
  if (value === undefined) {
    if (fallback !== undefined) return fallback
    throw new Error(`Missing environment variable: ${key}`)
  }
  return value
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test'
}
