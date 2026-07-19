import { AsyncLocalStorage } from 'node:async_hooks'
import type { FastifyInstance } from 'fastify'

export type AiRequestContext = {
  app: FastifyInstance
  userId?: string
}

const storage = new AsyncLocalStorage<AiRequestContext>()

export function runWithAiContext<T>(context: AiRequestContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(context, fn)
}

export function getAiContext(): AiRequestContext {
  const ctx = storage.getStore()
  if (!ctx) {
    throw new Error('AI request context is not available')
  }
  return ctx
}

export function tryGetAiContext(): AiRequestContext | undefined {
  return storage.getStore()
}
