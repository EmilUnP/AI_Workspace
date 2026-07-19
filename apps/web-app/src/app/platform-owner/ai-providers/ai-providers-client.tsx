'use client'

import { useState, useTransition } from 'react'
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
  const [policyDrafts, setPolicyDrafts] = useState<Record<string, string>>(
    Object.fromEntries(policies.map((policy) => [policy.workload, policy.model_chain.join('\n')]))
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
            Ordered fallback chains. Put one OpenRouter model ID per line.
          </p>
        </div>
        <div className="space-y-4">
          {policies.map((policy) => (
            <div key={policy.workload} className="rounded-xl border border-gray-200 p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-medium text-gray-900">{policy.workload}</h3>
                  <p className="text-xs text-gray-500">{policy.notes || 'No notes'}</p>
                </div>
                <div className="text-xs text-gray-500">
                  structured={String(policy.require_structured_outputs)} · zdr={String(policy.prefer_zdr)} ·
                  enabled={String(policy.is_enabled)}
                </div>
              </div>
              <textarea
                value={policyDrafts[policy.workload] || ''}
                onChange={(event) =>
                  setPolicyDrafts((prev) => ({ ...prev, [policy.workload]: event.target.value }))
                }
                rows={3}
                className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs"
              />
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  run(
                    () =>
                      updateWorkloadPolicy({
                        workload: policy.workload,
                        expectedVersion: policy.version,
                        modelChain: (policyDrafts[policy.workload] || '')
                          .split('\n')
                          .map((line) => line.trim())
                          .filter(Boolean),
                        requireStructuredOutputs: policy.require_structured_outputs,
                        preferZdr: policy.prefer_zdr,
                        isEnabled: policy.is_enabled,
                      }),
                    `Updated ${policy.workload}`
                  )
                }
                className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Save policy
              </button>
            </div>
          ))}
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
