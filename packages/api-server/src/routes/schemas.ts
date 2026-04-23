/**
 * Shared OpenAPI schemas for API documentation
 */

// Error response schema
export const errorSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'ERROR_CODE' },
        message: { type: 'string', example: 'Error message description' },
        details: { type: 'array', items: { type: 'object' } },
      },
    },
  },
}

// Profile schema
export const profileSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    user_id: { type: 'string', format: 'uuid' },
    profile_type: { type: 'string', enum: ['platform_owner', 'school_superadmin', 'teacher'] },
    organization_id: { type: 'string', format: 'uuid', nullable: true },
    full_name: { type: 'string', example: 'John Doe' },
    email: { type: 'string', format: 'email', example: 'john@example.com' },
    avatar_url: { type: 'string', format: 'uri', nullable: true },
    phone: { type: 'string', nullable: true },
    approval_status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
    is_active: { type: 'boolean' },
    metadata: { type: 'object' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
}

// Organization schema
export const organizationSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Springfield Elementary' },
    slug: { type: 'string', example: 'springfield-elementary' },
    type: { type: 'string', enum: ['school', 'university', 'institution', 'academy', 'other'] },
    email: { type: 'string', format: 'email' },
    phone: { type: 'string', nullable: true },
    address: { type: 'string', nullable: true },
    city: { type: 'string', nullable: true },
    country: { type: 'string', nullable: true },
    website: { type: 'string', format: 'uri', nullable: true },
    logo_url: { type: 'string', format: 'uri', nullable: true },
    subscription_plan: { type: 'string', enum: ['basic', 'premium', 'enterprise'] },
    status: { type: 'string', enum: ['active', 'suspended', 'inactive'] },
    settings: { type: 'object' },
    metadata: { type: 'object' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
}

// Class schema
export const classSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    organization_id: { type: 'string', format: 'uuid' },
    teacher_id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Math 101' },
    description: { type: 'string', nullable: true },
    subject: { type: 'string', nullable: true },
    grade_level: { type: 'string', nullable: true },
    academic_year: { type: 'string', nullable: true },
    semester: { type: 'string', nullable: true },
    class_code: { type: 'string', example: 'ABC123' },
    is_active: { type: 'boolean' },
    settings: { type: 'object' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
}

// Pagination schema
export const paginationSchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', example: 1 },
    per_page: { type: 'integer', example: 20 },
    total: { type: 'integer', example: 100 },
    total_pages: { type: 'integer', example: 5 },
    has_next: { type: 'boolean' },
    has_prev: { type: 'boolean' },
  },
}

// Success response wrapper
export function successResponse(dataSchema: object, description = 'Successful response') {
  return {
    description,
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: dataSchema,
    },
  }
}

// Paginated response wrapper
export function paginatedResponse(itemSchema: object, description = 'Paginated response') {
  return {
    description,
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          items: { type: 'array', items: itemSchema },
          pagination: paginationSchema,
        },
      },
    },
  }
}

// Message response wrapper
export function messageResponse(description = 'Success message') {
  return {
    description,
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string' },
    },
  }
}
