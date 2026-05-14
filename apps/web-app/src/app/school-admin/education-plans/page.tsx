import { getAccessToken, getCurrentUser } from '@/lib/backend-auth'
import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getLocale } from 'next-intl/server'
import {
  BookOpen,
  Search,
  CalendarRange,
  Sparkles,
} from 'lucide-react'
import { EducationPlanRowActions } from '@eduator/ui'
import { deleteEducationPlan } from './actions'

const EducationPlanRowActionsAny = EducationPlanRowActions as any

type PlanRow = {
  id: string
  name: string
  description: string | null
  period_months: number
  sessions_per_week: number
  hours_per_session: number
  created_at: string
}

function computePlanStats(plans: PlanRow[]): { total: number } {
  return { total: plans.length }
}

async function getAdminData() {
  const user = await getCurrentUser()
  if (!user) return null
  if (user.role !== 'operator' && user.role !== 'admin') return null
  return { adminId: user.id, workspaceId: 'global' }
}

async function getPlans(
  adminId: string,
  workspaceId: string,
  params: { search?: string }
): Promise<PlanRow[]> {
  void adminId
  void workspaceId
  try {
    const token = await getAccessToken()
    if (!token) return []
    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'
    const qs = new URLSearchParams()
    if (params.search) qs.set('search', params.search)
    const response = await fetch(`${backendBase}/v1/education-plans?${qs.toString()}`, {
      headers: webAppBackendAuthHeaders(token),
      cache: 'no-store',
    })
    if (!response.ok) return []
    const payload = (await response.json()) as { items?: PlanRow[] }
    return payload.items || []
  } catch {
    return []
  }
}

export default async function SchoolAdminEducationPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const adminData = await getAdminData()
  if (!adminData) redirect('/auth/login')
  const { adminId, workspaceId } = adminData
  const params = await searchParams

  const [plansFiltered, plansAll, t, locale] = await Promise.all([
    getPlans(adminId, workspaceId, params),
    params.search ? getPlans(adminId, workspaceId, {}) : Promise.resolve([] as PlanRow[]),
    getTranslations('teacherEducationPlans'),
    getLocale(),
  ])
  const hasFilters = !!params.search
  const statsSource = hasFilters && plansAll.length > 0 ? plansAll : plansFiltered
  const stats = computePlanStats(statsSource)
  const plans = plansFiltered

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">{t('title')}</h1>
        </div>
        <form className="relative flex-1 sm:max-w-md" method="get" action="/school-admin/education-plans">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="search"
            defaultValue={params.search}
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </form>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <div className="flex gap-4 sm:hidden">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">{t('total')}</p>
            </div>
          </div>
          <Link
            href="/school-admin/education-plans/create"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">{t('createPlan')}</span>
            <span className="sm:hidden">{t('create')}</span>
          </Link>
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 sm:p-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <CalendarRange className="h-7 w-7" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-gray-900">{t('noPlansFound')}</h3>
            <p className="mt-2 max-w-sm text-center text-sm text-gray-500">
              {hasFilters ? t('adjustFilters') : t('createFirstPlan')}
            </p>
            <Link
              href="/school-admin/education-plans/create"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              <Sparkles className="h-4 w-4" />
              {t('createFirstPlanButton')}
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="divide-y divide-gray-100 sm:hidden">
              {plans.map((plan) => (
                <div key={plan.id} className="p-4 transition-colors hover:bg-gray-50/50">
                  <Link href={`/school-admin/education-plans/${plan.id}`} className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 truncate">{plan.name}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {plan.period_months} {t('months')} · {plan.sessions_per_week}{t('timesPerWeek')}, {plan.hours_per_session}{t('hours')}
                      </p>
                      {plan.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{plan.description}</p>
                      )}
                    </div>
                  </Link>
                  <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                    <span>
                      {new Date(plan.created_at).toLocaleDateString(locale === 'az' ? 'az-AZ' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <EducationPlanRowActionsAny
                      planId={plan.id}
                      viewHref={`/school-admin/education-plans/${plan.id}`}
                      deleteAction={deleteEducationPlan}
                      labels={{
                        viewPlan: t('viewPlan'),
                        deletePlanTitle: t('deletePlanTitle'),
                        deletePlanConfirm: t('deletePlanConfirm'),
                        cancel: t('cancel'),
                        deleting: t('deleting'),
                        deletePlanBtn: t('deletePlanBtn'),
                        close: t('close'),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <table className="hidden min-w-full divide-y divide-gray-100 sm:table">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="py-3.5 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:pl-6">{t('plan')}</th>
                  <th className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{t('schedule')}</th>
                  <th className="hidden px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 lg:table-cell">{t('created')}</th>
                  <th className="py-3.5 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 sm:pr-6">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {plans.map((plan) => (
                  <tr key={plan.id} className="transition-colors hover:bg-gray-50/70">
                    <td className="py-4 pl-4 pr-3 sm:pl-6">
                      <Link href={`/school-admin/education-plans/${plan.id}`} className="flex items-center gap-3 group">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 group-hover:text-gray-700 truncate">{plan.name}</p>
                          {plan.description && (
                            <p className="text-sm text-gray-500 truncate max-w-xs">{plan.description}</p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600">
                      {plan.period_months} {t('months')} · {plan.sessions_per_week}{t('timesPerWeek')}, {plan.hours_per_session}{t('hours')}
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 lg:table-cell">
                      {new Date(plan.created_at).toLocaleDateString(locale === 'az' ? 'az-AZ' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="whitespace-nowrap py-4 pl-3 pr-4 sm:pr-6">
                      <div className="flex items-center justify-end gap-2">
                      <EducationPlanRowActionsAny
                        planId={plan.id}
                        viewHref={`/school-admin/education-plans/${plan.id}`}
                        deleteAction={deleteEducationPlan}
                        labels={{
                          viewPlan: t('viewPlan'),
                          deletePlanTitle: t('deletePlanTitle'),
                          deletePlanConfirm: t('deletePlanConfirm'),
                          cancel: t('cancel'),
                          deleting: t('deleting'),
                          deletePlanBtn: t('deletePlanBtn'),
                          close: t('close'),
                        }}
                      />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {hasFilters && (
        <div className="text-center">
          <Link
            href="/school-admin/education-plans"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {t('clearAllFilters')}
          </Link>
        </div>
      )}
    </div>
  )
}

