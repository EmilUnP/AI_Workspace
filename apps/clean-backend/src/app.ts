import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import dbPlugin from './plugins/db.js'
import authPlugin from './plugins/auth.js'
import errorHandlerPlugin from './plugins/error-handler.js'
import { authRoutes } from './routes/auth.js'
import { usersRoutes } from './routes/users.js'
import { documentsRoutes } from './routes/documents.js'
import { aiRoutes } from './routes/ai.js'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: 'info'
    }
  })

  await app.register(cors, { origin: true })
  await app.register(helmet)
  await app.register(dbPlugin)
  await app.register(authPlugin)
  await app.register(errorHandlerPlugin)

  app.get('/health', async () => ({ ok: true }))

  await app.register(authRoutes, { prefix: '/v1' })
  await app.register(usersRoutes, { prefix: '/v1' })
  await app.register(documentsRoutes, { prefix: '/v1' })
  await app.register(aiRoutes, { prefix: '/v1' })

  return app
}
