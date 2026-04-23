import { createClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import {
  ArrowLeft,
  Calendar,
  Plus,
  BookOpen,
  Share2,
  Search,
  CalendarRange,
  Sparkles,
} from 'lucide-react'
import { EducationPlanRowActions } from '@eduator/ui'
import { deleteEducationPlan } from './actions'

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

async function getTeacherData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single()
  if (!profile?.organization_id) return null
  return { teacherId: profile.id, organizationId: profile.organization_id }
}

async function getPlanStats(teacherId: string, organizationId: string) {
  const supabase = await createClient()
  try {
    const { count: total } = await supabase
      .from('education_plans')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', teacherId)
      .eq('organization_id', organizationId)
    const { count: shared } = await supabase
      .from('education_plans')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', teacherId)
      .eq('organization_id', organizationId)
      .eq('is_shared_with_students', true)
    return { total: total ?? 0, shared: shared ?? 0 }
  } catch {
    return { total: 0, shared: 0 }
  }
}

async function getPlans(
  teacherId: string,
  organizationId: string,
  params: { search?: string; classId?: string; shared?: string }
): Promise<PlanRow[]> {
  const supabase = await createClient()
  try {
    const { data: plans, error } = await supabase
      .from('education_plans')
      .select('id, name, description, class_id, period_months, sessions_per_week, hours_per_session, is_shared_with_students, created_at')
      .eq('teacher_id', teacherId)
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
    if (error) {
      console.warn('Education plans fetch failed (table may not exist):', error.message)
      return []
    }
    const list = (plans || []) as PlanRow[]
    let filtered = list
    if (params.classId) {
      filtered = filtered.filter((p) => p.class_id === params.classId)
    }
    if (params.shared === 'shared') {
      filtered = filtered.filter((p) => p.is_shared_with_students)
    } else if (params.shared === 'not_shared') {
      filtered = filtered.filter((p) => !p.is_shared_with_students)
    }
    if (params.search?.trim()) {
      const q = params.search.trim().toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q)
      )
    }
    return filtered
  } catch {
    return []
  }
}

async function getClasses(teacherId: string, organizationId: string) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: primary } = await supabase
    .from('classes')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('teacher_id', teacherId)
    .eq('is_active', true)
  const { data: ct } = await admin.from('class_teachers').select('class_id').eq('teacher_id', teacherId)
  const assignedIds = ct?.map((x) => x.class_id) || []
  let extra: Array<{ id: string; name: string }> = []
  if (assignedIds.length > 0) {
    const { data: add } = await supabase
      .from('classes')
      .select('id, name')
      .eq('organization_id', organizationId)
      .in('id', assignedIds)
    extra = (add || []).filter((c) => !primary?.some((p) => p.id === c.id)) as Array<{ id: string; name: string }>
  }
  const all = [...(primary || []), ...extra]
  return Array.from(new Map(all.map((c) => [c.id, c])).values())
}

export default async function TeacherEducationPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; classId?: string; shared?: string }>
}) {
  const teacherData = await getTeacherData()
  if (!teacherData) redirect('/auth/login')
  const { teacherId, organizationId } = teacherData
  const params = await searchParams

  const [plans, stats, classes, t] = await Promise.all([
    getPlans(teacherId, organizationId, params),
    getPlanStats(teacherId, organizationId),
    getClasses(teacherId, organizationId),
    getTranslations('teacherEducationPlans'),
  ])
  const classesMap = Object.fromEntries(classes.map((c) => [c.id, c.name]))
  const hasFilters = !!(params.search || params.classId || params.shared)

  return (
    <div className="space-y-4 sm:space-y-6">
      <Link
        href="/school-admin"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('breadcrumb')}
      </Link>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
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
            <div className="hidden items-center gap-6 lg:flex">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                <p className="text-xs text-gray-500">{t('total')}</p>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.shared}</p>
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
        <form className="relative flex-1 sm:max-w-sm" method="get" action="/school-admin/education-plans">
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
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <Link
              href={params.classId ? `/school-admin/education-plans?classId=${params.classId}` : '/school-admin/education-plans'}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                !params.shared ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t('all')} ({stats.total})
            </Link>
            <Link
              href={params.classId ? `/school-admin/education-plans?shared=shared&classId=${params.classId}` : '/school-admin/education-plans?shared=shared'}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                params.shared === 'shared' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t('shared')} ({stats.shared})
            </Link>
            <Link
              href={params.classId ? `/school-admin/education-plans?shared=not_shared&classId=${params.classId}` : '/school-admin/education-plans?shared=not_shared'}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                params.shared === 'not_shared' ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t('notShared')}
            </Link>
          </div>
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
                    <EducationPlanRowActions
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
                      <EducationPlanRowActions
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

