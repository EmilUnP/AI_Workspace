import { tokenRepository } from '@eduator/db/repositories/tokens'
import { Coins, Settings2, Activity } from 'lucide-react'
import Link from 'next/link'
import { TokenSettingsForm } from './TokenSettingsForm'

export default async function TokenSettingsPage() {
  await tokenRepository.ensureInitialTokensForNewUsersSetting()
  await tokenRepository.ensureExamTranslationSetting()
  await tokenRepository.ensureRagIndexingSetting()
  await tokenRepository.ensureEducationPlanGenerationSetting()
  const settings = await tokenRepository.getUsageSettings()

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/platform-owner" className="hover:text-gray-700">Dashboard</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Token settings</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Coins className="h-7 w-7 text-amber-500" aria-hidden />
            Token usage settings
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-gray-600">
            Set how many tokens each AI action costs and how many tokens new users receive automatically (e.g. 100 for testing). These values apply across the platform. Users spend tokens when generating exams, lessons, courses, or using the AI tutor.
          </p>
        </div>
        <Link
          href="/platform-owner/usage-payments"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
        >
          <Activity className="h-4 w-4 text-gray-500" />
          Usage & payments
        </Link>
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-4 sm:px-6">
        <div className="flex gap-3">
          <Settings2 className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900/90">
            <p className="font-medium text-amber-900">How token costs work</p>
            <p className="mt-1">
              Each row below is one &quot;cost rule.&quot; For example, &quot;Exam: 1 token per 10 questions&quot; means a 20-question exam costs 2 tokens.
              Lesson generation can add extra cost for images (per batch) and audio. Set a cost to 0 to make that action free.
            </p>
          </div>
        </div>
      </div>

      <TokenSettingsForm settings={settings} />
    </div>
  )
}
