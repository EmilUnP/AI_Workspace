import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { authMiddleware } from '../../middleware/auth'
import { profileRepository } from '@eduator/db'
import { updateProfileSchema } from '@eduator/core/validation/profile'
import type { UpdateProfileInput } from '@eduator/core/types/profile'

// Common response schemas
const profileSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    user_id: { type: 'string', format: 'uuid' },
    profile_type: { type: 'string', enum: ['platform_owner', 'school_superadmin', 'teacher'] },
    organization_id: { type: 'string', format: 'uuid', nullable: true },
    full_name: { type: 'string', example: 'John Doe' },
    email: { type: 'string', format: 'email', example: 'john@example.com' },
    avatar_url: { type: 'string', nullable: true },
    phone: { type: 'string', nullable: true },
    approval_status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
    is_active: { type: 'boolean' },
    metadata: { type: 'object' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
}

const errorSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'NOT_FOUND' },
        message: { type: 'string', example: 'Profile not found' },
        details: { type: 'array', items: { type: 'object' } },
      },
    },
  },
}

/**
 * Profile routes - User profile management
 */
export async function profileRoutes(fastify: FastifyInstance): Promise<void> {
  // Get current user's profile
  fastify.get('/', {
    preHandler: authMiddleware,
    schema: {
      summary: 'Get Current User Profile',
      description: 'Retrieve the authenticated user\'s profile including organization details',
      tags: ['Profile'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Profile retrieved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              ...profileSchema,
              properties: {
                ...profileSchema.properties,
                organization: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    type: { type: 'string' },
                    subscription_plan: { type: 'string' },
                    status: { type: 'string' },
                    settings: { type: 'object' },
                  },
                },
              },
            },
          },
        },
        401: {
          description: 'Unauthorized - Invalid or missing token',
          ...errorSchema,
        },
        404: {
          description: 'Profile not found',
          ...errorSchema,
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const profile = await profileRepository.getByIdWithOrganization(request.user!.profile!.id)

    if (!profile) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Profile not found' },
      })
    }

    return reply.send({
      success: true,
      data: profile,
    })
  })

  // Update current user's profile
  fastify.put('/', {
    preHandler: authMiddleware,
    schema: {
      summary: 'Update Current User Profile',
      description: 'Update the authenticated user\'s profile information',
      tags: ['Profile'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          full_name: { type: 'string', minLength: 2, maxLength: 100 },
          phone: { type: 'string', maxLength: 20 },
          avatar_url: { type: 'string', format: 'uri' },
          metadata: { 
            type: 'object',
            description: 'Additional user metadata',
          },
        },
      },
      response: {
        200: {
          description: 'Profile updated successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: profileSchema,
          },
        },
        400: {
          description: 'Validation error',
          ...errorSchema,
        },
        401: {
          description: 'Unauthorized',
          ...errorSchema,
        },
        500: {
          description: 'Update failed',
          ...errorSchema,
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const profileId = request.user!.profile!.id

    const validation = updateProfileSchema.safeParse(request.body as UpdateProfileInput)
    if (!validation.success) {
      return reply.code(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: validation.error.errors,
        },
      })
    }

    const updated = await profileRepository.update(profileId, validation.data)

    if (!updated) {
      return reply.code(500).send({
        success: false,
        error: { code: 'UPDATE_FAILED', message: 'Failed to update profile' },
      })
    }

    return reply.send({
      success: true,
      data: updated,
    })
  })
}
