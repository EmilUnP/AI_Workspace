/**
 * Backend-only: load Supabase env for the API server (validates API keys, accesses data).
 * Third-party apps never see or need DB/Supabase — they only use Base URL + API key.
 */

// Suppress Fastify 5 deprecation FSTDEP017 in logs (our code uses routeOptions.url; plugins may still trigger it)
process.on('warning', (w: Error & { name?: string; code?: string }) => {
  if (w?.code === 'FSTDEP017') return
  console.warn(w.name ?? 'Warning', w.message)
})

import { resolve } from 'path'
import { config as loadEnv } from 'dotenv'
const cwd = process.cwd()
;[resolve(cwd, '../../.env.local'), resolve(cwd, '../../.env'), resolve(cwd, '.env.local'), resolve(cwd, '.env')].forEach((p) => loadEnv({ path: p }))

import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import { isDevelopment, RATE_LIMITS } from '@eduator/config'
import { API_VERSION, APP_VERSION } from './version'
import { registerRoutes } from './routes'
import { authMiddleware } from './middleware/auth'
import { errorHandler } from './middleware/error'
import { teacherApiKeyRepository } from '@eduator/db'

const PORT = parseInt(process.env.API_PORT || '4000', 10)
const HOST = process.env.API_HOST || '0.0.0.0'

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: isDevelopment()
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
    },
  })

  // Register plugins — CORS: localhost + env CORS_ORIGINS (comma-separated) for deployed ERP/ERP URLs
  const localhostOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:4000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:4000',
  ]
  const envOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const allowedOrigins = [...localhostOrigins, ...envOrigins]
  await fastify.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (allowedOrigins.includes(origin)) return cb(null, true)
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true)
      if (isDevelopment()) return cb(null, true)
      return cb(null, false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  await fastify.register(helmet, {
    contentSecurityPolicy: false, // Disable for API
  })

  // Optional: compress responses (skip if @fastify/compress not installed)
  try {
    const compress = (await import('@fastify/compress')).default
    await fastify.register(compress, { encodings: ['gzip', 'deflate'] })
  } catch {
    // Module not installed; responses are not compressed
  }

  await fastify.register(multipart, {
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB for document uploads
  })

  await fastify.register(rateLimit, {
    max: RATE_LIMITS.DEFAULT.max,
    timeWindow: RATE_LIMITS.DEFAULT.windowMs,
  })

  // Swagger documentation
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Eduator AI API',
        description: `Eduator ERP API documentation.

## Overview
This API powers the Eduator platform for platform owner, school admin, and teacher workflows.

## Version Information
- **API Version:** ${API_VERSION}
- **Workspace/App Version:** ${APP_VERSION}
- **Environment:** ${process.env.NODE_ENV || 'development'}

## Authentication
Protected endpoints require a JWT token in the Authorization header:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

Tokens are obtained from Supabase Auth. See authentication endpoints in your frontend app for login/signup flows.

## User Roles
- **Platform Owner**: Full platform access, manages all organizations and users across the platform
- **School Admin**: Manages organization users, classes, and settings within their organization
- **Teacher**: Creates exams, lessons, courses, manages class data, and uses AI generation tools

## Endpoint Groups
See the **Tags** section below for the current, generated list of endpoint groups and available routes.

## Base URL
All API endpoints are prefixed with \`/api/v1\`

## Response Format
All responses follow this structure:
\`\`\`json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
\`\`\`

Error responses:
\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": []
  }
}
\`\`\`
`,
        version: API_VERSION,
        contact: {
          name: 'Eduator AI Support',
          email: 'support@eduator.ai',
        },
        license: {
          name: 'MIT',
        },
      },
      servers: [
        {
          url: `http://localhost:${PORT}`,
          description: 'Development server',
        },
        {
          url: 'https://api.eduator.ai',
          description: 'Production server',
        },
      ],
      tags: [
        {
          name: 'Health',
          description: 'Health check and API information endpoints',
        },
        {
          name: 'Profile',
          description: 'User profile management endpoints',
        },
        {
          name: 'Platform Owner',
          description: 'Platform owner exclusive endpoints for managing organizations and users',
        },
        {
          name: 'School Admin',
          description: 'School administrator endpoints for managing organization users and classes',
        },
        {
          name: 'Teacher',
          description: 'Teacher endpoints for exam/lesson/course creation, document workflows, classes, and analytics',
        },
        {
          name: 'Organizations',
          description: 'Organization management endpoints',
        },
        {
          name: 'Users',
          description: 'User management endpoints',
        },
        {
          name: 'Classes',
          description: 'Class management endpoints',
        },
        {
          name: 'Exams',
          description: 'Exam management endpoints',
        },
        {
          name: 'Reports',
          description: 'Analytics and reporting endpoints',
        },
        {
          name: 'Chatbot',
          description: 'AI interaction endpoints',
        },
        {
          name: 'AI',
          description: 'AI-powered features (exam generation, etc.)',
        },
        {
          name: 'Analytics',
          description: 'Analytics and progress tracking endpoints',
        },
        {
          name: 'Progress',
          description: 'Progress and analytics endpoints',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token obtained from Supabase Auth. Include in Authorization header as: Bearer <token>',
          },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string', example: 'NOT_FOUND' },
                  message: { type: 'string', example: 'Resource not found' },
                  details: { type: 'array', items: { type: 'object' } },
                },
                required: ['code', 'message'],
              },
            },
            required: ['success', 'error'],
          },
          Success: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object' },
              message: { type: 'string' },
            },
            required: ['success'],
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  })

  // Docs UI: serve from CDN so static assets work consistently across deployments.
  const swaggerUiCdn = 'https://unpkg.com/swagger-ui-dist@5.9.0'
  fastify.get('/docs/json', async (_request, reply) => {
    const spec = await fastify.swagger()
    return reply.type('application/json').send(spec)
  })
  const docsHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Eduator AI API v${API_VERSION} - Swagger UI</title>
  <link rel="stylesheet" href="${swaggerUiCdn}/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${swaggerUiCdn}/swagger-ui-bundle.js" crossorigin></script>
  <script src="${swaggerUiCdn}/swagger-ui-standalone-preset.js" crossorigin></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: '/docs/json',
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: 'StandaloneLayout',
        docExpansion: 'list',
        deepLinking: false
      })
    }
  </script>
