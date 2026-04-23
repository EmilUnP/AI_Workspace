import { tokenRepository } from '@eduator/db/repositories/tokens'
import { RealTokenUsageClient } from './real-token-usage-client'

const DEFAULT_DAYS = 90

export default async function RealTokenUsagePage() {
  const since = new Date(Date.now() - DEFAULT_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: transactions, count }, pricing] = await Promise.all([
    tokenRepository.getTransactionsAdminWithProfiles({
      since,
      limit: 5000,
    }),
    tokenRepository.getModelPricingSettings('gemini'),
  ])

  return (
    <RealTokenUsageClient
      transactions={transactions}
      transactionsCount={count}
      defaultDays={DEFAULT_DAYS}
      modelPricing={pricing}
    />
  )
}
