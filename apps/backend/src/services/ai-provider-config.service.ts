import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { OpenRouterClient } from '../ai/openrouter.js'
import { AI_WORKLOADS, AiProviderError, type AiWorkload } from '../ai/types.js'
import { decryptSecret, encryptSecret, secretHint } from '../utils/ai-credentials-crypto.js'
import { env } from '../config/env.js'

const OPENROUTER_PROVIDER = 'openrouter'
const MAX_FALLBACKS = 8
const CACHE_TTL_MS = 15_000

type CredentialRow = {
  id: string
  encrypted_key: string
  key_hint: string
  is_active: boolean
  last_tested_at: string | null
  last_test_status: string | null
  last_test_error: string | null
  version: number
  updated_at: string
}

type PolicyRow = {
  id: string
  workload: AiWorkload
  provider: string
  model_chain: string[]
  require_structured_outputs: boolean
  prefer_zdr: boolean
  is_enabled: boolean
  notes: string | null
  version: number
  updated_at: string
}

type CatalogRow = {
  id: string
  model_id: string
  display_name: string
  context_length: number | null
  input_modalities: string[]
  output_modalities: string[]
  supported_parameters: string[]
  prompt_price_per_million: string | null
  completion_price_per_million: string | null
  is_enabled: boolean
  is_deprecated: boolean
  synced_at: string
  version?: number
}

const saveKeySchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(20, 'OpenRouter API key is too short')
    .max(4096, 'OpenRouter API key is too long')
    .refine((value) => value.startsWith('sk-or-'), 'OpenRouter API key must start with sk-or-'),
  expectedVersion: z.number().int().positive().optional(),
})

const updatePolicySchema = z.object({
  modelChain: z
    .array(z.string().trim().min(1).max(200))
    .min(1)
    .max(MAX_FALLBACKS),
  requireStructuredOutputs: z.boolean().optional(),
  preferZdr: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
  expectedVersion: z.number().int().positive(),
})

const setModelEnabledSchema = z.object({
  modelId: z.string().trim().min(1).max(200),
  isEnabled: z.boolean(),
})

type CacheEntry<T> = { value: T; expiresAt: number }

export class AiProviderConfigService {
  private credentialCache: CacheEntry<string | null> | null = null
  private policyCache = new Map<string, CacheEntry<PolicyRow>>()

  constructor(private readonly app: FastifyInstance) {}

  private invalidateCaches() {
    this.credentialCache = null
    this.policyCache.clear()
  }

