'use client'

import { useState, useTransition } from 'react'
import { AlertCircle, KeyRound, Trash2 } from 'lucide-react'
import { deleteGeminiKey, saveGeminiKey } from './actions'

type GeminiKeySectionProps = {
  initialHasKey: boolean
  initialKeyHint: string | null
}

export function GeminiKeySection({ initialHasKey, initialKeyHint }: GeminiKeySectionProps) {
  const [apiKey, setApiKey] = useState('')
  const [hasKey, setHasKey] = useState(initialHasKey)
  const [keyHint, setKeyHint] = useState<string | null>(initialKeyHint)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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
      setMessage('Gemini API key saved successfully.')
    })
  }

  const handleDelete = () => {
    if (!confirm('Delete your Gemini key? AI features will stop until you add a new one.')) return
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
      setMessage('Gemini API key removed.')
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Personal Gemini key</h2>
          <p className="mt-0.5 text-sm text-gray-600">
            This key is saved per user and used for AI features in your account.
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
          Gemini API key
        </label>
        <input
          id="gemini_key"
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="AIza..."
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
          autoComplete="off"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || apiKey.trim().length === 0}
            className="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
          >
            {isPending ? 'Saving...' : hasKey ? 'Update key' : 'Save key'}
          </button>
          {hasKey && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete key
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
        {hasKey ? (
          <span>
            Active key: ending with <span className="font-mono text-gray-800">{keyHint ?? '****'}</span>
          </span>
        ) : (
          <span>No key saved yet. Add your key to use AI features.</span>
        )}
      </div>
    </div>
  )
}
