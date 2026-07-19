import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'
import { AiProviderError } from '../ai/types.js'

async function errorHandlerPlugin(app: FastifyInstance) {
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      ok: false,
      error: 'Endpoint not found',
      message: `No route matches ${request.method} ${request.url}. See /v1/docs for the full API reference.`,
      statusCode: 404
    })
  })

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error)

    if (error instanceof ZodError) {
      reply.code(400).send({
        error: 'Validation failed',
        issues: error.issues
      })
      return
    }

    if (error instanceof AiProviderError) {
      reply.code(error.statusCode).send({
        error: error.message,
        code: error.code,
      })
      return
    }

    const statusError = error as { statusCode?: number; message?: string; code?: string; hint?: string }
    if (typeof statusError.statusCode === 'number') {
      reply.code(statusError.statusCode).send({
        error: statusError.message ?? 'Request failed',
        code: statusError.code,
        hint: statusError.hint
      })
      return
    }

    reply.code(500).send({ error: 'Internal server error' })
  })
}

export default fp(errorHandlerPlugin)
