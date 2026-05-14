import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import dbPlugin from './plugins/db.js'
import authPlugin from './plugins/auth.js'
import errorHandlerPlugin from './plugins/error-handler.js'
import apiAccessLogPlugin from './plugins/api-access-log.js'
import { authRoutes } from './routes/auth.js'
import { usersRoutes } from './routes/users.js'
import { documentsRoutes } from './routes/documents.js'
import { aiRoutes } from './routes/ai.js'
import { lessonsRoutes } from './routes/lessons.js'
import { examsRoutes } from './routes/exams.js'
import { educationPlansRoutes } from './routes/education-plans.js'
import { userAiKeysRoutes } from './routes/user-ai-keys.js'
import { userApiKeysRoutes } from './routes/user-api-keys.js'

export async function buildApp() {
  const openApiPath = fileURLToPath(new URL('../openapi.yaml', import.meta.url))
  const app = Fastify({
    logger: {
      level: 'info'
    }
  })

  await app.register(cors, { origin: true })
  await app.register(helmet)
  await app.register(swagger, {
    mode: 'static',
    specification: {
      path: openApiPath,
      baseDir: path.dirname(openApiPath)
    }
  })
  await app.register(swaggerUI, {
    routePrefix: '/v1/docs',
    staticCSP: true,
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  })
  await app.register(dbPlugin)
  await app.register(authPlugin)
  await app.register(errorHandlerPlugin)
  await app.register(apiAccessLogPlugin)

  app.get('/health', async () => ({ ok: true }))

  await app.register(authRoutes, { prefix: '/v1' })
  await app.register(usersRoutes, { prefix: '/v1' })
  await app.register(documentsRoutes, { prefix: '/v1' })
  await app.register(aiRoutes, { prefix: '/v1' })
  await app.register(lessonsRoutes, { prefix: '/v1' })
  await app.register(examsRoutes, { prefix: '/v1' })
  await app.register(educationPlansRoutes, { prefix: '/v1' })
  await app.register(userAiKeysRoutes, { prefix: '/v1' })
  await app.register(userApiKeysRoutes, { prefix: '/v1' })

  return app
}
