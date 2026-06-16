'use client'

import { useEffect, useState, useTransition } from 'react'
import { AlertCircle, KeyRound, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { deleteGeminiKey, getGeminiKeyStatus, saveGeminiKey } from './actions'

type GeminiKeySectionProps = {
  initialHasKey: boolean
  initialKeyHint: string | null
}

export function GeminiKeySection({ initialHasKey, initialKeyHint }: GeminiKeySectionProps) {
  const t = useTranslations('teacherApiIntegration')
  const [apiKey, setApiKey] = useState('')
  const [hasKey, setHasKey] = useState(initialHasKey)
  const [keyHint, setKeyHint] = useState<string | null>(initialKeyHint)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    let isMounted = true
    setIsLoadingStatus(true)
    void getGeminiKeyStatus()
      .then((status) => {
        if (!isMounted || status.error) return
        setHasKey(Boolean(status.hasKey))
        setKeyHint(status.keyHint ?? null)
      })
      .finally(() => {
        if (isMounted) setIsLoadingStatus(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const handleSave = () => {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await saveGeminiKey(apiKey.trim())
      if (result.error) {
        setError(result.error)
        return
      }
      setHasKey(Boolean(result.hasKey))
      setKeyHint(result.keyHint ?? null)
      setApiKey('')
      setMessage(t('geminiKeySaved'))
    })
  }

  const handleDelete = () => {
    setShowDeleteConfirm(false)
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await deleteGeminiKey()
      if (result.error) {
        setError(result.error)
        return
      }
      setHasKey(false)
      setKeyHint(null)
      setMessage(t('geminiKeyRemoved'))
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('personalGeminiKey')}</h2>
          <p className="mt-0.5 text-sm text-gray-600">
            {t('personalGeminiKeyDescription')}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 p-3 text-sm text-gray-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-lg border border-gray-300 bg-gray-100 p-3 text-sm text-gray-800">
          {message}
        </div>
      )}

      <div className="space-y-3">
        <label htmlFor="gemini_key" className="block text-sm font-medium text-gray-700">
          {t('geminiApiKey')}
        </label>
        <input
          id="gemini_key"
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="AIza... or AQ...."
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
          autoComplete="off"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || isLoadingStatus || apiKey.trim().length === 0}
            className="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
          >
            {isPending ? t('saving') : hasKey ? t('updateKey') : t('saveKey')}
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
        {hasKey ? (
          <span>
            {t('activeKeyEndingWith')} <span className="font-mono text-gray-800">{keyHint ?? '****'}</span>
          </span>
        ) : (
          <span>{t('noGeminiKeySaved')}</span>
        )}
        {hasKey && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isPending || isLoadingStatus}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 sm:text-sm"
          >
            <Trash2 className="h-4 w-4" />
            {t('deleteKey')}
          </button>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => !isPending && setShowDeleteConfirm(false)}
            aria-hidden
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-2xl bg-white ring-1 ring-gray-200">
              <div className="p-6 sm:p-8">
                <h3 className="mb-2 text-center text-xl font-bold text-gray-900">{t('deleteKey')}</h3>
                <p className="text-center text-sm text-gray-600">{t('deleteGeminiKeyConfirm')}</p>
              </div>
              <div className="flex gap-3 bg-gray-50 px-6 py-4 sm:px-8">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isPending}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
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
