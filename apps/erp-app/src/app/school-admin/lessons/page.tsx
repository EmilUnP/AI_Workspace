import { createClient } from '@eduator/auth/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Image from 'next/image'
import { 
  GraduationCap, 
  Clock, 
  CheckCircle, 
  Calendar,
  Sparkles,
  Search,
  BookOpen,
  Target,
  ArrowLeft,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import {
  getTeacherLessons,
  getTeacherLessonStats,
  TEACHER_LESSONS_PER_PAGE,
} from '@eduator/core/utils/teacher-lessons'
import { getTeacherClasses } from '@eduator/core/utils/teacher-classes'
import { LessonRowActions, PaginationFooter } from '@eduator/ui'
import { deleteLesson } from './actions'

const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  en: 'gb', tr: 'tr', de: 'de', fr: 'fr', es: 'es', it: 'it', pt: 'pt', ru: 'ru',
  ar: 'sa', zh: 'cn', ja: 'jp', ko: 'kr', nl: 'nl', pl: 'pl', uk: 'ua', az: 'az',
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', tr: 'Turkish', de: 'German', fr: 'French', es: 'Spanish',
  it: 'Italian', pt: 'Portuguese', ru: 'Russian', ar: 'Arabic', zh: 'Chinese',
  ja: 'Japanese', ko: 'Korean', nl: 'Dutch', pl: 'Polish', uk: 'Ukrainian', az: 'Azerbaijani',
}

function getLanguageDisplay(lang: string): { countryCode: string; label: string } {
  const countryCode = (LANGUAGE_TO_COUNTRY[lang.toLowerCase()] ?? 'un').toLowerCase()
  const label = LANGUAGE_NAMES[lang.toLowerCase()] ?? lang
  return { countryCode, label }
}

