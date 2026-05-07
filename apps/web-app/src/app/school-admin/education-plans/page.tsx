import { getAccessToken, getCurrentUser } from '@/lib/backend-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import {
  BookOpen,
  Share2,
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
  class_id: string
  period_months: number
  sessions_per_week: number
  hours_per_session: number
  is_shared_with_students: boolean
  created_at: string
}

async function getAdminData() {
  const user = await getCurrentUser()
  if (!user) return null
  if (user.role !== 'operator' && user.role !== 'admin') return null
  return { adminId: user.id, workspaceId: 'global' }
}

async function getPlanStats(adminId: string, workspaceId: string) {
  void adminId
  void workspaceId
  try {
    const token = await getAccessToken()
    if (!token) return { total: 0, shared: 0 }
    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'
    const response = await fetch(`${backendBase}/v1/education-plans/stats`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!response.ok) return { total: 0, shared: 0 }
    const payload = (await response.json()) as { total?: number; shared?: number }
    return { total: Number(payload.total || 0), shared: Number(payload.shared || 0) }
  } catch {
    return { total: 0, shared: 0 }
  }
}

async function getPlans(
  adminId: string,
  workspaceId: string,
  params: { search?: string; classId?: string; shared?: string }
): Promise<PlanRow[]> {
  void adminId
  void workspaceId
  try {
    const token = await getAccessToken()
    if (!token) return []
    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'
    const qs = new URLSearchParams()
    if (params.search) qs.set('search', params.search)
    if (params.classId) qs.set('classId', params.classId)
    if (params.shared) qs.set('shared', params.shared)
    const response = await fetch(`${backendBase}/v1/education-plans?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!response.ok) return []
    const payload = (await response.json()) as { items?: PlanRow[] }
    return payload.items || []
  } catch {
    return []
  }
}

async function getClasses(adminId: string, workspaceId: string) {
  void adminId
  void workspaceId
  return [] as Array<{ id: string; name: string }>
}

export default async function SchoolAdminEducationPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; classId?: string; shared?: string }>
}) {
  const adminData = await getAdminData()
  if (!adminData) redirect('/auth/login')
  const { adminId, workspaceId } = adminData
  const params = await searchParams

  const [plans, stats, classes, t] = await Promise.all([
    getPlans(adminId, workspaceId, params),
    getPlanStats(adminId, workspaceId),
    getClasses(adminId, workspaceId),
    getTranslations('teacherEducationPlans'),
  ])
  const classesMap = Object.fromEntries(classes.map((c) => [c.id, c.name]))
  const hasFilters = !!(params.search || params.classId || params.shared)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{t('title')}</h1>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          <form className="relative w-full sm:w-72" method="get" action="/school-admin/education-plans">
            <input type="hidden" name="classId" value={params.classId ?? ''} />
            <input type="hidden" name="shared" value={params.shared ?? ''} />
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="search"
              defaultValue={params.search}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-4 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </form>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex gap-4 sm:hidden">
              <div className="text-center">
                <p className="text-lg font-bold text-blue-600">{stats.total}</p>
                <p className="text-xs text-gray-500">{t('total')}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">{stats.shared}</p>
                <p className="text-xs text-gray-500">{t('shared')}</p>
              </div>
            </div>
          </div>
          <Link
            href="/school-admin/education-plans/create"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">{t('createPlan')}</span>
            <span className="sm:hidden">{t('create')}</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {classes.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-xs font-medium text-gray-500">{t('classFilter')}</span>
              <div className="flex flex-wrap gap-1">
                <Link
                  href={params.shared ? `/school-admin/education-plans?shared=${params.shared}` : '/school-admin/education-plans'}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    !params.classId ? 'bg-slate-100 text-slate-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {t('allClasses')}
                </Link>
                {classes.map((c) => (
                  <Link
                    key={c.id}
                    href={`/school-admin/education-plans?classId=${c.id}${params.shared ? `&shared=${params.shared}` : ''}${params.search ? `&search=${encodeURIComponent(params.search)}` : ''}`}
                    className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      params.classId === c.id ? 'bg-slate-100 text-slate-700' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div className="rounded-lg border border-gray-200 bg-white">
        {plans.length === 0 ? (
          <div className="p-8 text-center sm:p-12">
            <CalendarRange className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">{t('noPlansFound')}</h3>
            <p className="mt-2 text-sm text-gray-500">
              {hasFilters ? t('adjustFilters') : t('createFirstPlan')}
            </p>
            <div className="mt-6">
              <Link
                href="/school-admin/education-plans/create"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                <Sparkles className="h-4 w-4" />
                {t('createFirstPlanButton')}
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="divide-y divide-gray-100 sm:hidden">
              {plans.map((plan) => (
                <div key={plan.id} className="p-4">
                  <Link href={`/school-admin/education-plans/${plan.id}`} className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 truncate">{plan.name}</p>
                        {plan.is_shared_with_students && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            <Share2 className="h-3 w-3" />
                            {t('shared')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {classesMap[plan.class_id] || '—'} · {plan.period_months} {t('months')} · {plan.sessions_per_week}{t('timesPerWeek')}, {plan.hours_per_session}{t('hours')}
                      </p>
                      {plan.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{plan.description}</p>
                      )}
                    </div>
                  </Link>
                  <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                    <span>
                      {new Date(plan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <EducationPlanRowActionsAny
                      planId={plan.id}
                      viewHref={`/school-admin/education-plans/${plan.id}`}
                      editHref={`/school-admin/education-plans/${plan.id}/edit`}
                      deleteAction={deleteEducationPlan}
                      labels={{
                        viewPlan: t('viewPlan'),
                        editPlan: t('editPlan'),
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
            <table className="hidden min-w-full divide-y divide-gray-200 sm:table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:pl-6">{t('plan')}</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{t('class')}</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{t('schedule')}</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{t('status')}</th>
                  <th className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 lg:table-cell">{t('created')}</th>
                  <th className="py-3 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 sm:pr-6">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 pl-4 pr-3 sm:pl-6">
                      <Link href={`/school-admin/education-plans/${plan.id}`} className="flex items-center gap-3 group">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 group-hover:text-blue-600 truncate">{plan.name}</p>
                          {plan.description && (
                            <p className="text-sm text-gray-500 truncate max-w-xs">{plan.description}</p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600">
                      {classesMap[plan.class_id] || '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600">
                      {plan.period_months} {t('months')} · {plan.sessions_per_week}{t('timesPerWeek')}, {plan.hours_per_session}{t('hours')}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      {plan.is_shared_with_students ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                          <Share2 className="h-3 w-3" />
                          {t('shared')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                          {t('notShared')}
                        </span>
                      )}
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 lg:table-cell">
                      {new Date(plan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="whitespace-nowrap py-4 pl-3 pr-4 sm:pr-6 text-right">
                      <EducationPlanRowActionsAny
                        planId={plan.id}
                        viewHref={`/school-admin/education-plans/${plan.id}`}
                        editHref={`/school-admin/education-plans/${plan.id}/edit`}
                        deleteAction={deleteEducationPlan}
                        labels={{
                          viewPlan: t('viewPlan'),
                          editPlan: t('editPlan'),
                          deletePlanTitle: t('deletePlanTitle'),
                          deletePlanConfirm: t('deletePlanConfirm'),
                          cancel: t('cancel'),
                          deleting: t('deleting'),
                          deletePlanBtn: t('deletePlanBtn'),
                          close: t('close'),
                        }}
                      />
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
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {t('clearAllFilters')}
          </Link>
        </div>
      )}
    </div>
  )
}

