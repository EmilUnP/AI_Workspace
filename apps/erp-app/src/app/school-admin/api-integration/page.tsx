import { createClient } from '@eduator/auth/supabase/server'
import { redirect } from 'next/navigation'
import { teacherApiKeyRepository } from '@eduator/db'
import { getTranslations } from 'next-intl/server'
import { ApiIntegrationClient } from './api-integration-client'
import { getApiUrl } from '../../../lib/portal-urls'

const API_BASE = getApiUrl()
const API_BASE_V1 = `${API_BASE}/api/v1/school-admin`

export default async function ApiIntegrationPage() {
  const t = await getTranslations('teacherApiIntegration')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, metadata')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  const metadata = profile.metadata as { api_integration_enabled?: boolean } | null
  if (!metadata?.api_integration_enabled) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h2 className="text-lg font-semibold">{t('notEnabled')}</h2>
        <p className="mt-2 text-sm">
          {t('notEnabledMessage')}
        </p>
      </div>
    )
  }

  const [keys, usageStats] = await Promise.all([
    teacherApiKeyRepository.listByProfile(profile.id),
    teacherApiKeyRepository.getUsageStats(profile.id),
  ])

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {t('title')}
        </h1>
        <p className="mt-2 text-base text-gray-600 leading-relaxed">
          {t.rich('subtitle', {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-gray-50/50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">
          {t('howItWorks')}
        </h2>
        <ol className="flex flex-col gap-3 text-sm text-gray-700">
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">1</span>
            <span>{t.rich('step1', {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">2</span>
            <span>{t.rich('step2', {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}</span>
          </li>
        </ol>
      </section>

      <ApiIntegrationClient
        keys={keys}
        usageStats={usageStats}
        apiBaseUrl={API_BASE_V1}
      />
    </div>
  )
}