</body>
</html>`
  fastify.get('/docs', async (_request, reply) => {
    return reply.type('text/html').send(docsHtml)
  })
  fastify.get('/docs/', async (_request, reply) => {
    return reply.type('text/html').send(docsHtml)
  })

  // Global error handler
  fastify.setErrorHandler(errorHandler)

  // Auth middleware
  fastify.decorate('authenticate', authMiddleware)

  // Register routes
  await registerRoutes(fastify)

  // Log API key usage for analytics (success/error per endpoint).
  // Long-running routes (exams/generate, lessons/generate) record usage in-handler so serverless doesn't miss it; skip here to avoid double-recording.
  fastify.addHook('onResponse', async (request, reply) => {
    const apiKeyId = (request as { apiKeyId?: string }).apiKeyId
    if (!apiKeyId) return
    const endpoint = (request as { routeOptions?: { url?: string } }).routeOptions?.url ?? request.url?.split('?')[0] ?? ''
    if (endpoint.endsWith('/exams/generate') || endpoint.endsWith('/lessons/generate')) return
    const method = request.method
    const statusCode = reply.statusCode
    const status = statusCode >= 200 && statusCode < 400 ? 'success' : 'error'
    await teacherApiKeyRepository.recordUsage({ apiKeyId, method, endpoint, status, statusCode }).catch((err) => {
      fastify.log.warn({ err, apiKeyId, endpoint }, 'Failed to record API key usage')
    })
  })

  return fastify
}

async function start() {
  try {
    const server = await buildServer()

    await server.listen({ port: PORT, host: HOST })

    console.log(`
🚀 Eduator AI API Server running!
   
   📚 API Docs:  http://localhost:${PORT}/docs
   🔗 API URL:   http://localhost:${PORT}/api/v1
   📋 Version:   ${API_VERSION}
   
   Environment: ${process.env.NODE_ENV || 'development'}
    `)
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()
