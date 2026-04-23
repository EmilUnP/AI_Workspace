import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { organizationRepository } from '@eduator/db'
import { createOrganizationSchema, updateOrganizationSchema } from '@eduator/core/validation/organization'
import type { CreateOrganizationInput, UpdateOrganizationInput } from '@eduator/core/types/organization'
import { organizationSchema, errorSchema, paginatedResponse, successResponse, messageResponse } from '../../schemas'

/**
 * Organization management routes for Platform Owner
 */
export async function organizationRoutes(fastify: FastifyInstance): Promise<void> {
  // List all organizations
  fastify.get('/', {
    schema: {
      summary: 'List All Organizations',
      description: 'Retrieve a paginated list of all organizations with optional filters',
      tags: ['Platform Owner', 'Organizations'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1, minimum: 1, description: 'Page number' },
          per_page: { type: 'integer', default: 20, minimum: 1, maximum: 100, description: 'Items per page' },
          status: { 
            type: 'string', 
            enum: ['active', 'suspended', 'inactive'],
            description: 'Filter by organization status',
          },
          subscription_plan: { 
            type: 'string', 
            enum: ['basic', 'premium', 'enterprise'],
            description: 'Filter by subscription plan',
          },
          search: { 
            type: 'string',
            description: 'Search by organization name or email',
          },
        },
      },
      response: {
        200: paginatedResponse(organizationSchema, 'Paginated list of organizations'),
        401: { description: 'Unauthorized', ...errorSchema },
        403: { description: 'Forbidden - Platform owner role required', ...errorSchema },
      },
    },
  }, async (request: FastifyRequest<{
    Querystring: {
      page?: number
      per_page?: number
      status?: string
      subscription_plan?: string
      search?: string
    }
  }>, reply: FastifyReply) => {
    const { page = 1, per_page = 20, status, subscription_plan, search } = request.query

    const { data, count } = await organizationRepository.getAll({
      page,
      perPage: per_page,
      status: status as 'active' | 'suspended' | 'inactive' | undefined,
      subscriptionPlan: subscription_plan as 'basic' | 'premium' | 'enterprise' | undefined,
      search,
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

  // Get single organization
  fastify.get('/:id', {
    schema: {
      summary: 'Get Organization by ID',
      description: 'Retrieve detailed information about a specific organization including statistics',
      tags: ['Platform Owner', 'Organizations'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Organization ID' },
        },
        required: ['id'],
      },
      response: {
        200: successResponse({
          ...organizationSchema,
          properties: {
            ...organizationSchema.properties,
            stats: {
              type: 'object',
              properties: {
                total_teachers: { type: 'integer' },
                total_students: { type: 'integer' },
                total_classes: { type: 'integer' },
                total_exams: { type: 'integer' },
                storage_used_gb: { type: 'number' },
                ai_requests_used: { type: 'integer' },
              },
            },
          },
        }, 'Organization details with statistics'),
        401: { description: 'Unauthorized', ...errorSchema },
        404: { description: 'Organization not found', ...errorSchema },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params

    const organization = await organizationRepository.getByIdWithStats(id)

    if (!organization) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      })
    }

    return reply.send({
      success: true,
      data: organization,
    })
  })

  // Create organization
  fastify.post('/', {
    schema: {
      summary: 'Create Organization',
      description: 'Create a new organization/school on the platform',
      tags: ['Platform Owner', 'Organizations'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'type', 'email'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          type: { 
            type: 'string', 
            enum: ['school', 'university', 'institution', 'academy', 'other'],
          },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', maxLength: 20 },
          address: { type: 'string' },
          city: { type: 'string' },
          country: { type: 'string' },
          website: { type: 'string', format: 'uri' },
          subscription_plan: { 
            type: 'string', 
            enum: ['basic', 'premium', 'enterprise'],
            default: 'basic',
          },
        },
      },
      response: {
        201: successResponse(organizationSchema, 'Organization created successfully'),
        400: { description: 'Validation error', ...errorSchema },
        401: { description: 'Unauthorized', ...errorSchema },
        500: { description: 'Creation failed', ...errorSchema },
      },
    },
  }, async (request: FastifyRequest<{ Body: CreateOrganizationInput }>, reply: FastifyReply) => {
    const validation = createOrganizationSchema.safeParse(request.body)
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

    const organization = await organizationRepository.create(validation.data)

    if (!organization) {
      return reply.code(500).send({
        success: false,
        error: { code: 'CREATE_FAILED', message: 'Failed to create organization' },
      })
    }

    return reply.code(201).send({
      success: true,
      data: organization,
    })
  })

  // Update organization
  fastify.put('/:id', {
    schema: {
      summary: 'Update Organization',
      description: 'Update an existing organization\'s information',
      tags: ['Platform Owner', 'Organizations'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { 
          id: { type: 'string', format: 'uuid', description: 'Organization ID' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          type: { type: 'string', enum: ['school', 'university', 'institution', 'academy', 'other'] },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          address: { type: 'string' },
          city: { type: 'string' },
          country: { type: 'string' },
          website: { type: 'string', format: 'uri' },
          subscription_plan: { type: 'string', enum: ['basic', 'premium', 'enterprise'] },
          settings: { type: 'object' },
        },
      },
      response: {
        200: successResponse(organizationSchema, 'Organization updated'),
        400: { description: 'Validation error', ...errorSchema },
        401: { description: 'Unauthorized', ...errorSchema },
        404: { description: 'Organization not found', ...errorSchema },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateOrganizationInput }>, reply: FastifyReply) => {
    const { id } = request.params

    const validation = updateOrganizationSchema.safeParse(request.body)
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

    const organization = await organizationRepository.update(id, validation.data)

    if (!organization) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found or update failed' },
      })
    }

    return reply.send({
      success: true,
      data: organization,
    })
  })

  // Delete organization
  fastify.delete('/:id', {
    schema: {
      summary: 'Delete Organization',
      description: 'Permanently delete an organization and all associated data (users, classes, exams)',
      tags: ['Platform Owner', 'Organizations'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { 
          id: { type: 'string', format: 'uuid', description: 'Organization ID' },
        },
        required: ['id'],
      },
      response: {
        200: messageResponse('Organization deleted successfully'),
        401: { description: 'Unauthorized', ...errorSchema },
        404: { description: 'Organization not found', ...errorSchema },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params

    const success = await organizationRepository.delete(id)

    if (!success) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found or deletion failed' },
      })
    }

    return reply.send({
      success: true,
      message: 'Organization deleted successfully',
    })
  })

  // Update organization status
  fastify.patch('/:id/status', {
    schema: {
      summary: 'Update Organization Status',
      description: 'Change the status of an organization (activate, suspend, or deactivate)',
      tags: ['Platform Owner', 'Organizations'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { 
          id: { type: 'string', format: 'uuid', description: 'Organization ID' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { 
            type: 'string', 
            enum: ['active', 'suspended', 'inactive'],
            description: 'New status for the organization',
          },
        },
      },
      response: {
        200: messageResponse('Organization status updated'),
        400: { description: 'Invalid status', ...errorSchema },
        401: { description: 'Unauthorized', ...errorSchema },
        404: { description: 'Organization not found', ...errorSchema },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: { status: 'active' | 'suspended' | 'inactive' } }>, reply: FastifyReply) => {
    const { id } = request.params
    const { status } = request.body

    const success = await organizationRepository.updateStatus(id, status)

    if (!success) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      })
    }

    return reply.send({
      success: true,
      message: `Organization status updated to ${status}`,
    })
  })
}
