import { createClient } from '@eduator/auth/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Image from 'next/image'
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  Award,
  Calendar,
  Sparkles,
  Search,
  Users
} from 'lucide-react'
import Link from 'next/link'
import {
  getTeacherExams,
  getTeacherExamStats,
  TEACHER_EXAMS_PER_PAGE,
} from '@eduator/core/utils/teacher-exams'
import { ExamRowActions } from './exam-row-actions'
import { PaginationFooter } from '@eduator/ui'

const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  en: 'gb', tr: 'tr', de: 'de', fr: 'fr', es: 'es', it: 'it', pt: 'pt', ru: 'ru',
  ar: 'sa', zh: 'cn', ja: 'jp', ko: 'kr', nl: 'nl', pl: 'pl', uk: 'ua', az: 'az',
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', tr: 'Turkish', de: 'German', fr: 'French', es: 'Spanish',
  it: 'Italian', pt: 'Portuguese', ru: 'Russian', ar: 'Arabic', zh: 'Chinese',
  ja: 'Japanese', ko: 'Korean', nl: 'Dutch', pl: 'Polish', uk: 'Ukrainian', az: 'Azerbaijani',
}

async function getAdminInfo() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!profile?.id) return null
  return { adminId: profile.id, workspaceId: 'global' }
}

