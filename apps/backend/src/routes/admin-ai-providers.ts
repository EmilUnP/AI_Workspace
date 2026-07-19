import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AI_WORKLOADS } from '../ai/types.js'
import { requireAdminJwt } from '../plugins/require-role.js'
import { AiProviderConfigService } from '../services/ai-provider-config.service.js'

export async function adminAiProvidersRoutes(app: FastifyInstance) {
  const service = new AiProviderConfigService(app)
  const adminOnly = { preHandler: [app.authenticate, requireAdminJwt] }

  app.get('/admin/ai-providers', adminOnly, async () => {
    return service.getAdminOverview()
  })

  app.get('/admin/ai-providers/credential', adminOnly, async () => {
    return service.getCredentialStatus()
  })

  app.put('/admin/ai-providers/credential', adminOnly, async (request) => {
    return service.saveCredential(request.authUser!.sub, request.body)
  })

  app.delete('/admin/ai-providers/credential', adminOnly, async (request) => {
    return service.deleteCredential(request.authUser!.sub)
  })

  app.post('/admin/ai-providers/credential/test', adminOnly, async (request) => {
    return service.testCredential(request.authUser!.sub)
  })

  app.get('/admin/ai-providers/policies', adminOnly, async () => {
    return { items: await service.listPolicies(), workloads: AI_WORKLOADS }
  })

  app.put('/admin/ai-providers/policies/:workload', adminOnly, async (request) => {
    const params = z.object({ workload: z.string() }).parse(request.params)
    return service.updatePolicy(request.authUser!.sub, params.workload, request.body)
  })

  app.get('/admin/ai-providers/catalog', adminOnly, async (request) => {
    const query = z
      .object({ enabledOnly: z.enum(['true', 'false']).optional() })
      .parse(request.query)
    return {
      items: await service.listCatalog({
        enabledOnly: query.enabledOnly === 'true' ? true : undefined,
      }),
    }
  })

  app.post('/admin/ai-providers/catalog/sync', adminOnly, async (request) => {
    return service.syncCatalog(request.authUser!.sub)
  })

  app.patch('/admin/ai-providers/catalog/enabled', adminOnly, async (request) => {
    return service.setModelEnabled(request.authUser!.sub, request.body)
  })
}
