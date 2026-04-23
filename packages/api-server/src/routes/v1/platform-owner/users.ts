import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { profileRepository } from '@eduator/db'
import type { ApprovalStatus } from '@eduator/config'
import { profileSchema, errorSchema, paginatedResponse, successResponse, messageResponse } from '../../schemas'

/**
 * User management routes for Platform Owner
 */
export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  // List all users
  fastify.get('/', {
    schema: {
      summary: 'List All Users',
      description: 'Retrieve a paginated list of all users across the platform with optional filters',
      tags: ['Platform Owner', 'Users'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1, minimum: 1, description: 'Page number' },
          per_page: { type: 'integer', default: 20, minimum: 1, maximum: 100, description: 'Items per page' },
          profile_type: { 
            type: 'string', 
            enum: ['platform_owner', 'school_superadmin', 'teacher'],
            description: 'Filter by user role',
          },
          approval_status: { 
            type: 'string', 
            enum: ['pending', 'approved', 'rejected'],
            description: 'Filter by approval status',
          },
          organization_id: { 
            type: 'string', 
            format: 'uuid',
            description: 'Filter by organization',
          },
        },
      },
      response: {
        200: paginatedResponse(profileSchema, 'Paginated list of users'),
        401: { description: 'Unauthorized', ...errorSchema },
        403: { description: 'Forbidden - Platform owner role required', ...errorSchema },
      },
    },
  }, async (request: FastifyRequest<{
    Querystring: {
      page?: number
      per_page?: number
      profile_type?: string
      approval_status?: ApprovalStatus
      organization_id?: string
    }
  }>, reply: FastifyReply) => {
    const { page = 1, per_page = 20, profile_type, approval_status, organization_id } = request.query

    const { data, count } = await profileRepository.getAll({
      page,
      perPage: per_page,
      profileType: profile_type,
      approvalStatus: approval_status,
      organizationId: organization_id,
    })

    return reply.send({
      success: true,
      data: {
        items: data,
        pagination: {
          page,
          per_page,
          total: count,
          total_pages: Math.ceil(count / per_page),
          has_next: page * per_page < count,
          has_prev: page > 1,
        },
      },
    })
  })

  // Get pending approval count
  fastify.get('/pending-count', {
    schema: {
      summary: 'Get Pending Approval Count',
      description: 'Get the total count of users awaiting approval',
      tags: ['Platform Owner', 'Users'],
      security: [{ bearerAuth: [] }],
      response: {
        200: successResponse({
          type: 'object',
          properties: {
            pending_count: { type: 'integer', example: 5 },
          },
        }, 'Pending count retrieved'),
        401: { description: 'Unauthorized', ...errorSchema },
      },
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const count = await profileRepository.getPendingCount()

    return reply.send({
      success: true,
      data: { pending_count: count },
    })
  })

  // Search users
  fastify.get('/search', {
    schema: {
      summary: 'Search Users',
      description: 'Search users by name or email (minimum 2 characters)',
      tags: ['Platform Owner', 'Users'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', minLength: 2, description: 'Search query' },
        },
        required: ['q'],
      },
      response: {
        200: successResponse({ type: 'array', items: profileSchema }, 'Search results'),
        400: { description: 'Search query too short', ...errorSchema },
        401: { description: 'Unauthorized', ...errorSchema },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { q: string } }>, reply: FastifyReply) => {
    const { q } = request.query

    if (!q || q.length < 2) {
      return reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Search query must be at least 2 characters' },
      })
    }

    const results = await profileRepository.search(q)

    return reply.send({
      success: true,
      data: results,
    })
  })

  // Get single user
  fastify.get('/:id', {
    schema: {
      summary: 'Get User by ID',
      description: 'Retrieve detailed information about a specific user including their organization',
      tags: ['Platform Owner', 'Users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { 
          id: { type: 'string', format: 'uuid', description: 'User profile ID' },
        },
        required: ['id'],
      },
      response: {
        200: successResponse({
          ...profileSchema,
          properties: {
            ...profileSchema.properties,
            organization: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                type: { type: 'string' },
                subscription_plan: { type: 'string' },
                status: { type: 'string' },
              },
            },
          },
        }, 'User details retrieved'),
        401: { description: 'Unauthorized', ...errorSchema },
        404: { description: 'User not found', ...errorSchema },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params

    const profile = await profileRepository.getByIdWithOrganization(id)

    if (!profile) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      })
    }

    return reply.send({
      success: true,
      data: profile,
    })
  })

  // Approve user
  fastify.patch('/:id/approve', {
    schema: {
      summary: 'Approve User',
      description: 'Approve a pending user registration, allowing them to access the platform',
      tags: ['Platform Owner', 'Users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { 
          id: { type: 'string', format: 'uuid', description: 'User profile ID' },
        },
        required: ['id'],
      },
      response: {
        200: {
          description: 'User approved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: profileSchema,
            message: { type: 'string', example: 'User approved successfully' },
          },
        },
        401: { description: 'Unauthorized', ...errorSchema },
        404: { description: 'User not found', ...errorSchema },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params

    const profile = await profileRepository.updateApprovalStatus(id, 'approved')

    if (!profile) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      })
    }

    request.log.info({ userId: id, action: 'approve' }, 'User approved')

    return reply.send({
      success: true,
      data: profile,
      message: 'User approved successfully',
    })
  })

  // Reject user
  fastify.patch('/:id/reject', {
    schema: {
      summary: 'Reject User',
      description: 'Reject a pending user registration with optional reason',
      tags: ['Platform Owner', 'Users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { 
          id: { type: 'string', format: 'uuid', description: 'User profile ID' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          reason: { 
            type: 'string', 
            description: 'Rejection reason (optional)',
          },
        },
      },
      response: {
        200: {
          description: 'User rejected',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: profileSchema,
            message: { type: 'string', example: 'User rejected' },
          },
        },
        401: { description: 'Unauthorized', ...errorSchema },
        404: { description: 'User not found', ...errorSchema },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: { reason?: string } }>, reply: FastifyReply) => {
    const { id } = request.params
    const { reason } = request.body

    const profile = await profileRepository.updateApprovalStatus(id, 'rejected')

    if (!profile) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      })
    }

    request.log.info({ userId: id, action: 'reject', reason }, 'User rejected')

    return reply.send({
      success: true,
      data: profile,
      message: 'User rejected',
    })
  })

  // Suspend user
  fastify.patch('/:id/suspend', {
    schema: {
      summary: 'Suspend User',
      description: 'Deactivate a user account, preventing them from accessing the platform',
      tags: ['Platform Owner', 'Users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { 
          id: { type: 'string', format: 'uuid', description: 'User profile ID' },
        },
        required: ['id'],
      },
      response: {
        200: messageResponse('User suspended successfully'),
        401: { description: 'Unauthorized', ...errorSchema },
        404: { description: 'User not found', ...errorSchema },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params

    const success = await profileRepository.deactivate(id)

    if (!success) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      })
    }

    request.log.info({ userId: id, action: 'suspend' }, 'User suspended')

    return reply.send({
      success: true,
      message: 'User suspended successfully',
    })
  })

  // Delete user
  fastify.delete('/:id', {
    schema: {
      summary: 'Delete User',
      description: 'Permanently delete a user account and all associated data',
      tags: ['Platform Owner', 'Users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { 
          id: { type: 'string', format: 'uuid', description: 'User profile ID' },
        },
        required: ['id'],
      },
      response: {
        200: messageResponse('User deleted successfully'),
        401: { description: 'Unauthorized', ...errorSchema },
        404: { description: 'User not found', ...errorSchema },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params

    const success = await profileRepository.delete(id)

    if (!success) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      })
    }

    request.log.info({ userId: id, action: 'delete' }, 'User deleted')

    return reply.send({
      success: true,
      message: 'User deleted successfully',
    })
  })
}
