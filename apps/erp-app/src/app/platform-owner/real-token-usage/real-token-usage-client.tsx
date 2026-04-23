'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Activity, BarChart3, Coins, DollarSign, Filter, Search, Settings2, User, Wallet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@eduator/ui'
import type { ModelPricingSetting } from '@eduator/core/types/token'
import { updateModelPricing } from './actions'

type Tx = {
  id: string
  profile_id: string
  amount: number
  action_type: string
  reference_id?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  profile?: {
    id: string
    full_name: string
    email: string
    source?: 'erp' | 'api' | null
  } | null
}

type Props = {
  transactions: Tx[]
  transactionsCount: number
  defaultDays: number
  modelPricing: ModelPricingSetting[]
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

function fmtAction(actionType: string): string {
  return actionType.replace(/_/g, ' ')
}

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
  return aliases[lower] ?? value
}

function fmtUsd(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export function RealTokenUsageClient({
  transactions,
  transactionsCount,
  defaultDays,
  modelPricing,
}: Props) {
  const [sourceFilter, setSourceFilter] = useState<'all' | 'erp' | 'api'>('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [q, setQ] = useState('')
  const [activeTab, setActiveTab] = useState<'analytics' | 'pricing'>('analytics')
  const [modelFilter, setModelFilter] = useState('all')
  const [pricingRows, setPricingRows] = useState(modelPricing)
  const [pricingSaving, setPricingSaving] = useState(false)
  const [pricingSourceUrl, setPricingSourceUrl] = useState(
    modelPricing.find((row) => row.source_url?.trim())?.source_url?.trim() ??
      'https://ai.google.dev/gemini-api/docs/pricing'
  )
  const [message, setMessage] = useState<string | null>(null)
  const [modelSortKey, setModelSortKey] = useState<'estimatedCostUsd' | 'totalTokens' | 'inputTokens' | 'outputTokens' | 'modelKey'>('estimatedCostUsd')
  const [modelSortDir, setModelSortDir] = useState<'asc' | 'desc'>('desc')
  const [modelPage, setModelPage] = useState(1)
  const [modelPageSize, setModelPageSize] = useState(25)
  const [txSortKey, setTxSortKey] = useState<'created_at' | 'amount' | 'input' | 'output' | 'action_type' | 'user'>('created_at')
  const [txSortDir, setTxSortDir] = useState<'asc' | 'desc'>('desc')
  const [txPage, setTxPage] = useState(1)
  const [txPageSize, setTxPageSize] = useState(25)

  const actions = useMemo(
    () => ['all', ...Array.from(new Set(transactions.map((t) => t.action_type))).sort()],
    [transactions]
  )

  const filtered = useMemo(() => {
    const qx = q.trim().toLowerCase()
    return transactions.filter((t) => {
      const source = t.profile?.source ?? 'erp'
      if (sourceFilter !== 'all' && source !== sourceFilter) return false
      if (actionFilter !== 'all' && t.action_type !== actionFilter) return false
      const txModel =
        normalizeModelKey(
          readMetaString(t.metadata, ['model_used', 'ai_model_used', 'model']) ?? 'unknown'
        )
      const txImageModel = normalizeModelKey(
        readMetaString(t.metadata, ['image_model_used', 'image_generator_model_used']) ?? 'unknown'
      )
      const txTtsModel = normalizeModelKey(
        readMetaString(t.metadata, ['tts_model_used']) ?? 'unknown'
      )
      if (modelFilter !== 'all' && txModel !== modelFilter && txImageModel !== modelFilter && txTtsModel !== modelFilter) return false
      if (!qx) return true
      const blob = `${t.profile?.full_name ?? ''} ${t.profile?.email ?? ''} ${t.action_type} ${txModel} ${txImageModel} ${txTtsModel}`.toLowerCase()
      return blob.includes(qx)
    })
  }, [transactions, sourceFilter, actionFilter, q, modelFilter])

  const modelAnalyticsRows = useMemo(() => {
    if (actionFilter !== 'lesson_generation') return filtered

    const lessonRefs = new Set(
      filtered
        .filter((t) => t.action_type === 'lesson_generation')
        .map((t) => t.reference_id)
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
    )
    if (lessonRefs.size === 0) return filtered

    const linkedAudio = transactions.filter((t) => {
      if (t.action_type !== 'lesson_audio') return false
      if (!t.reference_id || !lessonRefs.has(t.reference_id)) return false
      const source = t.profile?.source ?? 'erp'
      if (sourceFilter !== 'all' && source !== sourceFilter) return false
      const qx = q.trim().toLowerCase()
      if (!qx) return true
      const txModel = normalizeModelKey(
        readMetaString(t.metadata, ['model_used', 'ai_model_used', 'model']) ?? 'unknown'
      )
      const blob = `${t.profile?.full_name ?? ''} ${t.profile?.email ?? ''} ${t.action_type} ${txModel}`.toLowerCase()
      return blob.includes(qx)
    })

    const seen = new Set(filtered.map((t) => t.id))
    return [...filtered, ...linkedAudio.filter((t) => !seen.has(t.id))]
  }, [actionFilter, filtered, q, sourceFilter, transactions])

  const derivedModelRows = useMemo(() => {
    const pricingByModel = new Map(modelPricing.map((p) => [p.model_key, p]))
    const rows = new Map<
      string,
      {
        modelKey: string
        displayName: string
        inputTokens: number
        outputTokens: number
        totalTokens: number
        estimatedCostUsd: number
      }
    >()

    const addUsage = (modelKeyRaw: string | null | undefined, inputTokens: number, outputTokens: number) => {
      const modelKey = normalizeModelKey(modelKeyRaw)
      if (modelFilter !== 'all' && modelKey !== modelFilter) return
      const pricing = pricingByModel.get(modelKey)
      const inputRate = Number(pricing?.input_cost_per_1m_tokens_usd ?? 0)
      const outputRate = Number(pricing?.output_cost_per_1m_tokens_usd ?? 0)
      const cost = inputTokens * (inputRate / 1_000_000) + outputTokens * (outputRate / 1_000_000)
      const current = rows.get(modelKey) ?? {
        modelKey,
        displayName: pricing?.display_name ?? modelKey,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
      }
      current.inputTokens += inputTokens
      current.outputTokens += outputTokens
      // Keep totals consistent with visible input/output columns.
      current.totalTokens += inputTokens + outputTokens
      current.estimatedCostUsd += cost
      rows.set(modelKey, current)
    }

    for (const t of modelAnalyticsRows) {
      if (t.amount >= 0) continue
      const textModel = readMetaString(t.metadata, ['model_used', 'ai_model_used', 'model']) ?? 'unknown'
      const imageModel = readMetaString(t.metadata, ['image_model_used', 'image_generator_model_used'])

      const textInput =
        readMetaNumber(t.metadata, ['input_tokens', 'prompt_tokens']) +
        readMetaNumber(t.metadata, ['translation_input_tokens', 'translation_prompt_tokens'])
      const textOutput =
        readMetaNumber(t.metadata, ['output_tokens', 'completion_tokens']) +
        readMetaNumber(t.metadata, ['translation_output_tokens', 'translation_completion_tokens'])
      const imageInput = readMetaNumber(t.metadata, ['image_prompt_tokens'])
      const imageOutput = readMetaNumber(t.metadata, ['image_completion_tokens'])
      const ttsInput = readMetaNumber(t.metadata, ['tts_prompt_tokens'])
      const ttsOutput = readMetaNumber(t.metadata, ['tts_completion_tokens'])
      const ttsModel = readMetaString(t.metadata, ['tts_model_used'])

      if (textInput > 0 || textOutput > 0) addUsage(textModel, textInput, textOutput)
      if ((imageInput > 0 || imageOutput > 0) && imageModel) addUsage(imageModel, imageInput, imageOutput)
      if ((ttsInput > 0 || ttsOutput > 0) && ttsModel) addUsage(ttsModel, ttsInput, ttsOutput)
    }

    return Array.from(rows.values())
      .filter((r) => r.inputTokens > 0 || r.outputTokens > 0 || r.totalTokens > 0 || r.estimatedCostUsd > 0)
  }, [modelAnalyticsRows, modelPricing, modelFilter])

  const models = useMemo(() => {
    const fromTx = new Set<string>()
    for (const t of transactions) {
      const m1 = normalizeModelKey(readMetaString(t.metadata, ['model_used', 'ai_model_used', 'model']) ?? 'unknown')
      const m2 = normalizeModelKey(readMetaString(t.metadata, ['image_model_used', 'image_generator_model_used']) ?? '')
      const m3 = normalizeModelKey(readMetaString(t.metadata, ['tts_model_used']) ?? '')
      if (m1 && m1 !== 'unknown') fromTx.add(m1)
      if (m2 && m2 !== 'unknown') fromTx.add(m2)
      if (m3 && m3 !== 'unknown') fromTx.add(m3)
    }
    return ['all', ...Array.from(fromTx).sort()]
  }, [transactions])

  const stats = useMemo(() => {
    const billed = filtered.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
    const aiInput = filtered.reduce((s, t) => {
      const main = readMetaNumber(t.metadata, ['input_tokens', 'prompt_tokens'])
      const lessonExtra = readMetaNumber(t.metadata, ['image_prompt_tokens']) + readMetaNumber(t.metadata, ['tts_prompt_tokens'])
      const translation = readMetaNumber(t.metadata, [
        'translation_input_tokens',
        'translation_prompt_tokens',
      ])
      return s + main + translation + lessonExtra
    }, 0)
    const aiOutput = filtered.reduce((s, t) => {
      const main = readMetaNumber(t.metadata, ['output_tokens', 'completion_tokens'])
      const lessonExtra = readMetaNumber(t.metadata, ['image_completion_tokens']) + readMetaNumber(t.metadata, ['tts_completion_tokens'])
      const translation = readMetaNumber(t.metadata, [
        'translation_output_tokens',
        'translation_completion_tokens',
      ])
      return s + main + translation + lessonExtra
    }, 0)
    // Keep total aligned with the same filtered rows and the same token components
    // shown in input/output cards to avoid cross-section mismatches.
    const aiTotal = aiInput + aiOutput
    const bySource = filtered.reduce(
      (acc, t) => {
        const source = t.profile?.source ?? 'erp'
        if (t.amount < 0) acc[source] = (acc[source] ?? 0) + Math.abs(t.amount)
        return acc
      },
      {} as Record<string, number>
    )
    return { billed, aiInput, aiOutput, aiTotal, bySource }
  }, [filtered])

  const visibleModelRows = derivedModelRows

  const filteredModelTotals = useMemo(() => {
    return visibleModelRows.reduce(
      (acc, row) => {
        acc.inputTokens += row.inputTokens
        acc.outputTokens += row.outputTokens
        acc.totalTokens += row.totalTokens
        acc.estimatedCostUsd += row.estimatedCostUsd
        return acc
      },
      { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUsd: 0 }
    )
  }, [visibleModelRows])

  const sortedModelRows = useMemo(() => {
    const list = [...visibleModelRows]
    list.sort((a, b) => {
      let cmp = 0
      if (modelSortKey === 'estimatedCostUsd') cmp = a.estimatedCostUsd - b.estimatedCostUsd
      if (modelSortKey === 'totalTokens') cmp = a.totalTokens - b.totalTokens
      if (modelSortKey === 'inputTokens') cmp = a.inputTokens - b.inputTokens
      if (modelSortKey === 'outputTokens') cmp = a.outputTokens - b.outputTokens
      if (modelSortKey === 'modelKey') cmp = a.modelKey.localeCompare(b.modelKey)
      return modelSortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [visibleModelRows, modelSortKey, modelSortDir])

  const modelTotalPages = Math.max(1, Math.ceil(sortedModelRows.length / modelPageSize))
  const modelCurrentPage = Math.min(modelPage, modelTotalPages)
  const pagedModelRows = useMemo(() => {
    const start = (modelCurrentPage - 1) * modelPageSize
    return sortedModelRows.slice(start, start + modelPageSize)
  }, [sortedModelRows, modelCurrentPage, modelPageSize])

  const sortedTxRows = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      const inputA =
        readMetaNumber(a.metadata, ['input_tokens', 'prompt_tokens']) +
        readMetaNumber(a.metadata, ['image_prompt_tokens']) +
        readMetaNumber(a.metadata, ['tts_prompt_tokens']) +
        readMetaNumber(a.metadata, ['translation_input_tokens', 'translation_prompt_tokens'])
      const inputB =
        readMetaNumber(b.metadata, ['input_tokens', 'prompt_tokens']) +
        readMetaNumber(b.metadata, ['image_prompt_tokens']) +
        readMetaNumber(b.metadata, ['tts_prompt_tokens']) +
        readMetaNumber(b.metadata, ['translation_input_tokens', 'translation_prompt_tokens'])
      const outputA =
        readMetaNumber(a.metadata, ['output_tokens', 'completion_tokens']) +
        readMetaNumber(a.metadata, ['image_completion_tokens']) +
        readMetaNumber(a.metadata, ['tts_completion_tokens']) +
        readMetaNumber(a.metadata, ['translation_output_tokens', 'translation_completion_tokens'])
      const outputB =
        readMetaNumber(b.metadata, ['output_tokens', 'completion_tokens']) +
        readMetaNumber(b.metadata, ['image_completion_tokens']) +
        readMetaNumber(b.metadata, ['tts_completion_tokens']) +
        readMetaNumber(b.metadata, ['translation_output_tokens', 'translation_completion_tokens'])
      let cmp = 0
      if (txSortKey === 'created_at') cmp = a.created_at.localeCompare(b.created_at)
      if (txSortKey === 'amount') cmp = a.amount - b.amount
      if (txSortKey === 'input') cmp = inputA - inputB
      if (txSortKey === 'output') cmp = outputA - outputB
      if (txSortKey === 'action_type') cmp = a.action_type.localeCompare(b.action_type)
      if (txSortKey === 'user') {
        const an = (a.profile?.full_name ?? a.profile?.email ?? a.profile_id).toLowerCase()
        const bn = (b.profile?.full_name ?? b.profile?.email ?? b.profile_id).toLowerCase()
        cmp = an.localeCompare(bn)
      }
      return txSortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [filtered, txSortKey, txSortDir])

  const txTotalPages = Math.max(1, Math.ceil(sortedTxRows.length / txPageSize))
  const txCurrentPage = Math.min(txPage, txTotalPages)
  const pagedTxRows = useMemo(() => {
    const start = (txCurrentPage - 1) * txPageSize
    return sortedTxRows.slice(start, start + txPageSize)
  }, [sortedTxRows, txCurrentPage, txPageSize])

  const handlePricingChange = (
    id: string,
    field: 'display_name' | 'input_cost_per_1m_tokens_usd' | 'output_cost_per_1m_tokens_usd',
    value: string
  ) => {
    setPricingRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row
        if (field === 'input_cost_per_1m_tokens_usd' || field === 'output_cost_per_1m_tokens_usd') {
          return { ...row, [field]: Number(value || 0) }
        }
        return { ...row, [field]: value }
      })
    )
  }

  const handleSavePricing = async () => {
    setPricingSaving(true)
    setMessage(null)
    const sourceUrl = pricingSourceUrl.trim()
    const saveResults = await Promise.all(
      pricingRows.map((row) =>
        updateModelPricing({
          id: row.id,
          displayName: row.display_name,
          sourceUrl,
          inputCostPer1M: Number(row.input_cost_per_1m_tokens_usd),
          outputCostPer1M: Number(row.output_cost_per_1m_tokens_usd),
        })
      )
    )
    setPricingSaving(false)
    const failed = saveResults.find((result) => result.error)
    if (failed?.error) {
      setMessage(failed.error)
      return
    }
    setPricingRows((prev) => prev.map((row) => ({ ...row, source_url: sourceUrl })))
    setMessage('Model pricing updated for all models.')
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {message}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <nav className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/platform-owner" className="hover:text-gray-700">
              Dashboard
            </Link>
            <span>/</span>
            <span className="font-medium text-gray-900">Real token usage</span>
          </nav>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
            <Activity className="h-7 w-7 text-red-600" />
            Real token usage analytics
          </h1>
          <p className="mt-1.5 max-w-3xl text-sm text-gray-600">
            Platform Owner view for real user usage across ERP. Data is loaded from token
            transactions for the last {defaultDays} days.
          </p>
        </div>
        <Link href="/platform-owner/usage-payments">
          <Button variant="outline">Open usage & payments</Button>
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm sm:p-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Usage analytics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'pricing'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Settings2 className="h-4 w-4" />
            Model pricing controls
          </button>
        </div>
      </div>

      {activeTab === 'analytics' && (
        <>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Billed tokens</p><p className="text-2xl font-bold">{stats.billed.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">AI input tokens</p><p className="text-2xl font-bold">{filteredModelTotals.inputTokens.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">AI output tokens</p><p className="text-2xl font-bold">{filteredModelTotals.outputTokens.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Rows in filter</p><p className="text-2xl font-bold">{filtered.length.toLocaleString()}</p></CardContent></Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Estimated AI cost (USD)</p>
            <p className="text-2xl font-bold text-emerald-700">{fmtUsd(filteredModelTotals.estimatedCostUsd)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Tracked models</p>
            <p className="text-2xl font-bold">{visibleModelRows.length.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Total AI tokens</p>
            <p className="text-2xl font-bold">{stats.aiTotal.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="h-4 w-4" />Filters</CardTitle>
          <CardDescription>Filter by app source, action type, model, or user.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <select className="rounded-lg border px-3 py-2 text-sm" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as 'all' | 'erp' | 'api')}>
            <option value="all">All sources</option>
            <option value="erp">ERP</option>
            <option value="api">API</option>
          </select>
          <select className="rounded-lg border px-3 py-2 text-sm" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            {actions.map((a) => <option key={a} value={a}>{a === 'all' ? 'All actions' : fmtAction(a)}</option>)}
          </select>
          <select className="rounded-lg border px-3 py-2 text-sm" value={modelFilter} onChange={(e) => setModelFilter(e.target.value)}>
            {models.map((m) => <option key={m} value={m}>{m === 'all' ? 'All models' : m}</option>)}
          </select>
          <label className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input className="w-full border-0 p-0 text-sm outline-none" placeholder="Search user or action" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <select className="rounded-lg border px-3 py-2 text-sm" value={`${txSortKey}:${txSortDir}`} onChange={(e) => {
            const [key, dir] = e.target.value.split(':') as [typeof txSortKey, typeof txSortDir]
            setTxSortKey(key)
            setTxSortDir(dir)
            setTxPage(1)
          }}>
            <option value="created_at:desc">Newest first</option>
            <option value="created_at:asc">Oldest first</option>
            <option value="amount:desc">Billed high to low</option>
            <option value="input:desc">Input high to low</option>
            <option value="output:desc">Output high to low</option>
            <option value="action_type:asc">Action A-Z</option>
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4" />Model usage and estimated cost</CardTitle>
          <CardDescription>
            Estimated using pricing rates (USD per 1M tokens). Totals below are filtered by selected model.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex items-center justify-end gap-2 border-b px-4 py-2">
            <select className="rounded border px-2 py-1 text-sm" value={`${modelSortKey}:${modelSortDir}`} onChange={(e) => {
              const [key, dir] = e.target.value.split(':') as [typeof modelSortKey, typeof modelSortDir]
              setModelSortKey(key)
              setModelSortDir(dir)
              setModelPage(1)
            }}>
              <option value="estimatedCostUsd:desc">Cost high to low</option>
              <option value="estimatedCostUsd:asc">Cost low to high</option>
              <option value="totalTokens:desc">Total tokens high to low</option>
              <option value="inputTokens:desc">Input high to low</option>
              <option value="outputTokens:desc">Output high to low</option>
              <option value="modelKey:asc">Model A-Z</option>
            </select>
            <select className="rounded border px-2 py-1 text-sm" value={String(modelPageSize)} onChange={(e) => {
              setModelPageSize(Number(e.target.value))
              setModelPage(1)
            }}>
              <option value="10">10 / page</option>
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Model</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Input</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Output</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Est. cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {pagedModelRows.map((row) => (
                  <tr key={row.modelKey}>
                    <td className="px-4 py-3 text-sm">
                      <p className="font-medium text-gray-900">{row.displayName}</p>
                      <p className="text-xs text-gray-500">{row.modelKey}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">{row.inputTokens.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-sm">{row.outputTokens.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium">{row.totalTokens.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-700">{fmtUsd(row.estimatedCostUsd)}</td>
                  </tr>
                ))}
                {pagedModelRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">No model usage rows for current filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-gray-500">
            <p>Page {modelCurrentPage}/{modelTotalPages}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={modelCurrentPage <= 1} onClick={() => setModelPage((p) => Math.max(1, p - 1))}>Prev</Button>
              <Button variant="outline" size="sm" disabled={modelCurrentPage >= modelTotalPages} onClick={() => setModelPage((p) => Math.min(modelTotalPages, p + 1))}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wallet className="h-4 w-4" />Detailed records</CardTitle>
          <CardDescription>Showing {pagedTxRows.length} of {filtered.length} filtered rows (latest loaded set).</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex items-center justify-end gap-2 border-b px-4 py-2">
            <select className="rounded border px-2 py-1 text-sm" value={String(txPageSize)} onChange={(e) => {
              setTxPageSize(Number(e.target.value))
              setTxPage(1)
            }}>
              <option value="10">10 / page</option>
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Action</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Billed</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Input</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Output</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {pagedTxRows.map((t) => {
                  const input =
                    readMetaNumber(t.metadata, ['input_tokens', 'prompt_tokens']) +
                    readMetaNumber(t.metadata, ['image_prompt_tokens']) +
                    readMetaNumber(t.metadata, ['tts_prompt_tokens']) +
                    readMetaNumber(t.metadata, ['translation_input_tokens', 'translation_prompt_tokens'])
                  const output =
                    readMetaNumber(t.metadata, ['output_tokens', 'completion_tokens']) +
                    readMetaNumber(t.metadata, ['image_completion_tokens']) +
                    readMetaNumber(t.metadata, ['tts_completion_tokens']) +
                    readMetaNumber(t.metadata, ['translation_output_tokens', 'translation_completion_tokens'])
                  const hasTranslationTelemetry =
                    readMetaNumber(t.metadata, ['translation_total_tokens']) > 0 ||
                    readMetaNumber(t.metadata, ['translation_input_tokens', 'translation_prompt_tokens']) > 0 ||
                    readMetaNumber(t.metadata, ['translation_output_tokens', 'translation_completion_tokens']) > 0
                  const imageCountRequested = readMetaNumber(t.metadata, ['image_count_requested'])
                  const imageCountGenerated = readMetaNumber(t.metadata, ['image_count_generated'])
                  const includeAudio = !!t.metadata?.include_audio
                  const hasTtsTelemetry =
                    readMetaNumber(t.metadata, ['tts_prompt_tokens']) > 0 ||
                    readMetaNumber(t.metadata, ['tts_completion_tokens']) > 0
                  return (
                    <tr key={t.id}>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{t.profile?.full_name ?? t.profile?.email ?? t.profile_id}</p>
                            <p className="text-xs text-gray-500">{t.profile?.email ?? ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm uppercase text-gray-700">{t.profile?.source ?? 'erp'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {fmtAction(t.action_type)}
                        {hasTranslationTelemetry && (
                          <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-700">
                            +translation
                          </span>
                        )}
                        {t.action_type === 'rag_indexing' && (
                          <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                            embedding
                          </span>
                        )}
                        {t.action_type === 'lesson_generation' && imageCountRequested > 0 && (
                          <span className="ml-2 rounded bg-fuchsia-50 px-1.5 py-0.5 text-xs text-fuchsia-700">
                            images {imageCountGenerated}/{imageCountRequested}
                          </span>
                        )}
                        {t.action_type === 'lesson_generation' && includeAudio && (
                          <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">
                            audio included
                          </span>
                        )}
                        {t.action_type === 'lesson_generation' && includeAudio && !hasTtsTelemetry && (
                          <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
                            audio in progress
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold">{t.amount < 0 ? Math.abs(t.amount).toLocaleString() : '-'}</td>
                      <td className="px-4 py-3 text-right text-sm">{input ? input.toLocaleString() : '-'}</td>
                      <td className="px-4 py-3 text-right text-sm">{output ? output.toLocaleString() : '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(t.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-gray-500">
            <p>Page {txCurrentPage}/{txTotalPages}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={txCurrentPage <= 1} onClick={() => setTxPage((p) => Math.max(1, p - 1))}>Prev</Button>
              <Button variant="outline" size="sm" disabled={txCurrentPage >= txTotalPages} onClick={() => setTxPage((p) => Math.min(txTotalPages, p + 1))}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
        </>
      )}

      {activeTab === 'pricing' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings2 className="h-4 w-4" />Model pricing controls</CardTitle>
            <CardDescription>
              Update pricing rates without redeploy. One source link is applied to all models.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-dashed p-3">
              <label className="text-xs text-gray-600">
                Pricing source URL (shared for all models)
                <input
                  value={pricingSourceUrl}
                  onChange={(e) => setPricingSourceUrl(e.target.value)}
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  placeholder="https://ai.google.dev/gemini-api/docs/pricing"
                />
              </label>
              <div className="mt-3 flex justify-end">
                <Button variant="outline" onClick={handleSavePricing} disabled={pricingSaving}>
                  {pricingSaving ? 'Saving...' : 'Save all pricing'}
                </Button>
              </div>
            </div>
            {pricingRows.map((row) => (
              <div key={row.id} className="rounded-lg border p-3">
                <div className="grid gap-2 md:grid-cols-4">
                  <input
                    value={row.display_name}
                    onChange={(e) => handlePricingChange(row.id, 'display_name', e.target.value)}
                    className="rounded border px-2 py-1 text-sm md:col-span-2"
                  />
                  <label className="text-xs text-gray-600">
                    Input / 1M
                    <input
                      type="number"
                      step="0.000001"
                      min={0}
                      value={row.input_cost_per_1m_tokens_usd}
                      onChange={(e) =>
                        handlePricingChange(row.id, 'input_cost_per_1m_tokens_usd', e.target.value)
                      }
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-xs text-gray-600">
                    Output / 1M
                    <input
                      type="number"
                      step="0.000001"
                      min={0}
                      value={row.output_cost_per_1m_tokens_usd}
                      onChange={(e) =>
                        handlePricingChange(row.id, 'output_cost_per_1m_tokens_usd', e.target.value)
                      }
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    />
                  </label>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
