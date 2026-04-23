/**
 * Token balances, usage settings, and deductions.
 * Uses Supabase RPC for atomic deduct/add.
 */

import { getDbClient } from '../client'
import type {
  TokenUsageSetting,
  TokenTransaction,
  DeductTokensResult,
  TokenCostParams,
  ModelPricingSetting,
  ModelUsageCostSummary,
} from '@eduator/core/types/token'
import { TOKEN_ACTION_TYPES, TOKEN_SETTING_KEYS } from '@eduator/core/types/token'
import { getTokenCost } from '@eduator/core/utils'

function readMetaNumber(meta: Record<string, unknown> | null | undefined, keys: string[]): number {
  for (const key of keys) {
    const v = meta?.[key]
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return 0
}

function readMetaString(meta: Record<string, unknown> | null | undefined, keys: string[]): string | null {
  for (const key of keys) {
    const v = meta?.[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

function normalizeUsageMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...metadata }
  const model =
    readMetaString(metadata, ['model_used', 'ai_model_used', 'model']) ?? null
  if (model) normalized.model_used = normalizeModelKey(model)

  const promptTokens = readMetaNumber(metadata, ['prompt_tokens', 'input_tokens'])
  const completionTokens = readMetaNumber(metadata, ['completion_tokens', 'output_tokens'])
  const totalTokens = readMetaNumber(metadata, ['total_tokens', 'tokens_used'])

  if (promptTokens > 0 && normalized.input_tokens == null) normalized.input_tokens = promptTokens
  if (promptTokens > 0 && normalized.prompt_tokens == null) normalized.prompt_tokens = promptTokens
  if (completionTokens > 0 && normalized.output_tokens == null) normalized.output_tokens = completionTokens
  if (completionTokens > 0 && normalized.completion_tokens == null) normalized.completion_tokens = completionTokens
  if (totalTokens > 0 && normalized.tokens_used == null) normalized.tokens_used = totalTokens
  if (totalTokens > 0 && normalized.total_tokens == null) normalized.total_tokens = totalTokens

  return normalized
}

function normalizeModelKey(raw: string | null | undefined): string {
  const value = (raw ?? '').trim()
  if (!value) return 'unknown'
  const lower = value.toLowerCase()

  const aliases: Record<string, string> = {
    gemini_flash: 'models/gemini-2.5-flash',
    gemini_pro: 'models/gemini-2.5-flash',
    'gemini-2.5-flash': 'models/gemini-2.5-flash',
    'models/gemini-2.5-flash': 'models/gemini-2.5-flash',
    gemini_tts: 'gemini-2.5-flash-preview-tts',
    'gemini-2.5-flash-preview-tts': 'gemini-2.5-flash-preview-tts',
    gemini_embedding: 'gemini-embedding-001',
    'embedding-001': 'gemini-embedding-001',
    'gemini-embedding-001': 'gemini-embedding-001',
    'gemini-3-pro-image-preview': 'gemini-3-pro-image-preview',
    'models/gemini-3-pro-image-preview': 'gemini-3-pro-image-preview',
    'gemini-2.5-flash-image-preview': 'gemini-2.5-flash-image-preview',
    'models/gemini-2.5-flash-image-preview': 'gemini-2.5-flash-image-preview',
  }

  if (aliases[lower]) return aliases[lower]
  return value
}

export const tokenRepository = {
  /**
   * Get current balance for a profile. Returns 0 if no row exists.
   */
  async getBalance(profileId: string): Promise<number> {
    const supabase = getDbClient()
    const { data, error } = await supabase
      .from('token_balances')
      .select('balance')
      .eq('profile_id', profileId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting token balance:', error)
      return 0
    }
    return (data?.balance as number) ?? 0
  },

  /**
   * Get token balances for multiple profiles in one query. Returns a Map of profileId -> balance (0 if no row).
   */
  async getBalancesForProfiles(profileIds: string[]): Promise<Map<string, number>> {
    if (profileIds.length === 0) return new Map()
    const supabase = getDbClient()
    const { data, error } = await supabase
      .from('token_balances')
      .select('profile_id, balance')
      .in('profile_id', profileIds)

    if (error) {
      console.error('Error getting token balances for profiles:', error)
      return new Map(profileIds.map((id) => [id, 0]))
    }
    const map = new Map<string, number>()
    for (const id of profileIds) map.set(id, 0)
    for (const row of (data as { profile_id: string; balance: number }[]) ?? []) {
      map.set(row.profile_id, Number(row.balance || 0))
    }
    return map
  },

  /**
   * Get the configured initial token amount for new users (from token_usage_settings).
   * Returns 0 if the setting is missing or set to 0.
   */
  async getInitialTokensForNewUsers(): Promise<number> {
    const settings = await this.getUsageSettings()
    const row = settings.find((s) => s.key === TOKEN_SETTING_KEYS.INITIAL_TOKENS_FOR_NEW_USERS)
    return row && row.tokens > 0 ? row.tokens : 0
  },

  /**
   * Grant the configured initial tokens to a newly registered user.
   * No-op if the platform setting is 0 or missing. Returns new balance or null.
   */
  async grantInitialTokensForNewUser(profileId: string): Promise<number | null> {
    const amount = await this.getInitialTokensForNewUsers()
    if (amount <= 0) return null
    return this.addTokens(
      profileId,
      amount,
      TOKEN_ACTION_TYPES.INITIAL_GRANT,
      null,
      { reason: 'new_user' }
    )
  },

  /**
   * Ensure the "initial tokens for new users" row exists (so platform owner can always edit it).
   * Inserts with default 100 if missing. Idempotent.
   */
  async ensureInitialTokensForNewUsersSetting(): Promise<void> {
    const settings = await this.getUsageSettings()
    if (settings.some((s) => s.key === TOKEN_SETTING_KEYS.INITIAL_TOKENS_FOR_NEW_USERS)) return
    const supabase = getDbClient()
    await supabase.from('token_usage_settings').insert({
      key: TOKEN_SETTING_KEYS.INITIAL_TOKENS_FOR_NEW_USERS,
      label: 'Initial tokens for new users',
      tokens: 100,
      extra: {},
      updated_at: new Date().toISOString(),
    })
  },

  /**
   * Ensure the "exam translation" setting row exists for platform owner configuration.
   * Inserts with default 1 token per 10 questions if missing.
   */
  async ensureExamTranslationSetting(): Promise<void> {
    const settings = await this.getUsageSettings()
    if (settings.some((s) => s.key === TOKEN_SETTING_KEYS.EXAM_TRANSLATION_PER_10_QUESTIONS)) return
    const supabase = getDbClient()
    await supabase.from('token_usage_settings').insert({
      key: TOKEN_SETTING_KEYS.EXAM_TRANSLATION_PER_10_QUESTIONS,
      label: 'Exam translation',
      tokens: 1,
      extra: { per_questions: 10 },
      updated_at: new Date().toISOString(),
    })
  },

  /**
   * Ensure the "RAG indexing" setting row exists for platform owner configuration.
   * Inserts with default 1 token per processed document if missing.
   */
  async ensureRagIndexingSetting(): Promise<void> {
    const settings = await this.getUsageSettings()
    if (settings.some((s) => s.key === TOKEN_SETTING_KEYS.RAG_INDEXING_PER_DOCUMENT)) return
    const supabase = getDbClient()
    await supabase.from('token_usage_settings').insert({
      key: TOKEN_SETTING_KEYS.RAG_INDEXING_PER_DOCUMENT,
      label: 'RAG indexing',
      tokens: 1,
      extra: { per_documents: 1 },
      updated_at: new Date().toISOString(),
    })
  },

  /**
   * Ensure the "education plan generation" setting row exists for platform owner configuration.
   * Inserts with default 2 tokens per plan generation if missing.
   */
  async ensureEducationPlanGenerationSetting(): Promise<void> {
    const settings = await this.getUsageSettings()
    if (settings.some((s) => s.key === TOKEN_SETTING_KEYS.EDUCATION_PLAN_GENERATION)) return
    const supabase = getDbClient()
    await supabase.from('token_usage_settings').insert({
      key: TOKEN_SETTING_KEYS.EDUCATION_PLAN_GENERATION,
      label: 'Education plan generation',
      tokens: 2,
      extra: {},
      updated_at: new Date().toISOString(),
    })
  },

  /**
   * Get all token usage settings (for platform owner and for cost calculation).
   */
  async getUsageSettings(): Promise<TokenUsageSetting[]> {
    const supabase = getDbClient()
    const { data, error } = await supabase
      .from('token_usage_settings')
      .select('id, key, label, tokens, extra, updated_at')
      .order('key')

    if (error) {
      console.error('Error getting token usage settings:', error)
      return []
    }
    return (data as TokenUsageSetting[]) ?? []
  },

  /**
   * Update one token usage setting by key.
   */
  async updateUsageSetting(
    key: string,
    payload: { tokens?: number; label?: string; extra?: Record<string, unknown> }
  ): Promise<TokenUsageSetting | null> {
    const supabase = getDbClient()
    const { data, error } = await supabase
      .from('token_usage_settings')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('key', key)
      .select()
      .single()

    if (error) {
      console.error('Error updating token usage setting:', error)
      return null
    }
    return data as TokenUsageSetting
  },

  async getModelPricingSettings(provider: 'gemini' = 'gemini'): Promise<ModelPricingSetting[]> {
    const supabase = getDbClient()
    const { data, error } = await supabase
      .from('model_pricing_settings')
      .select(
        'id, provider, model_key, display_name, input_cost_per_1m_tokens_usd, output_cost_per_1m_tokens_usd, source_url, effective_from, is_active, updated_at'
      )
      .eq('provider', provider)
      .eq('is_active', true)
      .order('model_key')

    if (error) {
      console.error('Error getting model pricing settings:', error)
      return []
    }
    return ((data as ModelPricingSetting[]) ?? []).map((row) => ({
      ...row,
      input_cost_per_1m_tokens_usd: Number(row.input_cost_per_1m_tokens_usd ?? 0),
      output_cost_per_1m_tokens_usd: Number(row.output_cost_per_1m_tokens_usd ?? 0),
    }))
  },

  async updateModelPricingSetting(input: {
    id: string
    inputCostPer1M: number
    outputCostPer1M: number
    displayName?: string
    sourceUrl?: string | null
  }): Promise<boolean> {
    const supabase = getDbClient()
    const { error } = await supabase
      .from('model_pricing_settings')
      .update({
        input_cost_per_1m_tokens_usd: input.inputCostPer1M,
        output_cost_per_1m_tokens_usd: input.outputCostPer1M,
        display_name: input.displayName,
        source_url: input.sourceUrl ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id)

    if (error) {
      console.error('Error updating model pricing setting:', error)
      return false
    }
    return true
  },

  async getModelUsageCostSummaryAdmin(options: {
    since?: string
    limit?: number
  }): Promise<{
    rows: ModelUsageCostSummary[]
    totals: {
      inputTokens: number
      outputTokens: number
      totalTokens: number
      estimatedCostUsd: number
    }
  }> {
    const { data: transactions } = await this.getTransactionsAdmin({
      since: options.since,
      limit: options.limit ?? 5000,
    })
    const pricing = await this.getModelPricingSettings('gemini')
    const pricingByModel = new Map(pricing.map((p) => [p.model_key, p]))

    const byModel = new Map<
      string,
      {
        modelKey: string
        displayName: string
        provider: 'gemini' | 'unknown'
        inputTokens: number
        outputTokens: number
        totalTokens: number
        estimatedCostUsd: number
        txCount: number
      }
    >()

    const addUsage = (
      modelKeyRaw: string | null | undefined,
      inputTokens: number,
      outputTokens: number,
      totalTokens: number
    ) => {
      const modelKey = normalizeModelKey(modelKeyRaw)
      const pricingRow = pricingByModel.get(modelKey)
      const inputCostPer1M = Number(pricingRow?.input_cost_per_1m_tokens_usd ?? 0)
      const outputCostPer1M = Number(pricingRow?.output_cost_per_1m_tokens_usd ?? 0)
      const estimatedCostUsd =
        inputTokens * (inputCostPer1M / 1_000_000) + outputTokens * (outputCostPer1M / 1_000_000)

      const existing = byModel.get(modelKey) ?? {
        modelKey,
        displayName: pricingRow?.display_name ?? modelKey,
        provider: pricingRow ? 'gemini' : 'unknown',
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        txCount: 0,
      }
      existing.inputTokens += inputTokens
      existing.outputTokens += outputTokens
      existing.totalTokens += totalTokens
      existing.estimatedCostUsd += estimatedCostUsd
      existing.txCount += 1
      byModel.set(modelKey, existing)
    }

    for (const tx of transactions) {
      if (tx.amount >= 0) continue
      const meta = (tx.metadata as Record<string, unknown> | null) ?? null
      const textModelKey = readMetaString(meta, ['model_used', 'ai_model_used', 'model']) ?? 'unknown'
      const imageModelKey = readMetaString(meta, ['image_model_used', 'image_generator_model_used'])

      const textInput =
        readMetaNumber(meta, ['input_tokens', 'prompt_tokens']) +
        readMetaNumber(meta, ['translation_input_tokens', 'translation_prompt_tokens']) +
        readMetaNumber(meta, ['tts_prompt_tokens'])
      const textOutput =
        readMetaNumber(meta, ['output_tokens', 'completion_tokens']) +
        readMetaNumber(meta, ['translation_output_tokens', 'translation_completion_tokens']) +
        readMetaNumber(meta, ['tts_completion_tokens'])
      const imageInput = readMetaNumber(meta, ['image_prompt_tokens'])
      const imageOutput = readMetaNumber(meta, ['image_completion_tokens'])

      const textTotal =
        readMetaNumber(meta, ['total_tokens', 'tokens_used', 'translation_total_tokens']) ||
        textInput + textOutput
      const imageTotal = readMetaNumber(meta, ['image_total_tokens']) || imageInput + imageOutput

      if (textInput > 0 || textOutput > 0 || textTotal > 0) {
        addUsage(textModelKey, textInput, textOutput, textTotal)
      }
      if ((imageInput > 0 || imageOutput > 0 || imageTotal > 0) && imageModelKey) {
        addUsage(imageModelKey, imageInput, imageOutput, imageTotal)
      }
    }

    const rows: ModelUsageCostSummary[] = Array.from(byModel.values())
      .filter((row) => row.inputTokens > 0 || row.outputTokens > 0 || row.totalTokens > 0 || row.estimatedCostUsd > 0)
      .sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd)
      .map((row) => ({
        ...row,
        estimatedCostUsd: Number(row.estimatedCostUsd.toFixed(6)),
      }))

    const totals = rows.reduce(
      (acc, row) => {
        acc.inputTokens += row.inputTokens
        acc.outputTokens += row.outputTokens
        acc.totalTokens += row.totalTokens
        acc.estimatedCostUsd += row.estimatedCostUsd
        return acc
      },
      { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUsd: 0 }
    )

    return {
      rows,
      totals: {
        ...totals,
        estimatedCostUsd: Number(totals.estimatedCostUsd.toFixed(6)),
      },
    }
  },

  /**
   * Deduct tokens for an AI action: loads settings, computes cost, deducts.
   * Use this before running any AI. Returns { success, errorMessage?, cost? }.
   * On insufficient balance, errorMessage includes required cost and current balance.
   */
  async deductTokensForAction(
    profileId: string,
    actionType: keyof TokenCostParams,
    params: TokenCostParams[keyof TokenCostParams],
    referenceId?: string | null
  ): Promise<{ success: boolean; errorMessage?: string; cost?: number }> {
    const settings = await this.getUsageSettings()
    const cost = getTokenCost(actionType, params, settings)
    if (cost <= 0) {
      return { success: true, cost: 0 }
    }
    const actionTypeStr = actionType as string
    const result = await this.deductTokens(profileId, cost, actionTypeStr, referenceId)
    if (!result.success) {
      const currentBalance = result.new_balance != null ? result.new_balance : await this.getBalance(profileId)
      const message =
        result.error_message === 'Insufficient tokens' || !result.error_message
          ? `Not enough tokens. This action requires ${cost} tokens. Your balance: ${currentBalance}. Please buy more tokens or contact your administrator.`
          : result.error_message
      return { success: false, errorMessage: message }
    }
    return { success: true, cost }
  },

  /**
   * Atomically deduct tokens. Call before running AI.
   * Returns { success, new_balance, error_message }.
   */
  async deductTokens(
    profileId: string,
    cost: number,
    actionType: string,
    referenceId?: string | null,
    metadata?: Record<string, unknown>
  ): Promise<DeductTokensResult> {
    if (cost <= 0) {
      return { success: true, new_balance: null, error_message: null }
    }

    const supabase = getDbClient()
    const { data, error } = await supabase.rpc('deduct_tokens', {
      p_profile_id: profileId,
      p_cost: cost,
      p_action_type: actionType,
      p_reference_id: referenceId ?? null,
      p_metadata: metadata ?? {},
    })

    if (error) {
      console.error('Error deducting tokens:', error)
      return {
        success: false,
        new_balance: null,
        error_message: error.message || 'Failed to deduct tokens',
      }
    }

    const row = Array.isArray(data) ? data[0] : data
    if (!row) {
      return { success: false, new_balance: null, error_message: 'No result from deduct_tokens' }
    }

    return {
      success: row.success === true,
      new_balance: row.new_balance != null ? Number(row.new_balance) : null,
      error_message: row.error_message ?? null,
    }
  },

  /**
   * Add tokens (e.g. after purchase or admin grant).
   */
  async addTokens(
    profileId: string,
    amount: number,
    actionType: string,
    referenceId?: string | null,
    metadata?: Record<string, unknown>
  ): Promise<number | null> {
    if (amount <= 0) return null

    const supabase = getDbClient()
    const { data, error } = await supabase.rpc('add_tokens', {
      p_profile_id: profileId,
      p_amount: amount,
      p_action_type: actionType,
      p_reference_id: referenceId ?? null,
      p_metadata: metadata ?? {},
    })

    if (error) {
      console.error('Error adding tokens:', error)
      return null
    }

    const row = Array.isArray(data) ? data[0] : data
    return row?.new_balance != null ? Number(row.new_balance) : null
  },

  /**
   * List recent transactions for a profile (for user history).
   */
  async getTransactions(
    profileId: string,
    limit = 50
  ): Promise<TokenTransaction[]> {
    const supabase = getDbClient()
    const { data, error } = await supabase
      .from('token_transactions')
      .select('id, profile_id, amount, balance_after, action_type, reference_id, metadata, created_at')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error getting token transactions:', error)
      return []
    }
    return (data as TokenTransaction[]) ?? []
  },

  /**
   * List recent transactions (platform owner: all or by profile).
   * Use since (ISO date string) to fetch transactions from that date onward (e.g. for charts).
   */
  async getTransactionsAdmin(options: {
    profileId?: string
    actionType?: string
    since?: string
    limit?: number
    offset?: number
  }): Promise<{ data: TokenTransaction[]; count: number }> {
    const supabase = getDbClient()
    let query = supabase
      .from('token_transactions')
      .select('id, profile_id, amount, balance_after, action_type, reference_id, metadata, created_at', {
        count: 'exact',
      })
      .order('created_at', { ascending: false })

    if (options.profileId) query = query.eq('profile_id', options.profileId)
    if (options.actionType) query = query.eq('action_type', options.actionType)
    if (options.since) query = query.gte('created_at', options.since)
    query = query.range(
      options.offset ?? 0,
      (options.offset ?? 0) + (options.limit ?? 50) - 1
    )

    const { data, error, count } = await query

    if (error) {
      console.error('Error getting token transactions (admin):', error)
      return { data: [], count: 0 }
    }
    return { data: (data as TokenTransaction[]) ?? [], count: count ?? 0 }
  },

  /**
   * List recent transactions with profile info (platform owner).
   */
  async getTransactionsAdminWithProfiles(options: {
    profileId?: string
    actionType?: string
    since?: string
    limit?: number
    offset?: number
  }): Promise<{ data: (TokenTransaction & { profile?: { id: string; full_name: string; email: string; source?: 'erp' | 'api' | null } | null })[]; count: number }> {
    const { data: transactions, count } = await this.getTransactionsAdmin(options)
    if (transactions.length === 0) return { data: [], count }

    const supabase = getDbClient()
    const profileIds = [...new Set(transactions.map((t) => t.profile_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, source')
      .in('id', profileIds)
    const profilesMap = new Map(
      (profiles as { id: string; full_name: string; email: string; source?: 'erp' | 'api' | null }[] ?? []).map((p) => [p.id, p])
    )

    const data = transactions.map((t) => ({
      ...t,
      profile: profilesMap.get(t.profile_id) ?? null,
    }))
    return { data, count }
  },

  /**
   * Aggregate: total tokens spent (sum of negative amounts). Platform owner.
   * Uses a high limit to include all transactions (Supabase default is 1000).
   */
  async getUsageStatsAdmin(): Promise<{ totalTokensSpent: number }> {
    const supabase = getDbClient()
    const { data, error } = await supabase
      .from('token_transactions')
      .select('amount')
      .lt('amount', 0)
      .limit(100000)

    if (error) {
      console.error('Error getting usage stats:', error)
      return { totalTokensSpent: 0 }
    }
    const total = (data as { amount: number }[] ?? []).reduce((sum, row) => sum + row.amount, 0)
    return { totalTokensSpent: Math.abs(total) }
  },

  /**
   * All-time usage by action type (spent) and credits by action type (granted). Platform owner.
   * Used for the breakdown chart so numbers match real totals (e.g. all courses generated).
   */
  async getUsageAndCreditsByActionTypeAdmin(): Promise<{
    usageByActionType: { actionType: string; total: number }[]
    creditsByActionType: { actionType: string; total: number }[]
  }> {
    const supabase = getDbClient()
    const { data, error } = await supabase
      .from('token_transactions')
      .select('action_type, amount')
      .limit(100000)

    if (error) {
      console.error('Error getting usage/credits by action type:', error)
      return { usageByActionType: [], creditsByActionType: [] }
    }

    const rows = (data as { action_type: string; amount: number }[]) ?? []
    const usageMap = new Map<string, number>()
    const creditsMap = new Map<string, number>()
    for (const row of rows) {
      if (row.amount < 0) {
        usageMap.set(
          row.action_type,
          (usageMap.get(row.action_type) ?? 0) + Math.abs(row.amount)
        )
      } else {
        creditsMap.set(
          row.action_type,
          (creditsMap.get(row.action_type) ?? 0) + row.amount
        )
      }
    }

    const usageByActionType = Array.from(usageMap.entries())
      .map(([actionType, total]) => ({ actionType, total }))
      .sort((a, b) => b.total - a.total)
    const creditsByActionType = Array.from(creditsMap.entries())
      .map(([actionType, total]) => ({ actionType, total }))
      .sort((a, b) => b.total - a.total)

    return { usageByActionType, creditsByActionType }
  },

  /**
   * Attach real AI token telemetry to the latest matching usage transaction.
   * Best-effort helper for flows that deduct tokens before the AI call completes.
   */
  async attachMetadataToLatestUsageTransaction(
    profileId: string,
    actionType: string,
    metadata: Record<string, unknown>
  ): Promise<boolean> {
    const supabase = getDbClient()
    const { data: tx, error: findError } = await supabase
      .from('token_transactions')
      .select('id, metadata')
      .eq('profile_id', profileId)
      .eq('action_type', actionType)
      .lt('amount', 0)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (findError || !tx?.id) {
      if (findError) console.error('Error finding latest token transaction for metadata attach:', findError)
      return false
    }

    const mergedMetadata = normalizeUsageMetadata({
      ...((tx.metadata as Record<string, unknown> | null) ?? {}),
      ...metadata,
    })

    const { error: updateError } = await supabase
      .from('token_transactions')
      .update({ metadata: mergedMetadata })
      .eq('id', tx.id)

    if (updateError) {
      console.error('Error updating token transaction metadata:', updateError)
      return false
    }
    return true
  },

  /**
   * Attach metadata to a specific usage transaction identified by reference_id.
   * Useful for async flows (e.g. background TTS) to avoid updating the wrong latest row.
   */
  async attachMetadataToUsageTransactionByReference(
    profileId: string,
    actionType: string,
    referenceId: string,
    metadata: Record<string, unknown>
  ): Promise<boolean> {
    const supabase = getDbClient()
    const { data: tx, error: findError } = await supabase
      .from('token_transactions')
      .select('id, metadata')
      .eq('profile_id', profileId)
      .eq('action_type', actionType)
      .eq('reference_id', referenceId)
      .lt('amount', 0)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (findError || !tx?.id) {
      if (findError) console.error('Error finding token transaction by reference_id:', findError)
      return false
    }

    const mergedMetadata = normalizeUsageMetadata({
      ...((tx.metadata as Record<string, unknown> | null) ?? {}),
      ...metadata,
    })

    const { error: updateError } = await supabase
      .from('token_transactions')
      .update({ metadata: mergedMetadata })
      .eq('id', tx.id)

    if (updateError) {
      console.error('Error updating token transaction metadata by reference_id:', updateError)
      return false
    }
    return true
  },
}

export { TOKEN_ACTION_TYPES }
export { paymentsRepository } from './payments'
