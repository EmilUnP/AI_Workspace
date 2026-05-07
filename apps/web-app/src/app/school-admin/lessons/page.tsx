import { createClient } from '@eduator/auth/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getCurrentUser } from '@/lib/backend-auth'
import Image from 'next/image'
import { 
  GraduationCap, 
  Clock, 
  Calendar,
  Sparkles,
  Search,
  BookOpen,
  Target,
} from 'lucide-react'
import Link from 'next/link'
import {
  getTeacherLessons,
  TEACHER_LESSONS_PER_PAGE,
} from '@eduator/core/utils/teacher-lessons'
import { PaginationFooter } from '@eduator/ui'
import { LessonRowActions } from './lesson-row-actions'

const PaginationFooterAny = PaginationFooter as any

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

async function getAdminInfo() {
  const user = await getCurrentUser()
  if (!user) return null
  if (user.role !== 'operator' && user.role !== 'admin') return null
  return { adminId: user.id, workspaceId: 'global' }
}

export default async function SchoolAdminLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>
}) {
  const adminData = await getAdminInfo()
  if (!adminData) redirect('/school-admin')

  const { adminId, workspaceId } = adminData
  const params = await searchParams
  const t = await getTranslations('teacherLessons')
  const supabase = await createClient()

  const lessonsResultRaw = await getTeacherLessons(supabase, adminId, workspaceId, params)

  const lessonsResult = lessonsResultRaw as any
  const lessons = (lessonsResult?.data || []) as any[]
  const totalLessons = Number(lessonsResult?.count || 0)
  const currentPage = Number(lessonsResult?.page || 1)

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">{t('title')}</h1>
        </div>
        <form className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="search"
            defaultValue={params.search}
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </form>
        
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          {/* Create Lesson Button */}
          <Link
            href="/school-admin/lessons/generate"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">{t('generateLesson')}</span>
            <span className="sm:hidden">{t('create')}</span>
          </Link>
        </div>
      </div>

      {/* Lessons List */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {lessons.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 sm:p-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <GraduationCap className="h-7 w-7" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-gray-900">{t('noLessonsFound')}</h3>
            <p className="mt-2 max-w-sm text-center text-sm text-gray-500">
              {params.search
                ? t('adjustFilters')
                : t('createFirstLesson')}
            </p>
            <Link
              href="/school-admin/lessons/generate"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <Sparkles className="h-4 w-4" />
              {t('createFirstLessonButton')}
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="divide-y divide-gray-100 sm:hidden">
              {lessons.map((lesson: any) => (
                <div key={lesson.id} className="p-4 transition-colors hover:bg-gray-50/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Link 
                        href={`/school-admin/lessons/${lesson.id}`}
                        className="flex items-center gap-3 min-w-0 flex-1"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-gray-900">{lesson.title}</p>
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
                  </div>
                  <div className="mt-3">
                    <LessonRowActions lessonId={String(lesson.id)} />
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <table className="hidden min-w-full divide-y divide-gray-100 sm:table">
              <thead className="bg-gray-50/80">
                <tr>
                  <th scope="col" className="py-3.5 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:pl-6">
                    {t('lesson')}
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {t('languages')}
                  </th>
                  <th scope="col" className="hidden px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 lg:table-cell">
                    {t('duration')}
                  </th>
                  <th scope="col" className="hidden px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 md:table-cell">
                    {t('objectives')}
                  </th>
                  <th scope="col" className="hidden px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 lg:table-cell">
                    {t('created')}
                  </th>
                  <th scope="col" className="py-3.5 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 sm:pr-6">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {lessons.map((lesson: any) => (
                  <tr key={lesson.id} className="transition-colors hover:bg-gray-50/70">
                    {/* Lesson */}
                    <td className="py-4 pl-4 pr-3 sm:pl-6">
                      <div className="flex items-center gap-3">
                        <Link 
                          href={`/school-admin/lessons/${lesson.id}`}
                          className="flex items-center gap-3 hover:opacity-80 flex-1 min-w-0"
                        >
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900">{lesson.title}</p>
                          </div>
                        </Link>
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
                      <div className="flex items-center justify-end gap-2">
                        <LessonRowActions lessonId={String(lesson.id)} />
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
          <PaginationFooterAny
            currentPage={currentPage}
            perPage={TEACHER_LESSONS_PER_PAGE}
            totalItems={totalLessons}
            baseUrl="/school-admin/lessons"
            searchParams={{
              search: params.search,
            }}
          />
          {params.search && (
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

