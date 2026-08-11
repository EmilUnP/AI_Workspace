'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  deleteOpenRouterKey,
  saveOpenRouterKey,
  setModelEnabled,
  syncModelCatalog,
  testOpenRouterKey,
  updateWorkloadPolicy,
} from './actions'

type Credential = {
  hasKey: boolean
  keyHint: string | null
  source: string
  isActive: boolean
  lastTestedAt: string | null
  lastTestStatus: string | null
  lastTestError: string | null
  version: number
  updatedAt: string | null
}

type Policy = {
  workload: string
  model_chain: string[]
  require_structured_outputs: boolean
  prefer_zdr: boolean
  is_enabled: boolean
  notes: string | null
  version: number
}

type CatalogItem = {
  model_id: string
  display_name: string
  context_length: number | null
  output_modalities: string[]
  prompt_price_per_million: string | null
  completion_price_per_million: string | null
  is_enabled: boolean
  is_deprecated: boolean
}

const WORKLOAD_LABELS: Record<string, string> = {
  lightweight_text: 'Lightweight text',
  translation: 'Translation',
  rag_query: 'RAG query',
  lesson_generation: 'Lesson generation',
  exam_generation: 'Exam generation',
  education_plan_generation: 'Education plans',
  teacher_chat: 'AI Tutor chat',
  embeddings: 'Embeddings',
  image_generation: 'Image generation',
  tts: 'Text to speech',
}

const shortModelId = (modelId: string) => {
  const parts = modelId.split('/')
  return parts[parts.length - 1] || modelId
}

