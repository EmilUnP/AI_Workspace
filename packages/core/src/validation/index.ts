// Profile Validation
export * from './profile'

// Exam Validation
export * from './exam'

// Common validation utilities
import { z } from 'zod'

/**
 * Common validation schemas
 */

export const uuidSchema = z.string().uuid()

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  per_page: z.coerce.number().min(1).max(100).default(20),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
})

export const searchSchema = paginationSchema.extend({
  query: z.string().min(1).max(200).optional(),
  filters: z.record(z.unknown()).optional(),
})

export const dateRangeSchema = z.object({
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
})

export const fileUploadSchema = z.object({
  file: z.instanceof(File).optional(),
  path: z.string().optional(),
  bucket: z.string().optional(),
})

/**
 * Validation helper functions
 */

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  errors?: z.ZodError['errors']
} {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  return { success: false, errors: result.error.errors }
}

export function formatZodErrors(errors: z.ZodError['errors']): Record<string, string> {
  const formatted: Record<string, string> = {}
  
  for (const error of errors) {
    const path = error.path.join('.')
    formatted[path] = error.message
  }
  
  return formatted
}
