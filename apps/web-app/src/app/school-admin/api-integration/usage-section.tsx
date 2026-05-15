'use client'

import { useMemo, useState, useTransition } from 'react'
import { BarChart3, CheckCircle, XCircle, Key, Zap, Clock, Filter, Search, ChevronDown, ArrowUpDown, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { UsageStats } from './api-integration-client'
import { getUsageStats, type UsageDateRange } from './actions'

interface UsageSectionProps {
  usageStats: UsageStats
}

type StatusFilter = 'all' | 'success' | 'error'
type KeySort = 'total' | 'name'
type EndpointSort = 'total' | 'endpoint'

const DATE_RANGES: UsageDateRange[] = ['today', '30d', 'all']

export function UsageSection({ usageStats: initialUsageStats }: UsageSectionProps) {
  const t = useTranslations('teacherApiIntegration')
  const [isPending, startTransition] = useTransition()
  const [dateRange, setDateRange] = useState<UsageDateRange>('all')
  const [usageStats, setUsageStats] = useState(initialUsageStats)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const { totalRequests, successCount, errorCount, byKey, byEndpoint, recent } = usageStats

  const [keyFilter, setKeyFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [endpointSearch, setEndpointSearch] = useState('')
  const [recentLimit, setRecentLimit] = useState(20)
  const [keySort, setKeySort] = useState<KeySort>('total')
  const [endpointSort, setEndpointSort] = useState<EndpointSort>('total')
  const [keySortDesc, setKeySortDesc] = useState(true)
  const [endpointSortDesc, setEndpointSortDesc] = useState(true)

  const dateRangeLabel: Record<UsageDateRange, string> = {
    today: t('usageDateToday'),
    '30d': t('usageDate30d'),
    all: t('usageDateAll'),
  }

  const handleDateRangeChange = (range: UsageDateRange) => {
    if (range === dateRange && !fetchError) return
    setDateRange(range)
    setFetchError(null)
    startTransition(async () => {
      const result = await getUsageStats(range)
      if (result.error) {
        setFetchError(result.error)
        return
      }
      setUsageStats({
        totalRequests: result.totalRequests ?? 0,
        successCount: result.successCount ?? 0,
        errorCount: result.errorCount ?? 0,
        byKey: result.byKey ?? [],
        byEndpoint: result.byEndpoint ?? [],
        recent: result.recent ?? [],
      })
    })
  }

  const successRate = totalRequests > 0 ? Math.round((successCount / totalRequests) * 100) : 0

  const filteredByKey = useMemo(() => {
    let rows = byKey
    if (keyFilter !== 'all') {
      rows = rows.filter((r) => r.keyId === keyFilter)
    }
    rows = [...rows].sort((a, b) => {
      const mult = keySortDesc ? 1 : -1
      if (keySort === 'total') return mult * (b.total - a.total)
      return mult * (a.keyName.localeCompare(b.keyName))
    })
    return rows
  }, [byKey, keyFilter, keySort, keySortDesc])

  const filteredByEndpoint = useMemo(() => {
    const search = endpointSearch.trim().toLowerCase()
    let rows = byEndpoint
    if (search) {
      rows = rows.filter((r) => r.endpoint.toLowerCase().includes(search) || r.method.toLowerCase().includes(search))
    }
    rows = [...rows].sort((a, b) => {
      const mult = endpointSortDesc ? 1 : -1
      if (endpointSort === 'total') return mult * (b.total - a.total)
      return mult * (a.endpoint.localeCompare(b.endpoint))
    })
    return rows
  }, [byEndpoint, endpointSearch, endpointSort, endpointSortDesc])

  const keyLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of byKey) {
      map.set(
        row.keyId,
        row.keyId === '__other__' ? t('usageOtherLoginToken') : row.keyName
      )
    }
    return map
  }, [byKey, t])

  const filteredRecent = useMemo(() => {
    const search = endpointSearch.trim().toLowerCase()
    let rows = recent
    if (keyFilter !== 'all') {
      if (keyFilter === '__other__') {
        rows = rows.filter((r) => !r.apiKeyId)
      } else {
        rows = rows.filter((r) => r.apiKeyId === keyFilter)
      }
    }
    if (statusFilter === 'success') rows = rows.filter((r) => r.status === 'success')
    else if (statusFilter === 'error') rows = rows.filter((r) => r.status === 'error')
    if (search) {
      rows = rows.filter((r) => r.endpoint.toLowerCase().includes(search) || r.method.toLowerCase().includes(search))
    }
    return rows.slice(0, recentLimit)
  }, [recent, keyFilter, statusFilter, endpointSearch, recentLimit])

  const hasFilters = keyFilter !== 'all' || statusFilter !== 'all' || endpointSearch.trim() !== ''

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-1">{t('usageAnalytics')}</h2>
        <p className="text-sm text-gray-600">
          {t('usageAnalyticsDescription')}
        </p>
      </div>

      {/* Date range */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-600">{t('usageDateRange')}</span>
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1" role="group" aria-label={t('usageDateRange')}>
          {DATE_RANGES.map((range) => (
            <button
              key={range}
              type="button"
              disabled={isPending}
              onClick={() => handleDateRangeChange(range)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                dateRange === range
                  ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {dateRangeLabel[range]}
            </button>
          ))}
        </div>
        {isPending && (
          <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t('usageLoading')}
          </span>
        )}
      </div>

      {fetchError && (
        <p className="text-sm text-red-600" role="alert">
          {fetchError}
        </p>
      )}

      {/* Summary cards */}
      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${isPending ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalRequests}</p>
              <p className="text-sm text-gray-500">{t('totalRequests')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{successCount}</p>
              <p className="text-sm text-gray-500">{t('successful')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{errorCount}</p>
              <p className="text-sm text-gray-500">{t('failed')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-700">{successRate}%</p>
              <p className="text-sm text-gray-500">{t('successRate')}</p>
            </div>
          </div>
        </div>
      </div>

      {totalRequests === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-3 text-sm font-medium text-gray-600">{t('noUsageYet')}</p>
          <p className="mt-1 text-sm text-gray-500">
            {dateRange === 'all' ? t('usageWillAppear') : t('noRecentRequestsMatch')}
          </p>
        </div>
      ) : (
        <>
          {/* Filters bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="h-4 w-4 text-gray-500 shrink-0" />
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="whitespace-nowrap">{t('key')}</span>
                  <select
                    value={keyFilter}
                    onChange={(e) => setKeyFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                  >
                    <option value="all">{t('allKeys')}</option>
                    {byKey.map((k) => (
                      <option key={k.keyId} value={k.keyId}>
                        {k.keyId === '__other__' ? t('usageOtherLoginToken') : `${k.keyName} (${k.keyPrefix}…)`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="whitespace-nowrap">{t('statusRecent')}</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                  >
                    <option value="all">{t('all')}</option>
                    <option value="success">{t('success')}</option>
                    <option value="error">{t('failed')}</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('searchEndpoint')}
                    value={endpointSearch}
                    onChange={(e) => setEndpointSearch(e.target.value)}
                    className="w-40 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-300 sm:w-52"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="whitespace-nowrap">{t('recent')}</span>
                  <select
                    value={recentLimit}
                    onChange={(e) => setRecentLimit(Number(e.target.value))}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </label>
              </div>
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setKeyFilter('all')
                    setStatusFilter('all')
                    setEndpointSearch('')
                    setRecentLimit(20)
                  }}
                  className="text-sm text-gray-700 hover:text-gray-900"
                >
                  {t('clearFilters')}
                </button>
              )}
            </div>
          </div>

          {/* By key */}
          {byKey.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <Key className="h-4 w-4 text-gray-500" />
                  {t('byApiKey')}
                </h3>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <span>{t('sort')}</span>
                  <button
                    type="button"
                    onClick={() => setKeySort(keySort === 'total' ? 'name' : 'total')}
                    className="flex items-center gap-1 rounded px-2 py-1 hover:bg-gray-100 text-gray-700"
                  >
                    {keySort === 'total' ? t('total') : t('name')}
                    <ChevronDown className={`h-4 w-4 transition ${keySortDesc ? '' : 'rotate-180'}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setKeySortDesc((d) => !d)}
                    className="rounded p-1 hover:bg-gray-100"
                    title={keySortDesc ? t('descending') : t('ascending')}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 text-left text-gray-500">
                      <th className="py-3 px-4 font-medium">{t('keyName')}</th>
                      <th className="py-3 px-4 font-medium">{t('prefix')}</th>
                      <th className="py-3 px-4 text-right font-medium">{t('total')}</th>
                      <th className="py-3 px-4 text-right font-medium text-gray-700">OK</th>
                      <th className="py-3 px-4 text-right font-medium text-gray-700">Failed</th>
                      <th className="py-3 px-4 text-right font-medium text-gray-500">{t('rate')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredByKey.map((row) => {
                      const rate = row.total > 0 ? Math.round((row.success / row.total) * 100) : 0
                      return (
                        <tr key={row.keyId} className="hover:bg-gray-50/50">
                          <td className="py-3 px-4 font-medium text-gray-900">
                            {row.keyId === '__other__' ? t('usageOtherLoginToken') : row.keyName}
                          </td>
                          <td className="py-3 px-4 font-mono text-gray-500">{row.keyPrefix}…</td>
                          <td className="py-3 px-4 text-right">{row.total}</td>
                          <td className="py-3 px-4 text-right text-gray-700">{row.success}</td>
                          <td className="py-3 px-4 text-right text-gray-700">{row.error}</td>
                          <td className="py-3 px-4 text-right text-gray-600">{rate}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* By endpoint */}
          {byEndpoint.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <BarChart3 className="h-4 w-4 text-gray-500" />
                  {t('byEndpoint')}
                </h3>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <button
                    type="button"
                    onClick={() => setEndpointSort(endpointSort === 'total' ? 'endpoint' : 'total')}
                    className="flex items-center gap-1 rounded px-2 py-1 hover:bg-gray-100 text-gray-700"
                  >
                    {endpointSort === 'total' ? t('total') : t('endpoint')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEndpointSortDesc((d) => !d)}
                    className="rounded p-1 hover:bg-gray-100"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 text-left text-gray-500">
                      <th className="py-3 px-4 font-medium">{t('method')}</th>
                      <th className="py-3 px-4 font-medium">{t('endpoint')}</th>
                      <th className="py-3 px-4 text-right font-medium">{t('total')}</th>
                      <th className="py-3 px-4 text-right font-medium text-gray-700">OK</th>
                      <th className="py-3 px-4 text-right font-medium text-gray-700">Failed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredByEndpoint.map((row, i) => (
                      <tr key={`${row.method}-${row.endpoint}-${i}`} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">{row.method}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-700 break-all">{row.endpoint}</td>
                        <td className="py-3 px-4 text-right">{row.total}</td>
                        <td className="py-3 px-4 text-right text-gray-700">{row.success}</td>
                        <td className="py-3 px-4 text-right text-gray-700">{row.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredByEndpoint.length === 0 && endpointSearch && (
                <p className="py-4 text-center text-sm text-gray-500">{t('noEndpointsMatch', { query: endpointSearch })}</p>
              )}
            </div>
          )}

          {/* Recent */}
          {recent.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <Clock className="h-4 w-4 text-gray-500" />
                  {t('recentRequests')}
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  {t('showingUpTo', { count: recentLimit })} • {dateRangeLabel[dateRange]} • {t('statusFilter')}:{' '}
                  {statusFilter === 'all' ? t('all') : statusFilter === 'success' ? t('successOnly') : t('failedOnly')}
                  {endpointSearch ? ` • ${t('endpointContains', { query: endpointSearch })}` : ''}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 text-left text-gray-500">
                      <th className="py-3 px-4 font-medium">{t('when')}</th>
                      <th className="py-3 px-4 font-medium">{t('key')}</th>
                      <th className="py-3 px-4 font-medium">{t('method')}</th>
                      <th className="py-3 px-4 font-medium">{t('endpoint')}</th>
                      <th className="py-3 px-4 font-medium">{t('status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRecent.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-4 text-gray-600 whitespace-nowrap">
                          {new Date(row.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-gray-600 whitespace-nowrap">
                          {row.apiKeyId
                            ? keyLabelById.get(row.apiKeyId) ?? '—'
                            : t('usageOtherLoginToken')}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">{row.method}</span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-gray-700 break-all">{row.endpoint}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={
                              row.status === 'success'
                                ? 'rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700'
                                : 'rounded bg-gray-200 px-1.5 py-0.5 text-xs font-medium text-gray-800'
                            }
                          >
                            {row.statusCode ?? row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredRecent.length === 0 && (statusFilter !== 'all' || endpointSearch) && (
                <p className="py-4 text-center text-sm text-gray-500">{t('noRecentRequestsMatch')}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
