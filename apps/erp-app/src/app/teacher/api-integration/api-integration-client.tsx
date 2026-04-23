'use client'

import { useState } from 'react'
import { BookOpen, BarChart3 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ApiKeysSection } from './api-keys-section'
import { ApiDocsContent } from './api-docs-content'
import { UsageSection } from './usage-section'
import type { TeacherApiKeyRow } from '@eduator/db'

export type UsageStats = {
  totalRequests: number
  successCount: number
  errorCount: number
  byKey: Array<{ keyId: string; keyName: string; keyPrefix: string; total: number; success: number; error: number }>
  byEndpoint: Array<{ method: string; endpoint: string; total: number; success: number; error: number }>
  recent: Array<{ method: string; endpoint: string; status: string; statusCode: number | null; createdAt: string }>
}

export interface ApiIntegrationClientProps {
  keys: TeacherApiKeyRow[]
  usageStats: UsageStats
  apiBaseUrl: string
}

export function ApiIntegrationClient({ keys, usageStats, apiBaseUrl }: ApiIntegrationClientProps) {
  const t = useTranslations('teacherApiIntegration')
  const [activeTab, setActiveTab] = useState<'keys-docs' | 'usage'>('keys-docs')

  const TABS = [
    { id: 'keys-docs' as const, label: t('keysTab'), icon: BookOpen },
    { id: 'usage' as const, label: t('usageTab'), icon: BarChart3 },
  ]

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1" aria-label="Tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {activeTab === 'keys-docs' && (
        <div className="space-y-8">
          <ApiKeysSection keys={keys} />
          <ApiDocsContent apiBaseUrl={apiBaseUrl} />
        </div>
      )}

      {activeTab === 'usage' && <UsageSection usageStats={usageStats} />}
    </div>
  )
}
