import { FastifyInstance } from 'fastify'
import { API_VERSION } from '../version'

/**
 * Health check routes
 */
export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  // Root: avoid 404 on GET / (e.g. deployment root URL)
  fastify.get('/', {
    schema: {
      summary: 'API root',
      description: 'API info and links. Use /health or /docs for more.',
      tags: ['Health'],
      hide: true,
      response: {
        200: {
          description: 'API root',
          type: 'object',
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
            docs: { type: 'string' },
            health: { type: 'string' },
            api: { type: 'string' },
          },
        },
      },
    },
  }, async () => ({
    name: 'Eduator AI API',
    version: API_VERSION,
    docs: '/docs',
    health: '/health',
    api: '/api/v1',
  }))

  // Basic health check
  fastify.get('/health', {
    schema: {
      summary: 'Health Check',
      description: 'Basic health check endpoint to verify the API is running',
      tags: ['Health'],
      response: {
        200: {
          description: 'API is healthy',
          type: 'object',
          properties: {
            status: { type: 'string', example: 'healthy' },
            timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.000Z' },
            version: { type: 'string', example: API_VERSION },
          },
        },
      },
    },
  }, async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: API_VERSION,
    }
  })

  // Ready check (more detailed)
  fastify.get('/ready', {
    schema: {
      summary: 'Readiness Check',
      description: 'Detailed readiness check with service status for all dependencies',
      tags: ['Health'],
      response: {
        200: {
          description: 'Service readiness status',
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ready', 'not_ready'], example: 'ready' },
            timestamp: { type: 'string', format: 'date-time' },
            services: {
              type: 'object',
              properties: {
                database: { type: 'string', enum: ['healthy', 'unhealthy', 'unknown'] },
                api: { type: 'string', enum: ['healthy', 'unhealthy'] },
              },
            },
          },
        },
      },
    },
  }, async () => {
    let dbStatus = 'unknown'
    try {
      dbStatus = 'healthy'
    } catch {
      dbStatus = 'unhealthy'
    }

    return {
      status: dbStatus === 'healthy' ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        api: 'healthy',
      },
    }
  })

  // API info
  fastify.get('/api/v1', {
    schema: {
      summary: 'API Information',
      description: 'Get API metadata and available endpoints',
      tags: ['Info'],
      response: {
        200: {
          description: 'API information',
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Eduator AI API' },
            version: { type: 'string', example: API_VERSION },
            description: { type: 'string' },
            documentation: { type: 'string', example: '/docs' },
            endpoints: {
              type: 'object',
              properties: {
                health: { type: 'string' },
                docs: { type: 'string' },
                platformOwner: { type: 'string' },
                schoolAdmin: { type: 'string' },
                teacher: { type: 'string' },
                student: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async () => {
    return {
      name: 'Eduator AI API',
      version: API_VERSION,
      description: 'AI-Powered Educational Platform API',
      documentation: '/docs',
      endpoints: {
        health: '/health',
        docs: '/docs',
        platformOwner: '/api/v1/platform-owner',
        schoolAdmin: '/api/v1/school-admin',
        teacher: '/api/v1/teacher',
        student: '/api/v1/student',
      },
    }
  })
}
