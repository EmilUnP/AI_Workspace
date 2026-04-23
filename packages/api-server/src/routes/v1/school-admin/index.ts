import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { requireRole } from '../../../middleware/auth'
import { profileRepository, classRepository } from '@eduator/db'
import { profileSchema, classSchema, errorSchema, successResponse} from '../../schemas'

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
      description: 'Get dashboard data for the school including user counts, classes, and pending approvals',
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
                total_students: { type: 'integer', example: 500 },
                total_classes: { type: 'integer', example: 30 },
                pending_approvals: { type: 'integer', example: 5 },
              },
            },
            recent_teachers: { type: 'array', items: profileSchema },
            recent_classes: { type: 'array', items: classSchema },
            pending_users: { type: 'array', items: profileSchema },
          },
        }, 'Dashboard data'),
        400: { description: 'User not associated with organization', ...errorSchema },
        401: { description: 'Unauthorized', ...errorSchema },
        403: { description: 'School admin role required', ...errorSchema },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const organizationId = request.user!.profile!.organization_id

    if (!organizationId) {
      return reply.code(400).send({
        success: false,
        error: { code: 'NO_ORGANIZATION', message: 'User not associated with an organization' },
      })
    }

    const teachers = await profileRepository.getByOrganization(organizationId, { profileType: 'teacher' })
    const students = await profileRepository.getByOrganization(organizationId, { profileType: 'student' })
    const pendingApprovals = await profileRepository.getByOrganization(organizationId, { approvalStatus: 'pending' })
    const { data: classes, count: totalClasses } = await classRepository.getByOrganization(organizationId)

    return reply.send({
      success: true,
      data: {
        overview: {
          total_teachers: teachers.length,
          total_students: students.length,
          total_classes: totalClasses,
          pending_approvals: pendingApprovals.length,
        },
        recent_teachers: teachers.slice(0, 5),
        recent_classes: classes.slice(0, 5),
        pending_users: pendingApprovals.slice(0, 10),
      },
    })
  })

  // User management routes
  fastify.get('/users', {
    schema: {
      summary: 'List Organization Users',
      description: 'List all teachers and students in the organization with optional filters',
      tags: ['School Admin', 'Users'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          profile_type: { 
            type: 'string', 
            enum: ['teacher', 'student'],
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
    const organizationId = request.user!.profile!.organization_id!
    const { profile_type, approval_status } = request.query

    const users = await profileRepository.getByOrganization(organizationId, {
      profileType: profile_type,
      approvalStatus: approval_status,
    })

    return reply.send({
      success: true,
      data: users,
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
    const organizationId = request.user!.profile!.organization_id!

    const userProfile = await profileRepository.getById(id)
    if (!userProfile || userProfile.organization_id !== organizationId) {
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
    const organizationId = request.user!.profile!.organization_id!

    const userProfile = await profileRepository.getById(id)
    if (!userProfile || userProfile.organization_id !== organizationId) {
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

  // Classes overview
  fastify.get('/classes', {
    schema: {
      summary: 'List Organization Classes',
      description: 'List all classes in the organization with teacher information',
      tags: ['School Admin', 'Classes'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          per_page: { type: 'integer', default: 20 },
          is_active: { type: 'boolean', description: 'Filter by active status' },
        },
      },
      response: {
        200: {
          description: 'List of classes',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                items: { type: 'array', items: classSchema },
                total: { type: 'integer' },
              },
            },
          },
        },
        401: { description: 'Unauthorized', ...errorSchema },
      },
    },
  }, async (request: FastifyRequest<{
    Querystring: { page?: number; per_page?: number; is_active?: boolean }
  }>, reply: FastifyReply) => {
    const organizationId = request.user!.profile!.organization_id!
    const { page = 1, per_page = 20, is_active } = request.query

    const { data: classes, count } = await classRepository.getByOrganization(organizationId, {
      page,
      perPage: per_page,
      isActive: is_active,
    })

    return reply.send({
      success: true,
      data: {
        items: classes,
        total: count,
      },
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
                total_students: { type: 'integer' },
                total_classes: { type: 'integer' },
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
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const organizationId = request.user!.profile!.organization_id!

    const teachers = await profileRepository.getByOrganization(organizationId, { profileType: 'teacher' })
    const students = await profileRepository.getByOrganization(organizationId, { profileType: 'student' })
    const { count: classCount } = await classRepository.getByOrganization(organizationId)

    return reply.send({
      success: true,
      data: {
        summary: {
          total_teachers: teachers.length,
          total_students: students.length,
          total_classes: classCount,
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
