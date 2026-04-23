import { createClient } from '@eduator/auth/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Coins, ExternalLink } from 'lucide-react'
import { tokenRepository } from '@eduator/db/repositories/tokens'
import { TOKEN_ACTION_TYPES } from '@eduator/core/types/token'
import { getTranslations } from 'next-intl/server'
import { getMarketingUrl } from '@/lib/marketing-url'

export const dynamic = 'force-dynamic'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

export default async function TeacherTokensPage() {
  const t = await getTranslations('teacherTokens')
  const marketingUrl = getMarketingUrl()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  const [balance, transactions] = await Promise.all([
    tokenRepository.getBalance(profile.id),
    tokenRepository.getTransactions(profile.id, 30),
  ])

  const LEARNER_CHAT_ACTION = TOKEN_ACTION_TYPES.LEARNER_CHAT
  const ACTION_LABELS: Record<string, string> = {
    exam_generation: t('examGeneration'),
    lesson_generation: t('lessonGeneration'),
    lesson_images: t('lessonImages'),
    lesson_audio: t('lessonAudio'),
    [LEARNER_CHAT_ACTION]: t('learnerAiChat'),
    teacher_chat: t('teacherAiChat'),
    purchase: t('tokenPurchase'),
    admin_grant: t('adminGrant'),
    refund: t('refund'),
  }

  function formatActionType(actionType: string): string {
    return ACTION_LABELS[actionType] ?? actionType.replace(/_/g, ' ')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Coins className="h-7 w-7 text-amber-500" />
          {t('title')}
        </h1>
        <p className="mt-1 text-gray-500">
          {t('subtitle')}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{t('currentBalance')}</p>
              <p className="text-2xl font-bold text-gray-900">{balance.toLocaleString()} {t('tokens')}</p>
            </div>
          </div>
          <Link
            href={`${marketingUrl}/pricing`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            {t('buyMore')}
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3 sm:px-6">
          <h2 className="text-lg font-semibold text-gray-900">{t('recentUsage')}</h2>
          <p className="mt-0.5 text-sm text-gray-500">{t('recentUsageSubtitle')}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                  {t('action')}
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                  {t('tokensColumn')}
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                  {t('date')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500 sm:px-6">
                    {t('emptyState')}
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 sm:px-6">
                      {formatActionType(tx.action_type)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium sm:px-6">
                      <span className={tx.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 sm:px-6">
                      {formatDate(tx.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
