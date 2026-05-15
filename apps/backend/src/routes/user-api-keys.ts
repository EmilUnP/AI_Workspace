import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { UserApiKeysService, type UsageDateRange } from '../services/user-api-keys.service.js'

const usageRangeSchema = z.enum(['today', '30d', 'all']).default('today')

const createApiKeySchema = z.object({
  name: z.string().trim().min(1, 'Key name is required').max(120, 'Key name is too long'),
})

export async function userApiKeysRoutes(app: FastifyInstance) {
  const service = new UserApiKeysService(app)

  app.get('/users/me/api-keys', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const keys = await service.list(userId)
    reply.send({ items: keys })
  })

  app.post('/users/me/api-keys', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const { name } = createApiKeySchema.parse(request.body)
    const created = await service.create(userId, name)
    reply.send(created)
  })

  app.delete('/users/me/api-keys/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const keyId = String((request.params as { id?: string }).id || '')
    if (!keyId) return reply.code(400).send({ error: 'Key id is required' })
    const ok = await service.revoke(userId, keyId)
    if (!ok) return reply.code(404).send({ error: 'API key not found' })
    reply.send({ success: true })
  })

  app.get('/users/me/api-keys/usage', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const query = request.query as { range?: string }
    const range = usageRangeSchema.parse(query.range ?? 'all') as UsageDateRange
    const stats = await service.getUsageStats(userId, range)
    reply.send({ ...stats, range })
  })
}
