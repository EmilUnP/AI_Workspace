import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { requireRole } from '../../../middleware/auth'
import { profileRepository } from '@eduator/db'
import { profileSchema, errorSchema, successResponse} from '../../schemas'

/**
 * School Admin routes
 * Transitional role support:
 * - school_superadmin (primary)
 * - teacher (legacy during migration)
 */
export async function schoolAdminRoutes(fastify: FastifyInstance): Promise<void> {
  // Apply role check to all routes
  fastify.addHook('preHandler', requireRole('school_superadmin', 'teacher'))

  // Dashboard overview
  fastify.get('/dashboard', {
    schema: {
      summary: 'School Admin Dashboard',
      description: 'Get dashboard data for the school including user counts and pending approvals',
      tags: ['School Admin'],
      security: [{ bearerAuth: [] }],
      response: {
        200: successResponse({
          type: 'object',
          properties: {
            overview: {
              type: 'object',
              properties: {
                total_teachers: { type: 'integer', example: 25 },
                total_learners: { type: 'integer', example: 500 },
                pending_approvals: { type: 'integer', example: 5 },
              },
            },
            recent_teachers: { type: 'array', items: profileSchema },
            pending_users: { type: 'array', items: profileSchema },
          },
        }, 'Dashboard data'),
        401: { description: 'Unauthorized', ...errorSchema },
        403: { description: 'School admin role required', ...errorSchema },
      },
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const teachers = await profileRepository.getAll({ profileType: 'teacher', perPage: 500 })
    const learners = await profileRepository.getAll({ profileType: 'student', perPage: 500 })
    const pendingApprovals = await profileRepository.getAll({ approvalStatus: 'pending', perPage: 500 })

    return reply.send({
      success: true,
      data: {
        overview: {
          total_teachers: teachers.data.length,
          total_learners: learners.data.length,
          pending_approvals: pendingApprovals.data.length,
        },
        recent_teachers: teachers.data.slice(0, 5),
        pending_users: pendingApprovals.data.slice(0, 10),
      },
    })
  })

  // User management routes
  fastify.get('/users', {
    schema: {
      summary: 'List Organization Users',
      description: 'List all active organization users with optional filters',
      tags: ['School Admin', 'Users'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          profile_type: { 
            type: 'string', 
            enum: ['teacher'],
            description: 'Filter by user role',
          },
          approval_status: { 
            type: 'string', 
            enum: ['pending', 'approved', 'rejected'],
            description: 'Filter by approval status',
          },
        },
      },
      response: {
        200: successResponse({ type: 'array', items: profileSchema }, 'List of users in organization'),
        401: { description: 'Unauthorized', ...errorSchema },
      },
    },
  }, async (request: FastifyRequest<{
    Querystring: { profile_type?: string; approval_status?: 'pending' | 'approved' | 'rejected' }
  }>, reply: FastifyReply) => {
    const { profile_type, approval_status } = request.query

    const users = await profileRepository.getAll({
      profileType: profile_type,
      approvalStatus: approval_status as 'pending' | 'approved' | 'rejected' | undefined,
      perPage: 500,
    })

    return reply.send({
      success: true,
      data: users.data,
    })
  })

  // Approve user within organization
  fastify.patch('/users/:id/approve', {
    schema: {
      summary: 'Approve User',
      description: 'Approve a pending user in your organization',
      tags: ['School Admin', 'Users'],
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
          description: 'User approved',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: profileSchema,
            message: { type: 'string' },
          },
        },
        401: { description: 'Unauthorized', ...errorSchema },
        404: { description: 'User not found in organization', ...errorSchema },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params
    const userProfile = await profileRepository.getById(id)
    if (!userProfile) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found in your organization' },
      })
    }

    const updated = await profileRepository.updateApprovalStatus(id, 'approved')

    return reply.send({
      success: true,
      data: updated,
      message: 'User approved successfully',
    })
  })

  // Reject user within organization
  fastify.patch('/users/:id/reject', {
    schema: {
      summary: 'Reject User',
      description: 'Reject a pending user in your organization',
      tags: ['School Admin', 'Users'],
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
          description: 'User rejected',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: profileSchema,
            message: { type: 'string' },
          },
        },
        401: { description: 'Unauthorized', ...errorSchema },
        404: { description: 'User not found in organization', ...errorSchema },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params
    const userProfile = await profileRepository.getById(id)
    if (!userProfile) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found in your organization' },
      })
    }

    const updated = await profileRepository.updateApprovalStatus(id, 'rejected')

    return reply.send({
      success: true,
      data: updated,
      message: 'User rejected',
    })
  })

  // Reports
  fastify.get('/reports', {
    schema: {
      summary: 'Organization Reports',
      description: 'Get summary reports for the organization',
      tags: ['School Admin', 'Reports'],
      security: [{ bearerAuth: [] }],
      response: {
        200: successResponse({
          type: 'object',
          properties: {
            summary: {
              type: 'object',
              properties: {
                total_teachers: { type: 'integer' },
                total_learners: { type: 'integer' },
                total_exams: { type: 'integer' },
              },
            },
            performance: {
              type: 'object',
              properties: {
                average_exam_score: { type: 'number' },
                completion_rate: { type: 'number' },
              },
            },
          },
        }, 'Organization reports'),
        401: { description: 'Unauthorized', ...errorSchema },
      },
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const teachers = await profileRepository.getAll({ profileType: 'teacher', perPage: 500 })
    const learners = await profileRepository.getAll({ profileType: 'student', perPage: 500 })

    return reply.send({
      success: true,
      data: {
        summary: {
          total_teachers: teachers.data.length,
          total_learners: learners.data.length,
          total_exams: 0,
        },
        performance: {
          average_exam_score: 0,
          completion_rate: 0,
        },
      },
    })
  })
}