async function getTeacherInfo() {
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

export default async function TeacherLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string; classId?: string }>
}) {
  const teacherData = await getTeacherInfo()
  if (!teacherData) redirect('/auth/login')

  const { teacherId, organizationId } = teacherData
  const params = await searchParams
  const t = await getTranslations('teacherLessons')
  const supabase = await createClient()

  const [lessonsResult, stats, teacherClasses] = await Promise.all([
    getTeacherLessons(supabase, teacherId, organizationId, params),
    getTeacherLessonStats(supabase, teacherId, organizationId),
    getTeacherClasses(supabase, teacherId),
  ])

  const { data: lessons, count: totalLessons, page: currentPage } = lessonsResult

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Breadcrumb / Back to Teaching Studio */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/school-admin"
          className="inline-flex items-center gap-2 text-xs font-medium text-blue-700 hover:text-blue-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t('breadcrumb')}</span>
        </Link>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('subtitle')}
          </p>
        </div>
        
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          {/* Mobile Stats */}
          <div className="flex items-center gap-4 sm:hidden">
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">{stats.published}</p>
              <p className="text-xs text-gray-500">{t('inClass')}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-yellow-600">{stats.draft}</p>
              <p className="text-xs text-gray-500">{t('unused')}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-purple-600">{stats.totalDuration}</p>
              <p className="text-xs text-gray-500">{t('minutes')}</p>
            </div>
          </div>
          
          {/* Desktop Stats */}
          <div className="hidden items-center gap-6 lg:flex">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.published}</p>
              <p className="text-xs text-gray-500">{t('inClass')}</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.draft}</p>
              <p className="text-xs text-gray-500">{t('unused')}</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.totalDuration}</p>
              <p className="text-xs text-gray-500">{t('totalMinutes')}</p>
            </div>
          </div>
          
          {/* Create Lesson Button */}
          <Link
            href="/school-admin/lessons/generate"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">{t('generateLesson')}</span>
            <span className="sm:hidden">{t('create')}</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form className="relative flex-1 sm:max-w-sm">
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
          {teacherClasses.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 whitespace-nowrap">{t('classFilter')}</span>
              <div className="flex flex-wrap gap-1">
                <Link
                  href={params.status ? `/school-admin/lessons?status=${params.status}` : '/school-admin/lessons'}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${!params.classId ? 'bg-slate-100 text-slate-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {t('allClasses')}
                </Link>
                {teacherClasses.map((c) => (
                  <Link
                    key={c.id}
                    href={`/school-admin/lessons?classId=${c.id}${params.status ? `&status=${params.status}` : ''}`}
                    className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${params.classId === c.id ? 'bg-slate-100 text-slate-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <Link
              href={params.classId ? `/school-admin/lessons?classId=${params.classId}` : '/school-admin/lessons'}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                !params.status ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t('all')} ({stats.total})
            </Link>
            <Link
              href={params.classId ? `/school-admin/lessons?status=published&classId=${params.classId}` : '/school-admin/lessons?status=published'}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                params.status === 'published' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t('inClass')} ({stats.published})
            </Link>
            <Link
              href={params.classId ? `/school-admin/lessons?status=draft&classId=${params.classId}` : '/school-admin/lessons?status=draft'}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                params.status === 'draft' ? 'bg-yellow-100 text-yellow-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t('unused')} ({stats.draft})
            </Link>
          </div>
        </div>
      </div>

      {/* Lessons List */}
      <div className="rounded-lg border border-gray-200 bg-white">
        {lessons.length === 0 ? (
          <div className="p-8 text-center sm:p-12">
            <GraduationCap className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">{t('noLessonsFound')}</h3>
            <p className="mt-2 text-sm text-gray-500">
              {params.search || params.status
                ? t('adjustFilters')
                : t('createFirstLesson')}
            </p>
            <div className="mt-6">
              <Link
                href="/school-admin/lessons/generate"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                <Sparkles className="h-4 w-4" />
                {t('createFirstLessonButton')}
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="divide-y divide-gray-100 sm:hidden">
              {lessons.map((lesson) => (
                <div key={lesson.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Link 
                        href={`/school-admin/lessons/${lesson.id}`}
                        className="flex items-center gap-3 min-w-0 flex-1"
                      >
                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${lesson.is_published ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate">{lesson.title}</p>
                        {lesson.className && (
                          <p className="text-sm text-gray-500 truncate">{lesson.className}</p>
                        )}
                        </div>
                      </Link>
                    {lesson.languages.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {lesson.languages.slice(0, 3).map((lang: string) => {
                          const { countryCode, label } = getLanguageDisplay(lang)
                          return (
                            <Image
                              key={lang}
                              src={`https://flagcdn.com/w40/${countryCode}.png`}
                              alt={label}
                              title={label}
                              width={18}
                              height={14}
                              className="rounded-sm object-cover"
                              unoptimized
                            />
                          )
                        })}
                        {lesson.languages.length > 3 && (
                          <span className="text-xs text-gray-400">+{lesson.languages.length - 3}</span>
                        )}
                      </div>
                    )}
                    </div>
<LessonRowActions
                      lessonId={lesson.id}
                      isPublished={lesson.is_published}
                      onDeleteLesson={deleteLesson}
                      labels={{
                        viewLessonTitle: t('viewLessonTitle'),
                        deleteLessonTitle: t('deleteLessonTitle'),
                        deleteConfirmTitle: t('deleteConfirmTitle'),
                        deleteConfirmMessage: t('deleteConfirmMessage'),
                        cancel: t('cancel'),
                        deleting: t('deleting'),
                      }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-gray-500 font-medium">{t('usedIn')}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {lesson.usedInClass && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700 border border-blue-200" title={t('sharedInClass')}>
                          <Users className="h-3 w-3" />
                          {lesson.className || t('classBadge')}
                        </span>
                      )}
                      {lesson.usedInCalendar && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700 border border-amber-200" title={t('scheduledInCalendar')}>
                          <Calendar className="h-3 w-3" />
                          {t('calendarBadge')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <Clock className="h-3.5 w-3.5" />
                        {lesson.duration_minutes || 45} {t('minutesAbbr')}
                      </span>
                      {lesson.objectivesCount > 0 && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="inline-flex items-center gap-1 text-gray-500">
                            <Target className="h-3.5 w-3.5" />
                            {lesson.objectivesCount} {t('objectivesText')}
                          </span>
                        </>
                      )}
                    </div>
                    {lesson.is_published ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                        <CheckCircle className="h-3 w-3" />
                        {t('inClass')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700">
                        <Clock className="h-3 w-3" />
                        {t('unused')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <table className="hidden min-w-full divide-y divide-gray-200 sm:table">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:pl-6">
                    {t('lesson')}
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t('usedIn')}
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t('languages')}
                  </th>
                  <th scope="col" className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 lg:table-cell">
                    {t('duration')}
                  </th>
                  <th scope="col" className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 md:table-cell">
                    {t('objectives')}
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t('status')}
                  </th>
                  <th scope="col" className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 lg:table-cell">
                    {t('created')}
                  </th>
                  <th scope="col" className="py-3 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 sm:pr-6">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {lessons.map((lesson) => (
                  <tr key={lesson.id} className="hover:bg-gray-50 transition-colors">
                    {/* Lesson */}
                    <td className="py-4 pl-4 pr-3 sm:pl-6">
                      <div className="flex items-center gap-3">
                        <Link 
                          href={`/school-admin/lessons/${lesson.id}`}
                          className="flex items-center gap-3 hover:opacity-80 flex-1 min-w-0"
                        >
                          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${lesson.is_published ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                            <BookOpen className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900">{lesson.title}</p>
                          </div>
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {lesson.usedInClass && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200" title={t('sharedInClass')}>
                            <Users className="h-3 w-3" />
                            {lesson.className || t('classBadge')}
                          </span>
                        )}
                        {lesson.usedInCalendar && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200" title={t('scheduledInCalendar')}>
                            <Calendar className="h-3 w-3" />
                            {t('calendarBadge')}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Languages */}
                    <td className="whitespace-nowrap px-3 py-4">
                      <div className="flex items-center gap-1">
                        {lesson.languages.length > 0 ? (
                          <>
                            {lesson.languages.slice(0, 4).map((lang: string) => {
                              const { countryCode, label } = getLanguageDisplay(lang)
                              return (
                                <span key={lang} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 overflow-hidden" title={label}>
                                  <Image
                                    src={`https://flagcdn.com/w40/${countryCode}.png`}
                                    alt={label}
                                    width={28}
                                    height={21}
                                    className="rounded-full object-cover"
                                    unoptimized
                                  />
                                </span>
                              )
                            })}
                            {lesson.languages.length > 4 && (
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">+{lesson.languages.length - 4}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="hidden whitespace-nowrap px-3 py-4 lg:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        {lesson.duration_minutes || 45} {t('minutesAbbr')}
                      </div>
                    </td>

                    {/* Objectives */}
                    <td className="hidden whitespace-nowrap px-3 py-4 md:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Target className="h-4 w-4" />
                        {lesson.objectivesCount}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="whitespace-nowrap px-3 py-4">
                      {lesson.is_published ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                          <CheckCircle className="h-3 w-3" />
                          {t('inClass')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700">
                          <Clock className="h-3 w-3" />
                          {t('unused')}
                        </span>
                      )}
                    </td>

                    {/* Created */}
                    <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(lesson.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="whitespace-nowrap py-4 pl-3 pr-4 sm:pr-6">
                      <div className="flex items-center justify-end">
<LessonRowActions
                      lessonId={lesson.id}
                      isPublished={lesson.is_published}
                      onDeleteLesson={deleteLesson}
                      labels={{
                        viewLessonTitle: t('viewLessonTitle'),
                        deleteLessonTitle: t('deleteLessonTitle'),
                        deleteConfirmTitle: t('deleteConfirmTitle'),
                        deleteConfirmMessage: t('deleteConfirmMessage'),
                        cancel: t('cancel'),
                        deleting: t('deleting'),
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

      {/* Footer with Pagination */}
      {lessons.length > 0 && (
        <div className="space-y-4">
          <PaginationFooter
            currentPage={currentPage}
            perPage={TEACHER_LESSONS_PER_PAGE}
            totalItems={totalLessons}
            baseUrl="/school-admin/lessons"
            searchParams={{
              search: params.search,
              status: params.status,
              classId: params.classId,
            }}
          />
          {(params.search || params.status) && (
            <div className="text-center">
              <Link
                href="/school-admin/lessons"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {t('clearAllFilters')}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

