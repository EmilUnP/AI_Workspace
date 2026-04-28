'use client'

import { useMemo, useState } from 'react'
import { BarChart3, CheckCircle, XCircle, Key, Zap, Clock, Filter, Search, ChevronDown, ArrowUpDown } from 'lucide-react'
import type { UsageStats } from './api-integration-client'

interface UsageSectionProps {
  usageStats: UsageStats
}

type StatusFilter = 'all' | 'success' | 'error'
type KeySort = 'total' | 'name'
type EndpointSort = 'total' | 'endpoint'

export function UsageSection({ usageStats }: UsageSectionProps) {
  const { totalRequests, successCount, errorCount, byKey, byEndpoint, recent } = usageStats

  const [keyFilter, setKeyFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [endpointSearch, setEndpointSearch] = useState('')
  const [recentLimit, setRecentLimit] = useState(20)
  const [keySort, setKeySort] = useState<KeySort>('total')
  const [endpointSort, setEndpointSort] = useState<EndpointSort>('total')
  const [keySortDesc, setKeySortDesc] = useState(true)
  const [endpointSortDesc, setEndpointSortDesc] = useState(true)

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

  const filteredRecent = useMemo(() => {
    const search = endpointSearch.trim().toLowerCase()
    let rows = recent
    if (statusFilter === 'success') rows = rows.filter((r) => r.status === 'success')
    else if (statusFilter === 'error') rows = rows.filter((r) => r.status === 'error')
    if (search) {
      rows = rows.filter((r) => r.endpoint.toLowerCase().includes(search) || r.method.toLowerCase().includes(search))
    }
    return rows.slice(0, recentLimit)
  }, [recent, statusFilter, endpointSearch, recentLimit])

  const hasFilters = keyFilter !== 'all' || statusFilter !== 'all' || endpointSearch.trim() !== ''

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-1">
          Usage analytics
        </h2>
        <p className="text-sm text-gray-600">
          Track API usage by key and endpoint. Filter and sort to see what matters.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalRequests}</p>
              <p className="text-sm text-gray-500">Total requests</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{successCount}</p>
              <p className="text-sm text-gray-500">Successful</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{errorCount}</p>
              <p className="text-sm text-gray-500">Failed</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-700">{successRate}%</p>
              <p className="text-sm text-gray-500">Success rate</p>
            </div>
          </div>
        </div>
      </div>

      {totalRequests === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-3 text-sm font-medium text-gray-600">No usage yet</p>
          <p className="mt-1 text-sm text-gray-500">
            When you call the API with your key, requests will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Filters bar */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="h-4 w-4 text-gray-500 shrink-0" />
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="whitespace-nowrap">Key</span>
                  <select
                    value={keyFilter}
                    onChange={(e) => setKeyFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All keys</option>
                    {byKey.map((k) => (
                      <option key={k.keyId} value={k.keyId}>
                        {k.keyName} ({k.keyPrefix}…)
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="whitespace-nowrap">Status (recent)</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="success">Success</option>
                    <option value="error">Failed</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search endpoint..."
                    value={endpointSearch}
                    onChange={(e) => setEndpointSearch(e.target.value)}
                    className="w-40 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:w-52"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="whitespace-nowrap">Recent</span>
                  <select
                    value={recentLimit}
                    onChange={(e) => setRecentLimit(Number(e.target.value))}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear filters
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
                  By API key
                </h3>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <span>Sort:</span>
                  <button
                    type="button"
                    onClick={() => setKeySort(keySort === 'total' ? 'name' : 'total')}
                    className="flex items-center gap-1 rounded px-2 py-1 hover:bg-gray-100 text-gray-700"
                  >
                    {keySort === 'total' ? 'Total' : 'Name'}
                    <ChevronDown className={`h-4 w-4 transition ${keySortDesc ? '' : 'rotate-180'}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setKeySortDesc((d) => !d)}
                    className="rounded p-1 hover:bg-gray-100"
                    title={keySortDesc ? 'Descending' : 'Ascending'}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 text-left text-gray-500">
                      <th className="py-3 px-4 font-medium">Key name</th>
                      <th className="py-3 px-4 font-medium">Prefix</th>
                      <th className="py-3 px-4 text-right font-medium">Total</th>
                      <th className="py-3 px-4 text-right font-medium text-green-600">OK</th>
                      <th className="py-3 px-4 text-right font-medium text-red-600">Failed</th>
                      <th className="py-3 px-4 text-right font-medium text-gray-500">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredByKey.map((row) => {
                      const rate = row.total > 0 ? Math.round((row.success / row.total) * 100) : 0
                      return (
                        <tr key={row.keyId} className="hover:bg-gray-50/50">
                          <td className="py-3 px-4 font-medium text-gray-900">{row.keyName}</td>
                          <td className="py-3 px-4 font-mono text-gray-500">{row.keyPrefix}…</td>
                          <td className="py-3 px-4 text-right">{row.total}</td>
                          <td className="py-3 px-4 text-right text-green-600">{row.success}</td>
                          <td className="py-3 px-4 text-right text-red-600">{row.error}</td>
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
                  By endpoint
                </h3>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <button
                    type="button"
                    onClick={() => setEndpointSort(endpointSort === 'total' ? 'endpoint' : 'total')}
                    className="flex items-center gap-1 rounded px-2 py-1 hover:bg-gray-100 text-gray-700"
                  >
                    {endpointSort === 'total' ? 'Total' : 'Endpoint'}
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
                      <th className="py-3 px-4 font-medium">Method</th>
                      <th className="py-3 px-4 font-medium">Endpoint</th>
                      <th className="py-3 px-4 text-right font-medium">Total</th>
                      <th className="py-3 px-4 text-right font-medium text-green-600">OK</th>
                      <th className="py-3 px-4 text-right font-medium text-red-600">Failed</th>
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
                        <td className="py-3 px-4 text-right text-green-600">{row.success}</td>
                        <td className="py-3 px-4 text-right text-red-600">{row.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredByEndpoint.length === 0 && endpointSearch && (
                <p className="py-4 text-center text-sm text-gray-500">No endpoints match &quot;{endpointSearch}&quot;</p>
              )}
            </div>
          )}

          {/* Recent */}
          {recent.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <Clock className="h-4 w-4 text-gray-500" />
                  Recent requests
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Showing up to {recentLimit} • Status filter: {statusFilter === 'all' ? 'All' : statusFilter === 'success' ? 'Success only' : 'Failed only'}
                  {endpointSearch && ` • Endpoint contains "${endpointSearch}"`}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 text-left text-gray-500">
                      <th className="py-3 px-4 font-medium">When</th>
                      <th className="py-3 px-4 font-medium">Method</th>
                      <th className="py-3 px-4 font-medium">Endpoint</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRecent.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-4 text-gray-600 whitespace-nowrap">
                          {new Date(row.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">{row.method}</span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-gray-700 break-all">{row.endpoint}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={
                              row.status === 'success'
                                ? 'rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700'
                                : 'rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700'
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
                <p className="py-4 text-center text-sm text-gray-500">No recent requests match the current filters.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
