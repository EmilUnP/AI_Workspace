import { FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import { ZodError } from 'zod'

/**
 * Global error handler for Fastify
 */
export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  request.log.error({ error }, 'Request error')

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    reply.code(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    })
    return
  }

  // Handle Fastify validation errors
  if (error.validation) {
    reply.code(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.validation,
      },
    })
    return
  }

  // Handle rate limit errors
  if (error.statusCode === 429) {
    reply.code(429).send({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    })
    return
  }

  // Handle not found errors
  if (error.statusCode === 404) {
    reply.code(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: error.message || 'Resource not found',
      },
    })
    return
  }

  // Handle authentication errors
  if (error.statusCode === 401) {
    reply.code(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: error.message || 'Authentication required',
      },
    })
    return
  }

  // Handle authorization errors
  if (error.statusCode === 403) {
    reply.code(403).send({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: error.message || 'Access denied',
      },
    })
    return
  }

  // Default to internal server error
  const statusCode = error.statusCode || 500

  reply.code(statusCode).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error.message,
    },
  })
}

/**
 * Create a custom error with status code
 */
export function createError(statusCode: number, code: string, message: string): FastifyError {
  const error = new Error(message) as FastifyError
  error.statusCode = statusCode
  error.code = code
  return error
}

/**
 * Common error creators
 */
export const errors = {
  badRequest: (message: string) => createError(400, 'BAD_REQUEST', message),
  unauthorized: (message = 'Authentication required') => createError(401, 'UNAUTHORIZED', message),
  forbidden: (message = 'Access denied') => createError(403, 'FORBIDDEN', message),
  notFound: (resource = 'Resource') => createError(404, 'NOT_FOUND', `${resource} not found`),
  conflict: (message: string) => createError(409, 'CONFLICT', message),
  internal: (message = 'An unexpected error occurred') => createError(500, 'INTERNAL_ERROR', message),
}
