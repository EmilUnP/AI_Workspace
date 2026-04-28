import { FastifyInstance } from 'fastify'
import { userRoutes } from './users'
import { reportsRoutes } from './reports'
import { requireRole } from '../../../middleware/auth'

/**
 * Platform Owner routes
 * All routes require platform_owner role
 */
export async function platformOwnerRoutes(fastify: FastifyInstance): Promise<void> {
  // Apply role check to all routes
  fastify.addHook('preHandler', requireRole('platform_owner'))

  // Register sub-routes
  await fastify.register(userRoutes, { prefix: '/users' })
  await fastify.register(reportsRoutes, { prefix: '/reports' })
}