export function AiProvidersClient({
  credential,
  policies,
  catalog,
}: {
  credential: Credential
  policies: Policy[]
  catalog: CatalogItem[]
}) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingWorkload, setEditingWorkload] = useState<string | null>(null)
  const [policyDrafts, setPolicyDrafts] = useState<Record<string, string>>(
    Object.fromEntries(policies.map((policy) => [policy.workload, policy.model_chain.join('\n')]))
  )
  const [policyFlags, setPolicyFlags] = useState<
    Record<string, { requireStructuredOutputs: boolean; preferZdr: boolean; isEnabled: boolean }>
  >(
    Object.fromEntries(
      policies.map((policy) => [
        policy.workload,
        {
          requireStructuredOutputs: policy.require_structured_outputs,
          preferZdr: policy.prefer_zdr,
          isEnabled: policy.is_enabled,
        },
      ])
    )
  )

  const sortedPolicies = useMemo(
    () =>
      [...policies].sort((a, b) =>
        (WORKLOAD_LABELS[a.workload] || a.workload).localeCompare(
          WORKLOAD_LABELS[b.workload] || b.workload
        )
      ),
    [policies]
  )

  const run = (fn: () => Promise<{ error?: string } | { data?: unknown }>, success: string) => {
    setMessage(null)
    setError(null)
    startTransition(async () => {
      const result = await fn()
      if ('error' in result && result.error) {
        setError(result.error)
        return
      }
      setMessage(success)
    })
  }

  return (
    <div className="space-y-8">
      {(message || error) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {error || message}
        </div>
      )}

      <section className="space-y-4 border-b border-gray-200 pb-8">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">OpenRouter platform key</h2>
          <p className="mt-1 text-sm text-gray-600">
            One encrypted platform credential. Schools do not manage provider keys.
          </p>
        </div>
        <div className="grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
          <div>Status: {credential.hasKey ? `Configured (…${credential.keyHint})` : 'Not configured'}</div>
          <div>Source: {credential.source}</div>
          <div>Last test: {credential.lastTestStatus || 'never'}</div>
          <div>Tested at: {credential.lastTestedAt || '—'}</div>
        </div>
        {credential.lastTestError && (
          <p className="text-sm text-red-700">{credential.lastTestError}</p>
        )}
        <form
          className="flex flex-col gap-3 sm:flex-row"
          action={(formData) =>
            run(() => saveOpenRouterKey(formData), 'OpenRouter key saved')
          }
        >
          <input type="hidden" name="expectedVersion" value={credential.version} />
          <input
            name="apiKey"
            type="password"
            required
            placeholder="sk-or-…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Save key
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending || !credential.hasKey}
            onClick={() => run(() => testOpenRouterKey(), 'Connection test completed')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-60"
          >
            Test connection
          </button>
          <button
            type="button"
            disabled={isPending || !credential.hasKey}
            onClick={() => run(() => deleteOpenRouterKey(), 'OpenRouter key removed')}
            className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-60"
          >
            Remove key
          </button>
          <button
            type="button"
            disabled={isPending || !credential.hasKey}
            onClick={() => run(() => syncModelCatalog(), 'Model catalog synced')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-60"
          >
            Sync model catalog
          </button>
        </div>
      </section>

      <section className="space-y-4 border-b border-gray-200 pb-8">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Workload model policies</h2>
          <p className="mt-1 text-sm text-gray-600">
            Runtime model chain per workload. Primary model is used first; later lines are fallbacks.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Workload
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Primary
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 md:table-cell">
                  Fallbacks
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedPolicies.map((policy) => {
                const isEditing = editingWorkload === policy.workload
                const primary = policy.model_chain[0] || '—'
                const fallbacks = policy.model_chain.slice(1)
                const flags = policyFlags[policy.workload] || {
                  requireStructuredOutputs: policy.require_structured_outputs,
                  preferZdr: policy.prefer_zdr,
                  isEnabled: policy.is_enabled,
                }

                if (isEditing) {
                  return (
                    <tr key={policy.workload}>
                      <td colSpan={5} className="px-4 py-3">
                        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="font-medium text-gray-900">
                                Edit · {WORKLOAD_LABELS[policy.workload] || policy.workload}
                              </div>
                              <p className="mt-0.5 text-xs text-gray-500">
                                One OpenRouter model ID per line (first = primary).
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-700">
                              <label className="inline-flex items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={flags.isEnabled}
                                  onChange={(e) =>
                                    setPolicyFlags((prev) => ({
                                      ...prev,
                                      [policy.workload]: { ...flags, isEnabled: e.target.checked },
                                    }))
                                  }
                                  className="rounded border-gray-300"
                                />
                                Enabled
                              </label>
                              <label className="inline-flex items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={flags.requireStructuredOutputs}
                                  onChange={(e) =>
                                    setPolicyFlags((prev) => ({
                                      ...prev,
                                      [policy.workload]: {
                                        ...flags,
                                        requireStructuredOutputs: e.target.checked,
                                      },
                                    }))
                                  }
                                  className="rounded border-gray-300"
                                />
                                Structured JSON
                              </label>
                              <label className="inline-flex items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={flags.preferZdr}
                                  onChange={(e) =>
                                    setPolicyFlags((prev) => ({
                                      ...prev,
                                      [policy.workload]: { ...flags, preferZdr: e.target.checked },
                                    }))
                                  }
                                  className="rounded border-gray-300"
                                />
                                Prefer ZDR
                              </label>
                            </div>
                          </div>
                          <textarea
                            value={policyDrafts[policy.workload] || ''}
                            onChange={(event) =>
                              setPolicyDrafts((prev) => ({
                                ...prev,
                                [policy.workload]: event.target.value,
                              }))
                            }
                            rows={4}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-gray-400"
                            placeholder={'google/gemini-2.5-flash\ngoogle/gemini-2.5-flash-lite'}
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                run(async () => {
                                  const result = await updateWorkloadPolicy({
                                    workload: policy.workload,
                                    expectedVersion: policy.version,
                                    modelChain: (policyDrafts[policy.workload] || '')
                                      .split('\n')
                                      .map((line) => line.trim())
                                      .filter(Boolean),
                                    requireStructuredOutputs: flags.requireStructuredOutputs,
                                    preferZdr: flags.preferZdr,
                                    isEnabled: flags.isEnabled,
                                  })
                                  if (!('error' in result && result.error)) {
                                    setEditingWorkload(null)
                                  }
                                  return result
                                }, `Updated ${WORKLOAD_LABELS[policy.workload] || policy.workload}`)
                              }
                              className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => {
                                setPolicyDrafts((prev) => ({
                                  ...prev,
                                  [policy.workload]: policy.model_chain.join('\n'),
                                }))
                                setPolicyFlags((prev) => ({
                                  ...prev,
                                  [policy.workload]: {
                                    requireStructuredOutputs: policy.require_structured_outputs,
                                    preferZdr: policy.prefer_zdr,
                                    isEnabled: policy.is_enabled,
                                  },
                                }))
                                setEditingWorkload(null)
                              }}
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={policy.workload} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {WORKLOAD_LABELS[policy.workload] || policy.workload}
                      </div>
                      <div className="font-mono text-[11px] text-gray-400">{policy.workload}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-gray-900" title={primary}>
                        {shortModelId(primary)}
                      </div>
                      <div className="mt-0.5 max-w-[200px] truncate font-mono text-[10px] text-gray-400">
                        {primary}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {fallbacks.length === 0 ? (
                        <span className="text-xs text-gray-400">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {fallbacks.map((model) => (
                            <span
                              key={model}
                              title={model}
                              className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-700"
                            >
                              {shortModelId(model)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            policy.is_enabled
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {policy.is_enabled ? 'On' : 'Off'}
                        </span>
                        {policy.require_structured_outputs ? (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                            JSON
                          </span>
                        ) : null}
                        {policy.prefer_zdr ? (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                            ZDR
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => setEditingWorkload(policy.workload)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Model catalog</h2>
          <p className="mt-1 text-sm text-gray-600">
            Enable models for admin visibility. Workload policies still control runtime selection.
          </p>
        </div>
        {catalog.length === 0 ? (
          <p className="text-sm text-gray-600">No catalog rows yet. Sync after saving an OpenRouter key.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Model</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Context</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">$/M prompt</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Output</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Enabled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {catalog.slice(0, 80).map((model) => (
                  <tr key={model.model_id}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{model.display_name}</div>
                      <div className="font-mono text-xs text-gray-500">{model.model_id}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-700">{model.context_length ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {model.prompt_price_per_million ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {(model.output_modalities || []).join(', ')}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          run(
                            () => setModelEnabled(model.model_id, !model.is_enabled),
                            `${model.model_id} ${model.is_enabled ? 'disabled' : 'enabled'}`
                          )
                        }
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          model.is_enabled
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {model.is_enabled ? 'On' : 'Off'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
