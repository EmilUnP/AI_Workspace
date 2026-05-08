import { redirect } from 'next/navigation'
import { Coins } from 'lucide-react'
import { tokenRepository } from '@eduator/db/repositories/tokens'
import { TOKEN_ACTION_TYPES } from '@eduator/core/types/token'
import { getTranslations } from 'next-intl/server'
import { getCurrentUser } from '@/lib/backend-auth'

export const dynamic = 'force-dynamic'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

export default async function TeacherTokensPage() {
  const t = await getTranslations('teacherTokens')

  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  if (user.role !== 'operator' && user.role !== 'admin') redirect('/app')

  const [balance, transactions] = await Promise.all([
    tokenRepository.getBalance(user.id),
    tokenRepository.getTransactions(user.id, 30),
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
          <Coins className="h-7 w-7 text-gray-700" />
          {t('title')}
        </h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{t('currentBalance')}</p>
              <p className="text-2xl font-bold text-gray-900">{balance.toLocaleString()} {t('tokens')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3 sm:px-6">
          <h2 className="text-lg font-semibold text-gray-900">{t('recentUsage')}</h2>
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
                      <span className={tx.amount < 0 ? 'text-gray-800' : 'text-gray-700'}>
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
