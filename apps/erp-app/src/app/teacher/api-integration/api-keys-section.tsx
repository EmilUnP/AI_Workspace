'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Key, Plus, Copy, Trash2, Check, AlertCircle } from 'lucide-react'
import { createApiKey, revokeApiKey } from './actions'
import type { TeacherApiKeyRow } from '@eduator/db'

interface ApiKeysSectionProps {
  keys: TeacherApiKeyRow[]
}

export function ApiKeysSection({ keys: initialKeys }: ApiKeysSectionProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [newKeyResult, setNewKeyResult] = useState<{ key: string; name: string } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [keyName, setKeyName] = useState('')

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNewKeyResult(null)
    const formData = new FormData()
    formData.set('name', keyName.trim() || 'My API Key')
    startTransition(async () => {
      const result = await createApiKey(null, formData)
      if (result.error) {
        setError(result.error)
      } else if (result.key && result.name) {
        setNewKeyResult({ key: result.key, name: result.name })
        setKeyName('')
        router.refresh()
      }
    })
  }

  const handleCopy = (id: string, value: string) => {
    void navigator.clipboard.writeText(value)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRevoke = (keyId: string) => {
    if (!confirm('Revoke this API key? It will stop working immediately.')) return
    setError(null)
    startTransition(async () => {
      const result = await revokeApiKey(keyId)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
          <Key className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Your API keys</h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Create a key to authenticate your app. Copy it when shown — you won&apos;t see it again. Keep it secret.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* One-time new key display */}
      {newKeyResult && (
        <div className="mb-6 rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Copy your new key now — you won&apos;t see it again.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 rounded bg-amber-100 px-2 py-1.5 text-sm font-mono text-amber-900 break-all">
              {newKeyResult.key}
            </code>
            <button
              type="button"
              onClick={() => handleCopy('new', newKeyResult.key)}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
            >
              {copiedId === 'new' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedId === 'new' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleCreate} className="mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="key_name" className="block text-sm font-medium text-gray-700 mb-1">
            Key name
          </label>
          <input
            id="key_name"
            type="text"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="e.g. Production app"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {isPending ? 'Creating...' : 'Create API key'}
        </button>
      </form>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Existing keys</h3>
        {initialKeys.length === 0 ? (
          <p className="text-sm text-gray-500">No keys yet. Create one above to get started.</p>
        ) : (
          <ul className="space-y-2">
            {initialKeys.map((k) => (
              <li
                key={k.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
              >
                <div>
                  <span className="font-medium text-gray-900">{k.name}</span>
                  <span className="ml-2 font-mono text-xs text-gray-500">{k.key_prefix}…</span>
                  <span className="ml-2 text-xs text-gray-400">
                    Created {new Date(k.created_at).toLocaleDateString()}
                    {k.last_used_at && ` · Last used ${new Date(k.last_used_at).toLocaleDateString()}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(k.id)}
                  disabled={isPending}
                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  title="Revoke key"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