  private async audit(
    actorUserId: string | null,
    action: string,
    entityType: string,
    entityId: string | null,
    beforeState: unknown,
    afterState: unknown
  ) {
    await this.app.db.query(
      `INSERT INTO ai_provider_audit_log (actor_user_id, action, entity_type, entity_id, before_state, after_state)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
      [
        actorUserId,
        action,
        entityType,
        entityId,
        beforeState ? JSON.stringify(beforeState) : null,
        afterState ? JSON.stringify(afterState) : null,
      ]
    )
  }

  async getCredentialStatus() {
    const { rows } = await this.app.db.query<CredentialRow>(
      `SELECT id, encrypted_key, key_hint, is_active, last_tested_at, last_test_status, last_test_error, version, updated_at
       FROM ai_provider_credentials
       WHERE provider = $1
       LIMIT 1`,
      [OPENROUTER_PROVIDER]
    )
    const row = rows[0]
    if (!row) {
      const envConfigured = Boolean(env.OPENROUTER_API_KEY)
      return {
        hasKey: envConfigured,
        keyHint: envConfigured ? 'env' : null,
        source: envConfigured ? ('env' as const) : ('none' as const),
        isActive: envConfigured,
        lastTestedAt: null as string | null,
        lastTestStatus: null as string | null,
        lastTestError: null as string | null,
        version: 0,
        updatedAt: null as string | null,
      }
    }
    return {
      hasKey: true,
      keyHint: row.key_hint,
      source: 'database' as const,
      isActive: row.is_active,
      lastTestedAt: row.last_tested_at,
      lastTestStatus: row.last_test_status,
      lastTestError: row.last_test_error,
      version: row.version,
      updatedAt: row.updated_at,
    }
  }

  async resolveApiKey(): Promise<string> {
    const now = Date.now()
    if (this.credentialCache && this.credentialCache.expiresAt > now) {
      if (this.credentialCache.value) return this.credentialCache.value
    }

    const { rows } = await this.app.db.query<Pick<CredentialRow, 'encrypted_key' | 'is_active'>>(
      `SELECT encrypted_key, is_active FROM ai_provider_credentials WHERE provider = $1 LIMIT 1`,
      [OPENROUTER_PROVIDER]
    )
    const row = rows[0]
    if (row?.is_active) {
      const key = decryptSecret(row.encrypted_key)
      this.credentialCache = { value: key, expiresAt: now + CACHE_TTL_MS }
      return key
    }

    if (env.OPENROUTER_API_KEY) {
      this.credentialCache = { value: env.OPENROUTER_API_KEY, expiresAt: now + CACHE_TTL_MS }
      return env.OPENROUTER_API_KEY
    }

    this.credentialCache = { value: null, expiresAt: now + CACHE_TTL_MS }
    throw new AiProviderError('OpenRouter API key is not configured', {
      statusCode: 503,
      code: 'MISSING_OPENROUTER_API_KEY',
    })
  }

  async saveCredential(actorUserId: string, input: unknown) {
    const data = saveKeySchema.parse(input)
    const encrypted = encryptSecret(data.apiKey)
    const hint = secretHint(data.apiKey)

    const current = await this.getCredentialStatus()
    if (data.expectedVersion != null && current.version !== data.expectedVersion) {
      throw Object.assign(new Error('Credential was modified by another admin'), {
        statusCode: 409,
      })
    }

    const { rows } = await this.app.db.query<CredentialRow>(
      `INSERT INTO ai_provider_credentials (provider, encrypted_key, key_hint, is_active, updated_by, updated_at, version)
       VALUES ($1, $2, $3, TRUE, $4, NOW(), 1)
       ON CONFLICT (provider)
       DO UPDATE SET
         encrypted_key = EXCLUDED.encrypted_key,
         key_hint = EXCLUDED.key_hint,
         is_active = TRUE,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW(),
         version = ai_provider_credentials.version + 1
       RETURNING id, encrypted_key, key_hint, is_active, last_tested_at, last_test_status, last_test_error, version, updated_at`,
      [OPENROUTER_PROVIDER, encrypted, hint, actorUserId]
    )

    this.invalidateCaches()
    await this.audit(actorUserId, 'credential.save', 'ai_provider_credentials', rows[0]?.id ?? null, {
      hasKey: current.hasKey,
      keyHint: current.keyHint,
      version: current.version,
    }, {
      hasKey: true,
      keyHint: hint,
      version: rows[0]?.version,
    })

    return this.getCredentialStatus()
  }

  async deleteCredential(actorUserId: string) {
    const current = await this.getCredentialStatus()
    await this.app.db.query(`DELETE FROM ai_provider_credentials WHERE provider = $1`, [
      OPENROUTER_PROVIDER,
    ])
    this.invalidateCaches()
    await this.audit(actorUserId, 'credential.delete', 'ai_provider_credentials', null, current, {
      hasKey: false,
    })
    return this.getCredentialStatus()
  }

  async testCredential(actorUserId: string) {
    const apiKey = await this.resolveApiKey()
    const client = new OpenRouterClient(apiKey)
    const result = await client.testConnection()

    await this.app.db.query(
      `UPDATE ai_provider_credentials
       SET last_tested_at = NOW(),
           last_test_status = $2,
           last_test_error = $3,
           updated_at = NOW()
       WHERE provider = $1`,
      [OPENROUTER_PROVIDER, result.ok ? 'ok' : 'error', result.error ?? null]
    )

    await this.audit(actorUserId, 'credential.test', 'ai_provider_credentials', null, null, result)
    return { ...result, status: await this.getCredentialStatus() }
  }

  async getPolicy(workload: AiWorkload): Promise<PolicyRow> {
    const now = Date.now()
    const cached = this.policyCache.get(workload)
    if (cached && cached.expiresAt > now) return cached.value

    const { rows } = await this.app.db.query<PolicyRow>(
      `SELECT id, workload, provider, model_chain, require_structured_outputs, prefer_zdr, is_enabled, notes, version, updated_at
       FROM ai_workload_policies
       WHERE workload = $1
       LIMIT 1`,
      [workload]
    )
    const row = rows[0]
    if (!row || !row.is_enabled) {
      throw new AiProviderError(`AI workload policy unavailable: ${workload}`, {
        statusCode: 503,
        code: 'POLICY_DISABLED',
      })
    }
    this.policyCache.set(workload, { value: row, expiresAt: now + CACHE_TTL_MS })
    return row
  }

  async listPolicies() {
    const { rows } = await this.app.db.query<PolicyRow>(
      `SELECT id, workload, provider, model_chain, require_structured_outputs, prefer_zdr, is_enabled, notes, version, updated_at
       FROM ai_workload_policies
       ORDER BY workload ASC`
    )
    return rows
  }

  async updatePolicy(actorUserId: string, workload: string, input: unknown) {
    if (!AI_WORKLOADS.includes(workload as AiWorkload)) {
      throw Object.assign(new Error('Unknown workload'), { statusCode: 400 })
    }
    const data = updatePolicySchema.parse(input)
    const modelChain = data.modelChain.map((model) => model.trim()).filter(Boolean)
    if (modelChain.length === 0) {
      throw Object.assign(new Error('At least one model is required'), { statusCode: 400 })
    }

    const { rows: beforeRows } = await this.app.db.query<PolicyRow>(
      `SELECT id, workload, provider, model_chain, require_structured_outputs, prefer_zdr, is_enabled, notes, version, updated_at
       FROM ai_workload_policies WHERE workload = $1 LIMIT 1`,
      [workload]
    )
    const before = beforeRows[0]
    if (!before) {
      throw Object.assign(new Error('Policy not found'), { statusCode: 404 })
    }
    if (before.version !== data.expectedVersion) {
      throw Object.assign(new Error('Policy was modified by another admin'), { statusCode: 409 })
    }

    const { rows } = await this.app.db.query<PolicyRow>(
      `UPDATE ai_workload_policies
       SET model_chain = $2,
           require_structured_outputs = COALESCE($3, require_structured_outputs),
           prefer_zdr = COALESCE($4, prefer_zdr),
           is_enabled = COALESCE($5, is_enabled),
           notes = COALESCE($6, notes),
           updated_by = $7,
           updated_at = NOW(),
           version = version + 1
       WHERE workload = $1 AND version = $8
       RETURNING id, workload, provider, model_chain, require_structured_outputs, prefer_zdr, is_enabled, notes, version, updated_at`,
      [
        workload,
        modelChain,
        data.requireStructuredOutputs ?? null,
        data.preferZdr ?? null,
        data.isEnabled ?? null,
        data.notes === undefined ? null : data.notes,
        actorUserId,
        data.expectedVersion,
      ]
    )

    if (!rows[0]) {
      throw Object.assign(new Error('Policy was modified by another admin'), { statusCode: 409 })
    }

    this.invalidateCaches()
    await this.audit(actorUserId, 'policy.update', 'ai_workload_policies', workload, before, rows[0])
    return rows[0]
  }

  async listCatalog(options?: { enabledOnly?: boolean }) {
    const { rows } = await this.app.db.query<CatalogRow>(
      `SELECT id, model_id, display_name, context_length, input_modalities, output_modalities,
              supported_parameters, prompt_price_per_million::text, completion_price_per_million::text,
              is_enabled, is_deprecated, synced_at
       FROM ai_model_catalog
       WHERE ($1::boolean IS NULL OR is_enabled = $1)
       ORDER BY is_enabled DESC, display_name ASC`,
      [options?.enabledOnly ?? null]
    )
    return rows
  }

  async setModelEnabled(actorUserId: string, input: unknown) {
    const data = setModelEnabledSchema.parse(input)
    const { rows } = await this.app.db.query<CatalogRow>(
      `UPDATE ai_model_catalog
       SET is_enabled = $2, updated_at = NOW()
       WHERE provider = $3 AND model_id = $1
       RETURNING id, model_id, display_name, context_length, input_modalities, output_modalities,
                 supported_parameters, prompt_price_per_million::text, completion_price_per_million::text,
                 is_enabled, is_deprecated, synced_at`,
      [data.modelId, data.isEnabled, OPENROUTER_PROVIDER]
    )
    if (!rows[0]) {
      throw Object.assign(new Error('Model not found in catalog'), { statusCode: 404 })
    }
    await this.audit(actorUserId, 'catalog.set_enabled', 'ai_model_catalog', data.modelId, null, {
      isEnabled: data.isEnabled,
    })
    return rows[0]
  }

  async syncCatalog(actorUserId: string) {
    const apiKey = await this.resolveApiKey()
    const client = new OpenRouterClient(apiKey)
    const models = (await client.listModels()) as Array<{
      id?: string
      name?: string
      context_length?: number
      architecture?: { input_modalities?: string[]; output_modalities?: string[] }
      supported_parameters?: string[]
      pricing?: { prompt?: string; completion?: string }
    }>

    let upserted = 0
    for (const model of models) {
      if (!model.id) continue
      const prompt = model.pricing?.prompt != null ? Number(model.pricing.prompt) * 1_000_000 : null
      const completion =
        model.pricing?.completion != null ? Number(model.pricing.completion) * 1_000_000 : null
      await this.app.db.query(
        `INSERT INTO ai_model_catalog (
           provider, model_id, display_name, context_length, input_modalities, output_modalities,
           supported_parameters, prompt_price_per_million, completion_price_per_million, raw_metadata, synced_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, NOW(), NOW()
         )
         ON CONFLICT (provider, model_id)
         DO UPDATE SET
           display_name = EXCLUDED.display_name,
           context_length = EXCLUDED.context_length,
           input_modalities = EXCLUDED.input_modalities,
           output_modalities = EXCLUDED.output_modalities,
           supported_parameters = EXCLUDED.supported_parameters,
           prompt_price_per_million = EXCLUDED.prompt_price_per_million,
           completion_price_per_million = EXCLUDED.completion_price_per_million,
           raw_metadata = EXCLUDED.raw_metadata,
           synced_at = NOW(),
           updated_at = NOW()`,
        [
          OPENROUTER_PROVIDER,
          model.id,
          model.name || model.id,
          model.context_length ?? null,
          model.architecture?.input_modalities || ['text'],
          model.architecture?.output_modalities || ['text'],
          model.supported_parameters || [],
          Number.isFinite(prompt) ? prompt : null,
          Number.isFinite(completion) ? completion : null,
          JSON.stringify(model),
        ]
      )
      upserted += 1
    }

    // Ensure seeded policy models are enabled by default when present.
    await this.app.db.query(
      `UPDATE ai_model_catalog c
       SET is_enabled = TRUE, updated_at = NOW()
       WHERE c.provider = $1
         AND c.model_id = ANY (
           SELECT DISTINCT unnest(p.model_chain)
           FROM ai_workload_policies p
         )`,
      [OPENROUTER_PROVIDER]
    )

    await this.audit(actorUserId, 'catalog.sync', 'ai_model_catalog', null, null, { upserted })
    return { upserted, items: await this.listCatalog() }
  }

  async getAdminOverview() {
    const [credential, policies, catalog] = await Promise.all([
      this.getCredentialStatus(),
      this.listPolicies(),
      this.listCatalog(),
    ])
    return {
      credential,
      policies,
      catalog,
      workloads: AI_WORKLOADS,
    }
  }
}
