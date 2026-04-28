import { z } from 'zod'
import { PROFILE_TYPES, APPROVAL_STATUS } from '@eduator/config'

/**
 * Profile Validation Schemas
 */

export const profileMetadataSchema = z.object({
  bio: z.string().max(500).optional(),
  department: z.string().max(100).optional(),
  subject_areas: z.array(z.string()).optional(),
  grade_levels: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  years_of_experience: z.number().min(0).max(50).optional(),
  preferred_language: z.string().length(2).optional(),
  timezone: z.string().optional(),
  notifications_enabled: z.boolean().optional(),
  api_integration_enabled: z.boolean().optional(),
})

export const createProfileSchema = z.object({
  user_id: z.string().uuid(),
  profile_type: z.enum([
    PROFILE_TYPES.PLATFORM_OWNER,
    PROFILE_TYPES.SCHOOL_SUPERADMIN,
    PROFILE_TYPES.TEACHER,
  ]),
  full_name: z.string().min(2).max(100),
  email: z.string().email(),
  avatar_url: z.string().url().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  metadata: profileMetadataSchema.nullable().optional(),
})

export const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  avatar_url: z.string().url().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  metadata: profileMetadataSchema.nullable().optional(),
})

export const approvalStatusSchema = z.enum([
  APPROVAL_STATUS.PENDING,
  APPROVAL_STATUS.APPROVED,
  APPROVAL_STATUS.REJECTED,
])

export const updateApprovalStatusSchema = z.object({
  approval_status: approvalStatusSchema,
  rejection_reason: z.string().max(500).optional(),
})

// Types are exported from @eduator/core/types/profile
// These schemas are for runtime validation only
export type UpdateApprovalStatusInput = z.infer<typeof updateApprovalStatusSchema>
