'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Activity,
  Coins,
  CreditCard,
  DollarSign,
  TrendingDown,
  Zap,
  User,
  ArrowDownLeft,
  ArrowUpRight,
  Settings,
  Receipt,
  Info,
  LayoutDashboard,
  Filter,
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Button,
  BarChart,
  LineChart,
  HorizontalBarChart,
} from '@eduator/ui'

const ACTION_LABELS: Record<string, string> = {
  exam_generation: 'Exam generation',
  exam_translation: 'Exam translation',
  rag_indexing: 'RAG indexing',
  education_plan_generation: 'Education plan generation',
  lesson_generation: 'Lesson generation',
  lesson_images: 'Lesson images',
  lesson_audio: 'Lesson audio',
  course_generation: 'Course generation',
  student_chat: 'Student AI chat',
  teacher_chat: 'Teacher AI chat',
  purchase: 'Token purchase',
  admin_grant: 'Admin grant',
  initial_grant: 'Initial grant',
  refund: 'Refund',
}

function formatActionType(actionType: string): string {
  return ACTION_LABELS[actionType] ?? actionType.replace(/_/g, ' ')
}

function formatCurrency(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(iso)
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-800 border-red-200' },
  refunded: { label: 'Refunded', className: 'bg-slate-100 text-slate-700 border-slate-200' },
}

export type UsageByDay = { date: string; tokensSpent: number }
export type RevenueByDay = { date: string; revenueCents: number; count: number }
export type UsageByActionType = { actionType: string; total: number }

type TransactionWithProfile = {
  id: string
  profile_id: string
  amount: number
  action_type: string
  created_at: string
  profile?: { id: string; full_name: string; email: string } | null
}

type PaymentWithProfile = {
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

export type CreditsByActionType = { actionType: string; total: number }

export interface UsagePaymentsClientProps {
  usageStats: { totalTokensSpent: number }
  paymentsStats: { totalRevenueCents: number; completedCount: number }
  transactions: TransactionWithProfile[]
  transactionsCount: number
  payments: PaymentWithProfile[]
  paymentsCount: number
  usageByDay: UsageByDay[]
  revenueByDay: RevenueByDay[]
  usageByActionType: UsageByActionType[]
  creditsByActionType: CreditsByActionType[]
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'usage', label: 'Token usage', icon: Zap },
  { id: 'payments', label: 'Payments', icon: CreditCard },
] as const

const ACTION_TYPES = [
  'all',
  'exam_generation',
  'exam_translation',
  'rag_indexing',
  'education_plan_generation',
  'lesson_generation',
  'lesson_images',
  'lesson_audio',
  'course_generation',
  'student_chat',
  'teacher_chat',
  'purchase',
  'admin_grant',
  'initial_grant',
  'refund',
] as const

// Action types shown in Overview breakdown chart (lesson images/audio, admin_grant, refund excluded)
const BREAKDOWN_ACTION_TYPES = [
  'exam_generation',
  'exam_translation',
  'education_plan_generation',
  'lesson_generation',
  'course_generation',
  'student_chat',
  'teacher_chat'
] as const

// Credit types still shown in chart (admin_grant, refund removed from chart)
const CREDIT_ACTION_TYPES = ['purchase']

const PAYMENT_STATUSES = ['all', 'completed', 'pending', 'failed', 'refunded'] as const