export default async function SchoolAdminExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string; classId?: string }>
}) {
  const adminData = await getAdminInfo()
  
  if (!adminData) {
    redirect('/auth/login')
  }
  
  const { adminId, workspaceId } = adminData
  const params = await searchParams
  const supabase = await createClient()

  const [examsResult, stats] = await Promise.all([
    getTeacherExams(supabase, adminId, workspaceId, params),
    getTeacherExamStats(supabase, adminId, workspaceId),
  ])

  const { data: exams, count: totalExams, page: currentPage } = examsResult
  const t = await getTranslations('teacherExams')

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">{t('title')}</h1>
          <p className="mt-1.5 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex items-center gap-3 sm:hidden">
            <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center ring-1 ring-emerald-100">
              <p className="text-lg font-semibold text-emerald-700">{stats.published}</p>
              <p className="text-xs text-emerald-600/80">{t('published')}</p>
            </div>
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-center ring-1 ring-amber-100">
              <p className="text-lg font-semibold text-amber-700">{stats.draft}</p>
              <p className="text-xs text-amber-600/80">{t('unused')}</p>
            </div>
            <div className="rounded-xl bg-violet-50 px-3 py-2 text-center ring-1 ring-violet-100">
              <p className="text-lg font-semibold text-violet-700">{stats.totalQuestions}</p>
              <p className="text-xs text-violet-600/80">{t('questions')}</p>
            </div>
          </div>
          <div className="hidden items-center gap-4 lg:flex">
            <div className="rounded-xl bg-emerald-50/80 px-4 py-2.5 text-center ring-1 ring-emerald-100">
              <p className="text-xl font-semibold text-emerald-700">{stats.published}</p>
              <p className="text-xs text-emerald-600/80">{t('published')}</p>
            </div>
            <div className="rounded-xl bg-amber-50/80 px-4 py-2.5 text-center ring-1 ring-amber-100">
              <p className="text-xl font-semibold text-amber-700">{stats.draft}</p>
              <p className="text-xs text-amber-600/80">{t('unused')}</p>
            </div>
            <div className="rounded-xl bg-violet-50/80 px-4 py-2.5 text-center ring-1 ring-violet-100">
              <p className="text-xl font-semibold text-violet-700">{stats.totalQuestions}</p>
              <p className="text-xs text-violet-600/80">{t('questions')}</p>
            </div>
          </div>
          <Link
            href="/school-admin/exams/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">{t('createExam')}</span>
            <span className="sm:hidden">{t('create')}</span>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="search"
            defaultValue={params.search}
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </form>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <Link
              href={params.classId ? `/school-admin/exams?classId=${params.classId}` : '/school-admin/exams'}
              className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${!params.status ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {`${t('all')} (${stats.total})`}
            </Link>
            <Link
              href={params.classId ? `/school-admin/exams?status=published&classId=${params.classId}` : '/school-admin/exams?status=published'}
              className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${params.status === 'published' ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {`${t('published')} (${stats.published})`}
            </Link>
            <Link
              href={params.classId ? `/school-admin/exams?status=draft&classId=${params.classId}` : '/school-admin/exams?status=draft'}
              className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${params.status === 'draft' ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {`${t('unused')} (${stats.draft})`}
            </Link>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 sm:p-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <FileText className="h-7 w-7" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-gray-900">{t('noExamsFound')}</h3>
            <p className="mt-2 max-w-sm text-center text-sm text-gray-500">
              {params.search || params.status ? t('adjustFilters') : t('createFirstExam')}
            </p>
            <Link
              href="/school-admin/exams/new"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <Sparkles className="h-4 w-4" />
              {t('createFirstExamButton')}
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="divide-y divide-gray-100 sm:hidden">
              {exams.map((exam) => (
                <div key={exam.id} className="p-4 transition-colors hover:bg-gray-50/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Link href={`/school-admin/exams/${exam.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${exam.is_published ? 'bg-emerald-100 text-emerald-600 ring-1 ring-emerald-200/50' : 'bg-amber-100 text-amber-600 ring-1 ring-amber-200/50'}`}>
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-gray-900">{exam.title}</p>
                          {exam.topics && exam.topics.length > 0 && (
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              {exam.topics.slice(0, 2).map((topic: string, idx: number) => (
                                <span key={idx} className="inline-flex items-center rounded-lg bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-violet-200/50">
                                  {topic}
                                </span>
                              ))}
                              {exam.topics.length > 2 && (
                                <span className="text-xs text-gray-400">+{exam.topics.length - 2}</span>
                              )}
                            </div>
                          )}
                          {/* Languages */}
                          <div className="flex items-center gap-1 mt-1">
                            {exam.languages.slice(0, 3).map((lang: string) => {
                              const countryCode = LANGUAGE_TO_COUNTRY[lang] || 'un'
                              return (
                                <Image
                                  key={lang}
                                  src={`https://flagcdn.com/w40/${countryCode}.png`}
                                  alt={LANGUAGE_NAMES[lang] || lang}
                                  title={LANGUAGE_NAMES[lang] || lang}
                                  width={18}
                                  height={14}
                                  className="rounded-sm object-cover"
                                  unoptimized
                                />
                              )
                            })}
                            {exam.languages.length > 3 && (
                              <span className="text-xs text-gray-400">+{exam.languages.length - 3}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </div>
                    <ExamRowActions examId={exam.id} isPublished={exam.is_published} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-gray-500 font-medium">{t('usedIn')}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {exam.usedInClass && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200/50" title={t('sharedInClass')}>
                          <Users className="h-3 w-3" />
                          {exam.className || t('classBadge')}
                        </span>
                      )}
                      {exam.usedInCalendar && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200/50" title={t('scheduledInCalendar')}>
                          <Calendar className="h-3 w-3" />
                          {t('calendarBadge')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <FileText className="h-3.5 w-3.5" />
                        {exam.questionCount} {t('questionsAbbr')}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <Award className="h-3.5 w-3.5" />
                        {exam.questionCount ?? 0} {t('questionsText')}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <Clock className="h-3.5 w-3.5" />
                        {exam.duration_minutes || 60} {t('minutesAbbr')}
                      </span>
                    </div>
                    {exam.is_published ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200/50">
                        <CheckCircle className="h-3 w-3" />
                        {t('inClass')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200/50">
                        <Clock className="h-3 w-3" />
                        {t('unused')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <table className="hidden min-w-full divide-y divide-gray-100 sm:table">
              <thead className="bg-gray-50/80">
                <tr>
                  <th scope="col" className="py-3.5 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:pl-6">{t('exam')}</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{t('usedIn')}</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{t('languages')}</th>
                  <th scope="col" className="hidden px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 lg:table-cell">{t('questions')}</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{t('status')}</th>
                  <th scope="col" className="hidden px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 lg:table-cell">{t('created')}</th>
                  <th scope="col" className="py-3.5 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 sm:pr-6">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {exams.map((exam) => (
                  <tr key={exam.id} className="transition-colors hover:bg-gray-50/70">
                    <td className="py-4 pl-5 pr-3 sm:pl-6">
                      <div className="flex items-center gap-3">
                        <Link href={`/school-admin/exams/${exam.id}`} className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-90">
                          <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${exam.is_published ? 'bg-emerald-100 text-emerald-600 ring-1 ring-emerald-200/50' : 'bg-amber-100 text-amber-600 ring-1 ring-amber-200/50'}`}>
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-gray-900">{exam.title}</p>
                            </div>
                            {/* Hide long auto-generated descriptions for course-based exams */}
                            {exam.description && (
                              <p className="text-sm text-gray-500 truncate max-w-xs">
                                {exam.description}
                              </p>
                            )}
                            {/* Course relation is shown via the clickable badge */}
                            {exam.topics && exam.topics.length > 0 && (
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                {exam.topics.slice(0, 2).map((topic: string, idx: number) => (
                                  <span key={idx} className="inline-flex items-center rounded-lg bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-violet-200/50">
                                    {topic}
                                  </span>
                                ))}
                                {exam.topics.length > 2 && (
                                  <span className="text-xs text-gray-400">+{exam.topics.length - 2}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {exam.usedInClass && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200/50" title={t('sharedInClass')}>
                            <Users className="h-3 w-3" />
                            {exam.className || t('classBadge')}
                          </span>
                        )}
                        {exam.usedInCalendar && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200/50" title={t('scheduledInCalendar')}>
                            <Calendar className="h-3 w-3" />
                            {t('calendarBadge')}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Languages */}
                    <td className="whitespace-nowrap px-3 py-4">
                      <div className="flex items-center gap-1">
                        {exam.languages.slice(0, 4).map((lang: string) => {
                          const countryCode = LANGUAGE_TO_COUNTRY[lang] || 'un'
                          return (
                            <span 
                              key={lang} 
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 overflow-hidden" 
                              title={LANGUAGE_NAMES[lang] || lang}
                            >
                              <Image
                                src={`https://flagcdn.com/w40/${countryCode}.png`}
                                alt={LANGUAGE_NAMES[lang] || lang}
                                width={22}
                                height={16}
                                className="object-cover"
                                unoptimized
                              />
                            </span>
                          )
                        })}
                        {exam.languages.length > 4 && (
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                            +{exam.languages.length - 4}
                          </span>
                        )}
                        {exam.languages.length === 0 && (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </div>
                    </td>

                    {/* Questions */}
                    <td className="hidden whitespace-nowrap px-3 py-4 lg:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <FileText className="h-4 w-4" />
                        {exam.questionCount}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-3 py-4">
                      {exam.is_published ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200/50">
                          <CheckCircle className="h-3 w-3" />
                          {t('inClass')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200/50">
                          <Clock className="h-3 w-3" />
                          {t('unused')}
                        </span>
                      )}
                    </td>

                    {/* Created */}
                    <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(exam.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="whitespace-nowrap py-4 pl-3 pr-4 sm:pr-6">
                      <div className="flex items-center justify-end">
                        <ExamRowActions examId={exam.id} isPublished={exam.is_published} />
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
      {exams.length > 0 && (
        <div className="space-y-4">
          <PaginationFooter
            currentPage={currentPage}
            perPage={TEACHER_EXAMS_PER_PAGE}
            totalItems={totalExams}
            baseUrl="/school-admin/exams"
            searchParams={{
              search: params.search,
              status: params.status,
              classId: params.classId,
            }}
          />
          {(params.search || params.status || params.classId) && (
            <div className="text-center">
              <Link
                href="/school-admin/exams"
                className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700"
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

