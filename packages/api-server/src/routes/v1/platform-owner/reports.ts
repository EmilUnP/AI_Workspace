import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { profileRepository } from '@eduator/db'
import { errorSchema, successResponse } from '../../schemas'

/**
 * Reports and analytics routes for Platform Owner
 */
export async function reportsRoutes(fastify: FastifyInstance): Promise<void> {
  // Dashboard overview
  fastify.get('/', {
    schema: {
      summary: 'Platform Dashboard Overview',
      description: 'Get comprehensive dashboard statistics for the entire platform',
      tags: ['Platform Owner', 'Reports'],
      security: [{ bearerAuth: [] }],
      response: {
        200: successResponse({
          type: 'object',
          properties: {
            overview: {
              type: 'object',
              properties: {
                total_organizations: { type: 'integer', example: 50 },
                total_users: { type: 'integer', example: 5000 },
                pending_approvals: { type: 'integer', example: 12 },
              },
            },
            organizations: {
              type: 'object',
              properties: {
                by_status: {
                  type: 'object',
                  properties: {
                    active: { type: 'integer' },
                    suspended: { type: 'integer' },
                    inactive: { type: 'integer' },
                  },
                },
                by_plan: {
                  type: 'object',
                  properties: {
                    basic: { type: 'integer' },
                    premium: { type: 'integer' },
                    enterprise: { type: 'integer' },
                  },
                },
              },
            },
            users: {
              type: 'object',
              properties: {
                by_type: {
                  type: 'object',
                  properties: {
                    platform_owner: { type: 'integer' },
                    school_superadmin: { type: 'integer' },
                    teacher: { type: 'integer' },
                  },
                },
                recent_signups: { type: 'array', items: { type: 'object' } },
              },
            },
            usage: {
              type: 'object',
              properties: {
                exams_generated_today: { type: 'integer' },
                exams_generated_this_week: { type: 'integer' },
                exams_generated_this_month: { type: 'integer' },
                ai_requests_today: { type: 'integer' },
              },
            },
          },
        }, 'Dashboard overview data'),
        401: { description: 'Unauthorized', ...errorSchema },
      },
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const { count: totalUsers } = await profileRepository.getAll({ perPage: 1 })
    const pendingApprovals = await profileRepository.getPendingCount()

    const { data: allUsers } = await profileRepository.getAll({ perPage: 1000 })
    const usersByType = {
      platform_owner: allUsers.filter((u) => u.profile_type === 'platform_owner').length,
      school_superadmin: allUsers.filter((u) => u.profile_type === 'school_superadmin').length,
      teacher: allUsers.filter((u) => u.profile_type === 'teacher').length,
    }

    const { data: recentUsers } = await profileRepository.getAll({ perPage: 10 })

    return reply.send({
      success: true,
      data: {
        overview: {
          total_organizations: 0,
          total_users: totalUsers,
          pending_approvals: pendingApprovals,
        },
        organizations: {
          by_status: { active: 0, suspended: 0, inactive: 0 },
          by_plan: { basic: 0, premium: 0, enterprise: 0 },
        },
        users: {
          by_type: usersByType,
          recent_signups: recentUsers.slice(0, 5),
        },
        usage: {
          exams_generated_today: 0,
          exams_generated_this_week: 0,
          exams_generated_this_month: 0,
          ai_requests_today: 0,
        },
      },
    })
  })

  // Analytics data
  fastify.get('/analytics', {
    schema: {
      summary: 'Detailed Analytics',
      description: 'Get detailed analytics with time-series data for specified date range',
      tags: ['Platform Owner', 'Reports'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          start_date: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
          end_date: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
          granularity: { 
            type: 'string', 
            enum: ['day', 'week', 'month'],
            default: 'day',
            description: 'Data aggregation granularity',
          },
        },
      },
      response: {
        200: successResponse({
          type: 'object',
          properties: {
            time_range: {
              type: 'object',
              properties: {
                start_date: { type: 'string' },
                end_date: { type: 'string' },
                granularity: { type: 'string' },
              },
            },
            metrics: {
              type: 'object',
              properties: {
                new_organizations: { type: 'array', items: { type: 'object' } },
                new_users: { type: 'array', items: { type: 'object' } },
                active_users: { type: 'array', items: { type: 'object' } },
                exams_created: { type: 'array', items: { type: 'object' } },
                ai_requests: { type: 'array', items: { type: 'object' } },
              },
            },
            growth: {
              type: 'object',
              properties: {
                organizations_growth_rate: { type: 'number' },
                users_growth_rate: { type: 'number' },
                retention_rate: { type: 'number' },
              },
            },
          },
        }, 'Detailed analytics data'),
        401: { description: 'Unauthorized', ...errorSchema },
      },
    },
  }, async (request: FastifyRequest<{
    Querystring: {
      start_date?: string
      end_date?: string
      granularity?: string
    }
  }>, reply: FastifyReply) => {
    return reply.send({
      success: true,
      data: {
        time_range: {
          start_date: request.query.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: request.query.end_date || new Date().toISOString(),
          granularity: request.query.granularity || 'day',
        },
        metrics: {
          new_organizations: [],
          new_users: [],
          active_users: [],
          exams_created: [],
          ai_requests: [],
        },
        growth: {
          organizations_growth_rate: 0,
          users_growth_rate: 0,
          retention_rate: 0,
        },
      },
    })
  })

  // Usage statistics
  fastify.get('/usage', {
    schema: {
      summary: 'Usage Statistics',
      description: 'Get detailed usage statistics including AI usage, storage, and feature adoption',
      tags: ['Platform Owner', 'Reports'],
      security: [{ bearerAuth: [] }],
      response: {
        200: successResponse({
          type: 'object',
          properties: {
            ai_usage: {
              type: 'object',
              properties: {
                total_requests: { type: 'integer' },
                question_generation: { type: 'integer' },
                chatbot_interactions: { type: 'integer' },
                lesson_generation: { type: 'integer' },
                translations: { type: 'integer' },
              },
            },
            storage: {
              type: 'object',
              properties: {
                total_used_gb: { type: 'number' },
                documents: { type: 'integer' },
                exports: { type: 'integer' },
              },
            },
            feature_adoption: {
              type: 'object',
              properties: {
                exam_generator: { type: 'integer', description: 'Number of users who used exam generator' },
                ai_chatbot: { type: 'integer', description: 'Number of users who used AI chatbot' },
                lesson_generator: { type: 'integer', description: 'Number of users who used lesson generator' },
                analytics: { type: 'integer', description: 'Number of users who viewed analytics' },
              },
            },
          },
        }, 'Usage statistics'),
        401: { description: 'Unauthorized', ...errorSchema },
      },
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      success: true,
      data: {
        ai_usage: {
          total_requests: 0,
          question_generation: 0,
          chatbot_interactions: 0,
          lesson_generation: 0,
          translations: 0,
        },
        storage: {
          total_used_gb: 0,
          documents: 0,
          exports: 0,
        },
        feature_adoption: {
          exam_generator: 0,
          ai_chatbot: 0,
          lesson_generator: 0,
          analytics: 0,
        },
      },
    })
  })
}
