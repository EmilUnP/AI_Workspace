import { createClient } from '@eduator/auth/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Calendar as CalendarIcon, FileText, BookOpen, Clock, CheckCircle } from 'lucide-react'
import { getStudentCalendar, type StudentCalendarItem, type StudentCalendarExam } from '@eduator/core/utils/student-calendar'

async function getStudentId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single()
  return profile ? { studentId: profile.id, organizationId: profile.organization_id } : null
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default async function StudentCalendarPage() {
  const data = await getStudentId()
  if (!data) redirect('/auth/login')

  const supabase = await createClient()
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - 7)
  const toDate = new Date()
  toDate.setDate(toDate.getDate() + 60)

  const items = await getStudentCalendar(supabase, data.studentId, data.organizationId ?? null, {
    fromDate: fromDate.toISOString(),
    toDate: toDate.toISOString(),
    includePast: true,
    limit: 80,
  })

  const upcoming = items.filter((i) => i.is_upcoming || i.is_available_now)
  const past = items.filter((i) => !i.is_upcoming && !i.is_available_now)
  const t = await getTranslations('studentCalendar')
  const labels = {
    availableNow: t('availableNow'),
    upcoming: t('upcoming'),
    past: t('past'),
    min: t('min'),
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-700 to-purple-800 p-4 sm:p-6 lg:p-8 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-12 sm:-top-24 -right-12 sm:-right-24 h-48 w-48 sm:h-96 sm:w-96 rounded-full bg-white/20" />
          <div className="absolute -bottom-6 sm:-bottom-12 -left-6 sm:-left-12 h-32 w-32 sm:h-64 sm:w-64 rounded-full bg-white/20" />
        </div>
        <div className="relative flex flex-col gap-4 sm:gap-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm flex-shrink-0">
              <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold truncate">{t('title')}</h1>
          </div>
          <p className="text-sm sm:text-base text-indigo-100 max-w-lg">
            {t('subtitle')}
          </p>
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-sm px-4 sm:px-6 py-3 sm:py-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold">{upcoming.length}</p>
              <p className="text-xs sm:text-sm text-indigo-200">{t('upcomingNow')}</p>
            </div>
            <div className="rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-sm px-4 sm:px-6 py-3 sm:py-4 text-center">
              <p className="text-2xl sm:text-3xl font-bold">{past.length}</p>
              <p className="text-xs sm:text-sm text-indigo-200">{t('past')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 sm:p-5 text-sm text-blue-800">
        <p className="font-medium">{t('libraryVsCalendarTitle')}</p>
        <p className="mt-1 text-blue-700">
          {t('libraryVsCalendarBody')}
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('sectionUpcoming')}</h2>
        {upcoming.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 sm:p-12 text-center">
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
              <CalendarIcon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
            </div>
            <p className="text-lg font-semibold text-gray-900">{t('noUpcoming')}</p>
            <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
              {t('noUpcomingHintPrefix')}
              <Link href="/student/exams" className="text-indigo-600 font-medium hover:underline">{t('examsLink')}</Link>
              {' '}and{' '}
              <Link href="/student/lessons" className="text-indigo-600 font-medium hover:underline">{t('lessonsLink')}</Link>
              {t('noUpcomingHintSuffix')}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((item) => (
              <CalendarItemRow key={`${item.type}-${item.id}`} item={item} labels={labels} />
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('sectionPast')}</h2>
          <ul className="space-y-2">
            {past.map((item) => (
              <CalendarItemRow key={`${item.type}-${item.id}`} item={item} past labels={labels} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

type CalendarRowLabels = {
  availableNow: string
  upcoming: string
  past: string
  min: string
}

function CalendarItemRow({
  item,
  past = false,
  labels,
}: {
  item: StudentCalendarItem
  past?: boolean
  labels: CalendarRowLabels
}) {
  const href =
    item.type === 'exam'
      ? `/student/exams/${item.id}${(item as StudentCalendarExam).final_exam_id ? `?finalExamId=${(item as StudentCalendarExam).final_exam_id}` : ''}`
      : `/student/lessons/${item.id}`
  const Icon = item.type === 'exam' ? FileText : BookOpen

  return (
    <li>
      <Link
        href={item.is_available_now || past ? href : '#'}
        className={`flex items-center gap-4 rounded-xl border p-4 sm:p-5 transition-all ${
          item.is_available_now ? 'border-green-200 bg-green-50/50 hover:bg-green-50 hover:shadow-sm' : past ? 'border-gray-200 bg-white hover:bg-gray-50 hover:shadow-sm' : 'border-amber-200 bg-amber-50/50 hover:bg-amber-50'
        } ${!item.is_available_now && !past ? 'cursor-not-allowed opacity-90' : ''}`}
      >
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
          item.is_available_now ? 'bg-green-100 text-green-600' : past ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-600'
        }`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">{item.title}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {item.class_name} · {formatDateTime(item.start_time)} – {formatTime(item.end_time)}
            {item.duration_minutes != null && ` · ${item.duration_minutes} ${labels.min}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 flex-shrink-0">
          {item.is_available_now && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
              <CheckCircle className="h-3 w-3" /> {labels.availableNow}
            </span>
          )}
          {!item.is_available_now && !past && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
              <Clock className="h-3 w-3" /> {labels.upcoming}
            </span>
          )}
          {past && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{labels.past}</span>
          )}
        </div>
      </Link>
    </li>
  )
}
