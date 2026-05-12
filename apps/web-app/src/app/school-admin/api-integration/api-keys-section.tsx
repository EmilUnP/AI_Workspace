'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Key, Plus, Copy, Trash2, Check, AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createApiKey, getApiKeys, revokeApiKey } from './actions'
import type { TeacherApiKeyRow } from './api-integration-client'

interface ApiKeysSectionProps {
  keys: TeacherApiKeyRow[]
}

export function ApiKeysSection({ keys: initialKeys }: ApiKeysSectionProps) {
  const t = useTranslations('teacherApiIntegration')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [keys, setKeys] = useState<TeacherApiKeyRow[]>(initialKeys)
  const [newKeyResult, setNewKeyResult] = useState<{ key: string; name: string } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [keyName, setKeyName] = useState('')
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const result = await getApiKeys()
      if (result.error) return
      setKeys(result.items ?? [])
    })()
  }, [])

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNewKeyResult(null)
    const formData = new FormData()
    formData.set('name', keyName.trim() || t('defaultApiKeyName'))
    startTransition(async () => {
      const result = await createApiKey(null, formData)
      if (result.error) {
        setError(result.error)
      } else if (result.key && result.name) {
        setNewKeyResult({ key: result.key, name: result.name })
        setKeyName('')
        const keysResult = await getApiKeys()
        if (!keysResult.error) setKeys(keysResult.items ?? [])
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
    setKeyToDelete(keyId)
  }

  const confirmRevoke = () => {
    if (!keyToDelete) return
    setError(null)
    startTransition(async () => {
      const result = await revokeApiKey(keyToDelete)
      if (result.error) setError(result.error)
      else {
        const keysResult = await getApiKeys()
        if (!keysResult.error) setKeys(keysResult.items ?? [])
        router.refresh()
      }
      setKeyToDelete(null)
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
          <Key className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('yourApiKeys')}</h2>
          <p className="text-sm text-gray-600 mt-0.5">
            {t('manageApiKeysDescription')}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 p-3 text-sm text-gray-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* One-time new key display */}
      {newKeyResult && (
        <div className="mb-6 rounded-lg border-2 border-gray-300 bg-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-900">
            {t('copyNewKeyNow')}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 rounded bg-gray-200 px-2 py-1.5 text-sm font-mono text-gray-900 break-all">
              {newKeyResult.key}
            </code>
            <button
              type="button"
              onClick={() => handleCopy('new', newKeyResult.key)}
              className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-black"
            >
              {copiedId === 'new' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedId === 'new' ? t('copied') : t('copy')}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleCreate} className="mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="key_name" className="block text-sm font-medium text-gray-700 mb-1">
            {t('keyName')}
          </label>
          <input
            id="key_name"
            type="text"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder={t('keyNamePlaceholder')}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {isPending ? t('creating') : t('createApiKey')}
        </button>
      </form>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">{t('existingKeys')}</h3>
        {keys.length === 0 ? (
          <p className="text-sm text-gray-500">{t('noKeysYet')}</p>
        ) : (
          <ul className="space-y-2">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
              >
                <div>
                  <span className="font-medium text-gray-900">{k.name}</span>
                  <span className="ml-2 font-mono text-xs text-gray-500">{k.key_prefix}…</span>
                  <span className="ml-2 text-xs text-gray-400">
                    {t('created')} {new Date(k.created_at).toLocaleDateString()}
                    {k.last_used_at && ` · ${t('lastUsed')} ${new Date(k.last_used_at).toLocaleDateString()}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(k.id)}
                  disabled={isPending}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                  title={t('revokeKey')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {keyToDelete && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => !isPending && setKeyToDelete(null)}
            aria-hidden
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-2xl bg-white ring-1 ring-gray-200">
              <div className="p-6 sm:p-8">
                <h3 className="mb-2 text-center text-xl font-bold text-gray-900">{t('deleteKey')}</h3>
                <p className="text-center text-sm text-gray-600">{t('revokeApiKeyConfirm')}</p>
              </div>
              <div className="flex gap-3 bg-gray-50 px-6 py-4 sm:px-8">
                <button
                  type="button"
                  onClick={() => setKeyToDelete(null)}
                  disabled={isPending}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={confirmRevoke}
                  disabled={isPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-black disabled:opacity-70"
                >
                  <Trash2 className="h-4 w-4" />
                  {t('deleteKey')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