export function UsagePaymentsClient({
  usageStats,
  paymentsStats,
  transactions,
  transactionsCount,
  payments,
  paymentsCount,
  usageByDay,
  revenueByDay,
  usageByActionType,
  creditsByActionType,
}: UsagePaymentsClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'payments'>('overview')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [usageSortKey, setUsageSortKey] = useState<'created_at' | 'amount' | 'action_type' | 'user'>('created_at')
  const [usageSortDir, setUsageSortDir] = useState<'asc' | 'desc'>('desc')
  const [paymentsSortKey, setPaymentsSortKey] = useState<'date' | 'amount_cents' | 'tokens_granted' | 'status' | 'user'>('date')
  const [paymentsSortDir, setPaymentsSortDir] = useState<'asc' | 'desc'>('desc')
  const [usagePage, setUsagePage] = useState(1)
  const [paymentsPage, setPaymentsPage] = useState(1)
  const [usagePageSize, setUsagePageSize] = useState(25)
  const [paymentsPageSize, setPaymentsPageSize] = useState(25)

  const filteredTransactions = useMemo(() => {
    if (actionFilter === 'all') return transactions
    return transactions.filter((t) => t.action_type === actionFilter)
  }, [transactions, actionFilter])

  const filteredPayments = useMemo(() => {
    if (statusFilter === 'all') return payments
    return payments.filter((p) => p.status === statusFilter)
  }, [payments, statusFilter])

  const sortedTransactions = useMemo(() => {
    const list = [...filteredTransactions]
    list.sort((a, b) => {
      let cmp = 0
      if (usageSortKey === 'created_at') cmp = a.created_at.localeCompare(b.created_at)
      if (usageSortKey === 'amount') cmp = a.amount - b.amount
      if (usageSortKey === 'action_type') cmp = a.action_type.localeCompare(b.action_type)
      if (usageSortKey === 'user') {
        const an = (a.profile?.full_name ?? a.profile?.email ?? a.profile_id).toLowerCase()
        const bn = (b.profile?.full_name ?? b.profile?.email ?? b.profile_id).toLowerCase()
        cmp = an.localeCompare(bn)
      }
      return usageSortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [filteredTransactions, usageSortKey, usageSortDir])

  const usageTotalPages = Math.max(1, Math.ceil(sortedTransactions.length / usagePageSize))
  const usageCurrentPage = Math.min(usagePage, usageTotalPages)
  const pagedTransactions = useMemo(() => {
    const start = (usageCurrentPage - 1) * usagePageSize
    return sortedTransactions.slice(start, start + usagePageSize)
  }, [sortedTransactions, usageCurrentPage, usagePageSize])

  const sortedPayments = useMemo(() => {
    const list = [...filteredPayments]
    list.sort((a, b) => {
      let cmp = 0
      if (paymentsSortKey === 'date') cmp = (a.paid_at ?? a.created_at).localeCompare(b.paid_at ?? b.created_at)
      if (paymentsSortKey === 'amount_cents') cmp = a.amount_cents - b.amount_cents
      if (paymentsSortKey === 'tokens_granted') cmp = a.tokens_granted - b.tokens_granted
      if (paymentsSortKey === 'status') cmp = a.status.localeCompare(b.status)
      if (paymentsSortKey === 'user') {
        const an = (a.profile?.full_name ?? a.profile?.email ?? a.profile_id ?? '').toLowerCase()
        const bn = (b.profile?.full_name ?? b.profile?.email ?? b.profile_id ?? '').toLowerCase()
        cmp = an.localeCompare(bn)
      }
      return paymentsSortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [filteredPayments, paymentsSortKey, paymentsSortDir])

  const paymentsTotalPages = Math.max(1, Math.ceil(sortedPayments.length / paymentsPageSize))
  const paymentsCurrentPage = Math.min(paymentsPage, paymentsTotalPages)
  const pagedPayments = useMemo(() => {
    const start = (paymentsCurrentPage - 1) * paymentsPageSize
    return sortedPayments.slice(start, start + paymentsPageSize)
  }, [sortedPayments, paymentsCurrentPage, paymentsPageSize])

  const chartDays = useMemo(() => {
    return usageByDay.map((d) => {
      const date = new Date(d.date)
      return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    })
  }, [usageByDay])

  const usageChartData = useMemo(() => usageByDay.map((d) => d.tokensSpent), [usageByDay])
  const usageChartMax = Math.max(...usageChartData, 1)
  const usageChartTotal = useMemo(() => usageChartData.reduce((a, b) => a + b, 0), [usageChartData])
  const usageChartPeakIndex = usageChartMax > 0 ? usageChartData.indexOf(usageChartMax) : -1
  const usageChartPeakLabel = usageChartPeakIndex >= 0 ? chartDays[usageChartPeakIndex] : null

  const revenueChartData = useMemo(
    () => revenueByDay.map((d) => d.revenueCents / 100),
    [revenueByDay]
  )
  const revenueChartLabels = useMemo(
    () =>
      revenueByDay.map((d) => {
        const date = new Date(d.date)
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      }),
    [revenueByDay]
  )

  const usageBreakdownLabels = useMemo(
    () => BREAKDOWN_ACTION_TYPES.map((a) => formatActionType(a)),
    []
  )
  const usageBreakdownData = useMemo(() => {
    const spent = new Map(usageByActionType.map((u) => [u.actionType, u.total]))
    const granted = new Map(creditsByActionType.map((c) => [c.actionType, c.total]))
    return BREAKDOWN_ACTION_TYPES.map((a) =>
      CREDIT_ACTION_TYPES.includes(a) ? (granted.get(a) ?? 0) : (spent.get(a) ?? 0)
    )
  }, [usageByActionType, creditsByActionType])
  const usageBreakdownColors = useMemo(() => {
    const spendColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#6366f1']
    const creditColors = ['#10b981', '#059669', '#047857']
    return BREAKDOWN_ACTION_TYPES.map((a, i) =>
      CREDIT_ACTION_TYPES.includes(a)
        ? creditColors[CREDIT_ACTION_TYPES.indexOf(a) % creditColors.length]
        : spendColors[i % spendColors.length]
    )
  }, [])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/platform-owner" className="hover:text-gray-700">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Usage & payments</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Activity className="h-7 w-7 text-red-600" aria-hidden />
            Usage & payments
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-gray-600">
            Monitor token consumption and revenue. Use tabs and filters to explore details.
          </p>
        </div>
        <Link href="/platform-owner/token-settings" className="inline-flex items-center gap-2">
          <Button variant="outline" size="default">
            <Settings className="h-4 w-4" />
            Token settings
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1" aria-label="Tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  inline-flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-3 text-sm font-medium transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-red-600 text-red-600 bg-red-50/50'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-gray-200">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tokens spent (all time)</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
                      {usageStats.totalTokensSpent.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">Total deducted from balances</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <TrendingDown className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-gray-200">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Revenue (completed)</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
                      {formatCurrency(paymentsStats.totalRevenueCents)}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">From token purchases</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-gray-200">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Usage records</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
                      {transactionsCount}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">Total transaction count</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Zap className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-gray-200">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Completed payments</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
                      {paymentsStats.completedCount}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">Successful purchases</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <CreditCard className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts row — tokens chart full width on large screens for readable dates */}
          <div className="grid gap-6 lg:grid-cols-1">
            <Card className="border-gray-200 overflow-hidden lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Coins className="h-5 w-5 text-amber-600 shrink-0" />
                      Tokens spent (last 14 days)
                    </CardTitle>
                    <CardDescription>
                      Daily token consumption. Number under each bar = tokens used that day.
                    </CardDescription>
                  </div>
                  {usageByDay.length > 0 && (
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                      <span className="font-medium text-gray-900">
                        Total: <span className="tabular-nums text-amber-700">{usageChartTotal.toLocaleString()} tokens</span>
                      </span>
                      {usageChartPeakLabel != null && usageChartMax > 0 && usageChartData.some((v) => v > 0) && (
                        <span className="text-gray-500">
                          Peak: <span className="tabular-nums text-gray-700">{usageChartMax.toLocaleString()} on {usageChartPeakLabel}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0 min-h-[220px] lg:min-h-[260px]">
                {usageByDay.length === 0 ? (
                  <p className="py-12 text-center text-sm text-gray-500">No usage in the last 14 days</p>
                ) : (
                  <BarChart
                    data={usageChartData}
                    labels={chartDays}
                    colors={chartDays.map(() => '#f59e0b')}
                    maxValue={usageChartMax}
                    height={240}
                    valueLabel="value"
                    valueSuffix="tokens"
                  />
                )}
              </CardContent>
            </Card>
            <Card className="border-gray-200 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                  Revenue (last 14 days)
                </CardTitle>
                <CardDescription>Last 2 weeks — daily revenue from completed payments</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueByDay.length === 0 || revenueChartData.every((v) => v === 0) ? (
                  <p className="py-12 text-center text-sm text-gray-500">No revenue in the last 14 days</p>
                ) : (
                  <LineChart
                    data={revenueChartData}
                    labels={revenueChartLabels}
                    colors={['#10b981']}
                    height={240}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Usage by action type – spent (e.g. course, exam, chats) and Token purchase only; admin_grant/refund not shown */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Usage by action type (all time)
              </CardTitle>
              <CardDescription>
                Token count per action type (all time). Spent = blue/orange; green = Token purchase only.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <HorizontalBarChart
                data={usageBreakdownData}
                labels={usageBreakdownLabels}
                colors={usageBreakdownColors}
                showPercentage={true}
                valueSuffix=" tokens"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Usage tab */}
      {activeTab === 'usage' && (
        <div className="space-y-4">
          <Card className="border-gray-200">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ArrowDownLeft className="h-5 w-5 text-gray-500" />
                    Token usage
                  </CardTitle>
                  <CardDescription>
                    All token movements in one table: who, action type (e.g. Education plan generation, Exam translation, Course generation, Lesson images, Admin grant), and amount. Negative = spent, positive = granted. Filter by action to narrow down.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" aria-hidden />
                  <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    aria-label="Filter by action type"
                  >
                    <option value="all">All actions</option>
                    {ACTION_TYPES.filter((a) => a !== 'all').map((action) => (
                      <option key={action} value={action}>
                        {formatActionType(action)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={String(usagePageSize)}
                    onChange={(e) => {
                      setUsagePageSize(Number(e.target.value))
                      setUsagePage(1)
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm"
                    aria-label="Usage rows per page"
                  >
                    <option value="10">10 / page</option>
                    <option value="25">25 / page</option>
                    <option value="50">50 / page</option>
                  </select>
                  <select
                    value={`${usageSortKey}:${usageSortDir}`}
                    onChange={(e) => {
                      const [key, dir] = e.target.value.split(':') as [typeof usageSortKey, typeof usageSortDir]
                      setUsageSortKey(key)
                      setUsageSortDir(dir)
                      setUsagePage(1)
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm"
                    aria-label="Usage sorting"
                  >
                    <option value="created_at:desc">Newest first</option>
                    <option value="created_at:asc">Oldest first</option>
                    <option value="amount:desc">Tokens high to low</option>
                    <option value="amount:asc">Tokens low to high</option>
                    <option value="action_type:asc">Action A-Z</option>
                    <option value="user:asc">User A-Z</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:px-6"
                      >
                        User
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:px-6"
                      >
                        Action
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 sm:px-6"
                      >
                        Tokens
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:px-6"
                      >
                        When
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-16 text-center sm:px-6">
                          <Receipt className="mx-auto h-12 w-12 text-gray-300" />
                          <p className="mt-3 text-sm font-medium text-gray-900">No token usage</p>
                          <p className="mt-1 text-sm text-gray-500">
                            {actionFilter !== 'all'
                              ? 'Try another filter.'
                              : 'Usage will appear when teachers or students use AI features.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      pagedTransactions.map((tx) => (
                        <tr key={tx.id} className="transition-colors hover:bg-gray-50/70">
                          <td className="px-4 py-3.5 text-sm sm:px-6">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                                <User className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {tx.profile?.full_name ?? tx.profile?.email ?? `Profile ${tx.profile_id.slice(0, 8)}`}
                                </p>
                                {tx.profile?.email && (
                                  <p className="text-xs text-gray-500 truncate">{tx.profile.email}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-sm sm:px-6">
                            <span
                              className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200"
                              title={tx.action_type}
                            >
                              {formatActionType(tx.action_type)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right text-sm font-semibold tabular-nums sm:px-6">
                            <span className={tx.amount < 0 ? 'text-red-600' : 'text-emerald-600'}>
                              {tx.amount > 0 ? '+' : ''}
                              {tx.amount}
                            </span>
                            <span className="ml-1 text-xs font-normal text-gray-500">tokens</span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-sm text-gray-500 sm:px-6">
                            <span title={formatDate(tx.created_at)}>{formatRelative(tx.created_at)}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-200 bg-gray-50/50 px-4 py-2 sm:px-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    Showing {pagedTransactions.length} of {filteredTransactions.length} filtered records. Page {usageCurrentPage}/{usageTotalPages}.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={usageCurrentPage <= 1} onClick={() => setUsagePage((p) => Math.max(1, p - 1))}>Prev</Button>
                    <Button variant="outline" size="sm" disabled={usageCurrentPage >= usageTotalPages} onClick={() => setUsagePage((p) => Math.min(usageTotalPages, p + 1))}>Next</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payments tab */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <Card className="border-gray-200">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-gray-500" />
                    Payments
                  </CardTitle>
                  <CardDescription>
                    Token purchases. Completed payments add tokens to the user&apos;s balance.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" aria-hidden />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    aria-label="Filter by status"
                  >
                    <option value="all">All statuses</option>
                    {PAYMENT_STATUSES.filter((s) => s !== 'all').map((status) => (
                      <option key={status} value={status}>
                        {STATUS_CONFIG[status]?.label ?? status}
                      </option>
                    ))}
                  </select>
                  <select
                    value={String(paymentsPageSize)}
                    onChange={(e) => {
                      setPaymentsPageSize(Number(e.target.value))
                      setPaymentsPage(1)
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm"
                    aria-label="Payments rows per page"
                  >
                    <option value="10">10 / page</option>
                    <option value="25">25 / page</option>
                    <option value="50">50 / page</option>
                  </select>
                  <select
                    value={`${paymentsSortKey}:${paymentsSortDir}`}
                    onChange={(e) => {
                      const [key, dir] = e.target.value.split(':') as [typeof paymentsSortKey, typeof paymentsSortDir]
                      setPaymentsSortKey(key)
                      setPaymentsSortDir(dir)
                      setPaymentsPage(1)
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm"
                    aria-label="Payments sorting"
                  >
                    <option value="date:desc">Newest first</option>
                    <option value="date:asc">Oldest first</option>
                    <option value="amount_cents:desc">Amount high to low</option>
                    <option value="amount_cents:asc">Amount low to high</option>
                    <option value="tokens_granted:desc">Tokens high to low</option>
                    <option value="status:asc">Status A-Z</option>
                    <option value="user:asc">User A-Z</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:px-6"
                      >
                        User
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 sm:px-6"
                      >
                        Amount
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 sm:px-6"
                      >
                        Tokens granted
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:px-6"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:px-6"
                      >
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-16 text-center sm:px-6">
                          <CreditCard className="mx-auto h-12 w-12 text-gray-300" />
                          <p className="mt-3 text-sm font-medium text-gray-900">No payments</p>
                          <p className="mt-1 text-sm text-gray-500">
                            {statusFilter !== 'all'
                              ? 'Try another status filter.'
                              : 'Payments will appear when users buy token packs.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      pagedPayments.map((p) => {
                        const statusConf =
                          STATUS_CONFIG[p.status] ?? {
                            label: p.status,
                            className: 'bg-gray-100 text-gray-800 border-gray-200',
                          }
                        return (
                          <tr key={p.id} className="transition-colors hover:bg-gray-50/70">
                            <td className="px-4 py-3.5 text-sm sm:px-6">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                                  <User className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900 truncate">
                                    {p.profile?.full_name ??
                                      p.profile?.email ??
                                      (p.profile_id ? `Profile ${p.profile_id.slice(0, 8)}` : '–')}
                                  </p>
                                  {p.profile?.email && (
                                    <p className="text-xs text-gray-500 truncate">{p.profile.email}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-right text-sm font-semibold tabular-nums text-gray-900 sm:px-6">
                              {formatCurrency(p.amount_cents, p.currency)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-right text-sm sm:px-6">
                              <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                                <ArrowUpRight className="h-4 w-4" />
                                {p.tokens_granted}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 sm:px-6">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusConf.className}`}
                              >
                                {statusConf.label}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-sm text-gray-500 sm:px-6">
                              {formatDate(p.paid_at ?? p.created_at)}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-200 bg-gray-50/50 px-4 py-2 sm:px-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    Showing {pagedPayments.length} of {filteredPayments.length} filtered records. Page {paymentsCurrentPage}/{paymentsTotalPages}.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={paymentsCurrentPage <= 1} onClick={() => setPaymentsPage((p) => Math.max(1, p - 1))}>Prev</Button>
                    <Button variant="outline" size="sm" disabled={paymentsCurrentPage >= paymentsTotalPages} onClick={() => setPaymentsPage((p) => Math.min(paymentsTotalPages, p + 1))}>Next</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Help callout */}
      <Card className="border-gray-200 bg-slate-50/50">
        <CardContent className="flex gap-3 pt-6">
          <Info className="h-5 w-5 shrink-0 text-slate-500" />
          <div className="text-sm text-slate-700">
            <p className="font-medium text-slate-900">About usage & payments</p>
            <p className="mt-1">
              Token costs per action are set in{' '}
              <Link
                href="/platform-owner/token-settings"
                className="font-medium text-red-600 hover:text-red-700 underline"
              >
                Token settings
              </Link>
              . When a user runs out of tokens, they will see &quot;Insufficient tokens&quot; until they
              buy more or receive a grant.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
