import { tokenRepository, paymentsRepository } from '@eduator/db/repositories/tokens'
import { UsagePaymentsClient } from './UsagePaymentsClient'

const CHART_DAYS = 14
const RECENT_USAGE_ROWS = 1000
const RECENT_PAYMENTS_ROWS = 500

function getDateKey(iso: string): string {
  return iso.slice(0, 10)
}

export default async function UsageAndPaymentsPage() {
  const since = new Date(Date.now() - CHART_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const [
    usageStats,
    paymentsStats,
    { data: transactions, count: transactionsCount },
    { data: payments, count: paymentsCount },
    { data: transactionsForCharts },
    { data: paymentsForCharts },
    { usageByActionType, creditsByActionType },
  ] = await Promise.all([
    tokenRepository.getUsageStatsAdmin(),
    paymentsRepository.getPaymentsStatsAdmin(),
    tokenRepository.getTransactionsAdminWithProfiles({ limit: RECENT_USAGE_ROWS }),
    paymentsRepository.getPaymentsAdmin({ limit: RECENT_PAYMENTS_ROWS }),
    tokenRepository.getTransactionsAdmin({ since, limit: 3000 }),
    paymentsRepository.getPaymentsAdmin({ since, limit: 500 }),
    tokenRepository.getUsageAndCreditsByActionTypeAdmin(),
  ])

  const usageByDayMap = new Map<string, number>()
  for (let i = 0; i < CHART_DAYS; i++) {
    const d = new Date()
    d.setDate(d.getDate() - (CHART_DAYS - 1 - i))
    usageByDayMap.set(getDateKey(d.toISOString()), 0)
  }
  for (const tx of transactionsForCharts ?? []) {
    if (tx.amount >= 0) continue
    const key = getDateKey(tx.created_at)
    usageByDayMap.set(key, (usageByDayMap.get(key) ?? 0) + Math.abs(tx.amount))
  }
  const usageByDay = Array.from(usageByDayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, tokensSpent]) => ({ date, tokensSpent }))

  const revenueByDayMap = new Map<string, { revenueCents: number; count: number }>()
  for (let i = 0; i < CHART_DAYS; i++) {
    const d = new Date()
    d.setDate(d.getDate() - (CHART_DAYS - 1 - i))
    revenueByDayMap.set(getDateKey(d.toISOString()), { revenueCents: 0, count: 0 })
  }
  for (const p of paymentsForCharts ?? []) {
    if (p.status !== 'completed') continue
    const date = p.paid_at ?? p.created_at
    const key = getDateKey(date)
    const cur = revenueByDayMap.get(key) ?? { revenueCents: 0, count: 0 }
    revenueByDayMap.set(key, {
      revenueCents: cur.revenueCents + p.amount_cents,
      count: cur.count + 1,
    })
  }
  const revenueByDay = Array.from(revenueByDayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, revenueCents: v.revenueCents, count: v.count }))

  return (
    <UsagePaymentsClient
      usageStats={usageStats}
      paymentsStats={paymentsStats}
      transactions={transactions}
      transactionsCount={transactionsCount}
      payments={payments}
      paymentsCount={paymentsCount}
      usageByDay={usageByDay}
      revenueByDay={revenueByDay}
      usageByActionType={usageByActionType}
      creditsByActionType={creditsByActionType}
    />
  )
}
