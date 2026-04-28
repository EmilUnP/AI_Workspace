import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'

async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      reply.code(400).send({
        error: 'Validation failed',
        issues: error.issues
      })
      return
    }

    const statusError = error as { statusCode?: number; message?: string }
    if (typeof statusError.statusCode === 'number') {
      reply.code(statusError.statusCode).send({ error: statusError.message ?? 'Request failed' })
      return
    }

    reply.code(500).send({ error: 'Internal server error' })
  })
}

export default fp(errorHandlerPlugin)
