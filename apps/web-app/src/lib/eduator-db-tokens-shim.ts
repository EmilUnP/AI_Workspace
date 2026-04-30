type UsageTransaction = {
  id: string
  profile_id: string
  amount: number
  action_type: string
  created_at: string
  metadata?: Record<string, unknown> | null
  profile?: { id: string; full_name: string; email: string; source?: 'erp' | 'api' | null } | null
}

type PaymentRecord = {
  id: string
  profile_id: string | null
  amount_cents: number
  currency: string
  status: string
  tokens_granted: number
  created_at: string
  paid_at: string | null
  profile?: { id: string; full_name: string; email: string } | null
}

const emptyList = <T,>() => ({ data: [] as T[], count: 0 })
const defaultPricingSource = 'https://ai.google.dev/gemini-api/docs/pricing'
const defaultModelPricing = [
  {
    id: 'pricing-gemini-25-flash',
    model_key: 'models/gemini-2.5-flash',
    model_label: 'Gemini 2.5 Flash',
    input_cost_per_million: 0.35,
    output_cost_per_million: 1.05,
    source_url: defaultPricingSource,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pricing-gemini-embedding-001',
    model_key: 'gemini-embedding-001',
    model_label: 'Gemini Embedding 001',
    input_cost_per_million: 0.15,
    output_cost_per_million: 0,
    source_url: defaultPricingSource,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pricing-gemini-tts',
    model_key: 'gemini-2.5-flash-preview-tts',
    model_label: 'Gemini 2.5 Flash TTS',
    input_cost_per_million: 0.5,
    output_cost_per_million: 10,
    source_url: defaultPricingSource,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pricing-gemini-2.5-flash-image',
    model_key: 'gemini-2.5-flash-image-preview',
    model_label: 'Gemini 2.5 Flash Image Preview',
    input_cost_per_million: 0.7,
    output_cost_per_million: 0,
    source_url: defaultPricingSource,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pricing-gemini-3-pro-image',
    model_key: 'gemini-3-pro-image-preview',
    model_label: 'Gemini 3 Pro Image Preview',
    input_cost_per_million: 1.2,
    output_cost_per_million: 0,
    source_url: defaultPricingSource,
    updated_at: new Date().toISOString(),
  },
]

export const tokenRepository = {
  async ensureEducationPlanGenerationSetting() {},
  async ensureInitialTokensForNewUsersSetting() {},
  async ensureExamTranslationSetting() {},
  async ensureRagIndexingSetting() {},

  async getUsageSettings() { return [] },
  async updateUsageSetting(_key: string, _payload: unknown) { return { data: null, error: null } },
  async updateModelPricingSetting(_payload: unknown) { return true },
  async getModelPricingSettings(_provider: string) { return defaultModelPricing },

  async deductTokensForAction(_profileId: string, _actionType: string, _meta: unknown) {
    return { success: true, cost: 0, balance: 0, transaction: null }
  },
  async attachMetadataToLatestUsageTransaction(_profileId: string, _actionType: string, _usage: unknown) {},
  async addTokens(_profileId: string, _amount: number, _actionType: string, _refId?: string, _meta?: unknown) {},
  async grantInitialTokensForNewUser(_profileId: string) {},

  async getBalance(_profileId: string) { return 0 },
  async getTransactions(_profileId: string, _limit = 30) { return [] as UsageTransaction[] },

  async getTransactionsAdmin(_params?: { since?: string; limit?: number }) { return emptyList<UsageTransaction>() },
  async getTransactionsAdminWithProfiles(_params?: { since?: string; limit?: number }) { return emptyList<UsageTransaction>() },
  async getUsageStatsAdmin() {
    return {
      totalTokensSpent: 0,
      totalTransactions: 0,
      uniqueUsers: 0,
      avgTokensPerTransaction: 0,
    }
  },
  async getUsageAndCreditsByActionTypeAdmin() {
    return { usageByActionType: [], creditsByActionType: [] }
  },
}

export const paymentsRepository = {
  async getPaymentsStatsAdmin() {
    return {
      totalRevenueCents: 0,
      totalPayments: 0,
      completedPayments: 0,
      pendingPayments: 0,
      failedPayments: 0,
      totalTokensSold: 0,
    }
  },
  async getPaymentsAdmin(_params?: { since?: string; limit?: number }) { return emptyList<PaymentRecord>() },
}
