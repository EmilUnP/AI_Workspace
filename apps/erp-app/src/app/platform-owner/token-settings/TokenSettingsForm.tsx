'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { TokenUsageSetting } from '@eduator/core/types/token'
import { updateTokenSetting } from './actions'
import { FileText, BookOpen, Sparkles, MessageSquare, UserPlus, Pencil, Check, X } from 'lucide-react'

interface TokenSettingsFormProps {
  settings: TokenUsageSetting[]
}

const GROUP_CONFIG: Record<string, { label: string; icon: React.ElementType; description: string }> = {
  exam: { label: 'Exam generation', icon: FileText, description: 'Cost per exam or per N questions' },
  lesson: { label: 'Lesson generation', icon: BookOpen, description: 'Base lesson, images, and audio' },
  course: {
    label: 'Course generation',
    icon: Sparkles,
    description: 'Base + all lessons + final exam (one course = many AI operations)',
  },
  education_plan: {
    label: 'Education plans',
    icon: Sparkles,
    description: 'Cost per AI-generated education plan',
  },
  chat: { label: 'AI chat', icon: MessageSquare, description: 'Cost per message (learner and teacher)' },
  rag: { label: 'RAG documents', icon: MessageSquare, description: 'Cost for indexing/uploading documents for RAG retrieval' },
  onboarding: {
    label: 'New user onboarding',
    icon: UserPlus,
    description: 'Tokens granted automatically to each new user. Change to 50, 100, 150, or any number; set to 0 to disable.',
  },
}

function getGroup(key: string): string {
  if (key === 'initial_tokens_for_new_users') return 'onboarding'
  if (key.startsWith('rag')) return 'rag'
  if (key.startsWith('exam')) return 'exam'
  if (key.startsWith('education_plan')) return 'education_plan'
  if (key.startsWith('lesson') || key.startsWith('course_base')) return key.startsWith('course') ? 'course' : 'lesson'
  if (key.includes('chat')) return 'chat'
  return 'other'
}

function getExtraDescription(setting: TokenUsageSetting): string {
  const extra = setting.extra as Record<string, unknown> | undefined
  if (!extra || typeof extra !== 'object') return ''
  if ('per_questions' in extra && typeof extra.per_questions === 'number') {
    return `Per ${extra.per_questions} questions`
  }
  if ('batch_size' in extra && typeof extra.batch_size === 'number') {
    return `Per batch of ${extra.batch_size} images`
  }
  return ''
}

export function TokenSettingsForm({ settings: initialSettings }: TokenSettingsFormProps) {
  const [settings, setSettings] = useState(initialSettings)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [tokensValue, setTokensValue] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const startEdit = (s: TokenUsageSetting) => {
    setEditingKey(s.key)
    setTokensValue(String(s.tokens))
    setMessage(null)
  }

  const cancelEdit = () => {
    setEditingKey(null)
    setTokensValue('')
    setMessage(null)
  }

  const saveEdit = async () => {
    if (!editingKey) return
    const tokens = parseInt(tokensValue, 10)
    if (isNaN(tokens) || tokens < 0) {
      setMessage({ type: 'error', text: 'Enter a valid number (0 or more)' })
      return
    }
    setSaving(true)
    setMessage(null)
    const result = await updateTokenSetting(editingKey, { tokens })
    setSaving(false)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
      return
    }
    if (result.data) {
      setSettings((prev) =>
        prev.map((s) => (s.key === editingKey ? result.data! : s))
      )
      setMessage({ type: 'success', text: 'Setting saved.' })
      setEditingKey(null)
      setTokensValue('')
    }
  }

  const grouped = settings.reduce<Record<string, TokenUsageSetting[]>>((acc, s) => {
    const g = getGroup(s.key)
    if (!acc[g]) acc[g] = []
    acc[g].push(s)
    return acc
  }, {})

  const order = ['exam', 'lesson', 'course', 'education_plan', 'chat', 'rag', 'onboarding', 'other']

  return (
    <div className="space-y-8">
      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
          role="alert"
        >
          {message.text}
        </div>
      )}

      {order.map((groupKey) => {
        const items = grouped[groupKey]
        if (!items?.length) return null
        const conf = GROUP_CONFIG[groupKey]
        const Icon = conf?.icon ?? FileText
        return (
          <section
            key={groupKey}
            className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
          >
            {conf && (
              <div className="border-b border-gray-200 bg-gray-50/80 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-200 text-gray-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">{conf.label}</h2>
                    <p className="text-xs text-gray-600">{conf.description}</p>
                  </div>
                </div>
              </div>
            )}
            <ul className="divide-y divide-gray-200">
              {items.map((s) => {
                const isEditing = editingKey === s.key
                const extraDesc = getExtraDescription(s)
                return (
                  <li
                    key={s.id}
                    className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{s.label}</p>
                      {extraDesc && (
                        <p className="mt-0.5 text-xs text-gray-500">{extraDesc}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4">
                      {isEditing ? (
                        <>
                          <input
                            type="number"
                            min={0}
                            value={tokensValue}
                            onChange={(e) => setTokensValue(e.target.value)}
                            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:ring-1 focus:ring-red-500"
                            aria-label={`Tokens for ${s.label}`}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={saveEdit}
                              disabled={saving}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              <Check className="h-4 w-4" />
                              {saving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={saving}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <X className="h-4 w-4" />
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-lg font-bold tabular-nums text-gray-900">
                            {s.tokens}
                          </span>
                          <span className="text-sm text-gray-500">tokens</span>
                          <button
                            type="button"
                            onClick={() => startEdit(s)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}

      <p className="text-sm text-gray-500">
        Changes take effect immediately. View <Link href="/platform-owner/usage-payments" className="font-medium text-red-600 hover:text-red-700 underline">Usage & payments</Link> to see how tokens are consumed.
      </p>
    </div>
  )
}
