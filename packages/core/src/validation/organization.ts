import { z } from 'zod'
import { ORGANIZATION_TYPES, SUBSCRIPTION_PLANS, ORGANIZATION_STATUS } from '@eduator/config'

/**
 * Organization Validation Schemas
 */

export const organizationSettingsSchema = z.object({
  max_teachers: z.number().min(-1).optional(),
  max_students: z.number().min(-1).optional(),
  max_exams_per_month: z.number().min(-1).optional(),
  ai_requests_per_month: z.number().min(-1).optional(),
  storage_limit_gb: z.number().min(1).optional(),
  features_enabled: z.array(z.string()).optional(),
  branding: z
    .object({
      primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      custom_domain: z.string().url().optional(),
    })
    .optional(),
})

export const organizationMetadataSchema = z.object({
  founded_year: z.number().min(1800).max(2100).optional(),
  student_count_range: z.string().optional(),
  accreditation: z.array(z.string()).optional(),
  timezone: z.string().optional(),
  academic_year_start: z.string().optional(),
  academic_year_end: z.string().optional(),
})

export const createOrganizationSchema = z.object({
  name: z.string().min(3).max(100),
  type: z.enum([
    ORGANIZATION_TYPES.SCHOOL,
    ORGANIZATION_TYPES.UNIVERSITY,
    ORGANIZATION_TYPES.INSTITUTION,
    ORGANIZATION_TYPES.ACADEMY,
    ORGANIZATION_TYPES.OTHER,
  ]),
  email: z.string().email(),
  phone: z.string().max(20).nullable().optional(),
  address: z.string().max(200).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  website: z.string().url().nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
  subscription_plan: z
    .enum([SUBSCRIPTION_PLANS.BASIC, SUBSCRIPTION_PLANS.PREMIUM, SUBSCRIPTION_PLANS.ENTERPRISE])
    .optional(),
  settings: organizationSettingsSchema.optional(),
  metadata: organizationMetadataSchema.optional(),
})

export const updateOrganizationSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  type: z
    .enum([
      ORGANIZATION_TYPES.SCHOOL,
      ORGANIZATION_TYPES.UNIVERSITY,
      ORGANIZATION_TYPES.INSTITUTION,
      ORGANIZATION_TYPES.ACADEMY,
      ORGANIZATION_TYPES.OTHER,
    ])
    .optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).nullable().optional(),
  address: z.string().max(200).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  website: z.string().url().nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
  subscription_plan: z
    .enum([SUBSCRIPTION_PLANS.BASIC, SUBSCRIPTION_PLANS.PREMIUM, SUBSCRIPTION_PLANS.ENTERPRISE])
    .optional(),
  status: z
    .enum([
      ORGANIZATION_STATUS.ACTIVE,
      ORGANIZATION_STATUS.SUSPENDED,
      ORGANIZATION_STATUS.INACTIVE,
    ])
    .optional(),
  settings: organizationSettingsSchema.optional(),
  metadata: organizationMetadataSchema.optional(),
})

// Types are exported from @eduator/core/types/organization
// These schemas are for runtime validation only
