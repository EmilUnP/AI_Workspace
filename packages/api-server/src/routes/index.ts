import { FastifyInstance } from 'fastify'
import { healthRoutes } from './health'
import { platformOwnerRoutes } from './v1/platform-owner'
import { schoolAdminRoutes } from './v1/school-admin'
import { teacherRoutes } from './v1/teacher'
import { studentRoutes } from './v1/student'
import { profileRoutes } from './v1/profile'

/**
 * Register all API routes
 */
export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // Health check (no prefix)
  await fastify.register(healthRoutes)

  // API v1 routes
  await fastify.register(
    async (app) => {
      // Profile routes
      await app.register(profileRoutes, { prefix: '/profile' })

      // Role-based routes
      await app.register(platformOwnerRoutes, { prefix: '/platform-owner' })
      await app.register(schoolAdminRoutes, { prefix: '/school-admin' })
      await app.register(teacherRoutes, { prefix: '/teacher' })
      await app.register(studentRoutes, { prefix: '/student' })
    },
    { prefix: '/api/v1' }
  )
}
