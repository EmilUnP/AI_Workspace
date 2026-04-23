'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  Calendar,
  Search,
  X,
  BookOpen,
  PlayCircle,
  Users,
  GraduationCap
} from 'lucide-react'
import { Input } from '../ui/input'

// Map language codes to country codes for flag images
const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  en: 'gb',
  tr: 'tr',
  de: 'de',
  fr: 'fr',
  es: 'es',
  it: 'it',
  pt: 'pt',
  ru: 'ru',
  ar: 'sa',
  zh: 'cn',
  ja: 'jp',
  ko: 'kr',
  nl: 'nl',
  pl: 'pl',
  uk: 'ua',
  az: 'az',
}

// Language names mapping
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  tr: 'Turkish',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  ar: 'Arabic',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  nl: 'Dutch',
  pl: 'Polish',
  uk: 'Ukrainian',
  az: 'Azerbaijani',
}

export interface StudentExamItem {
  id: string
  title: string
  description?: string | null
  duration_minutes?: number | null
  created_at: string
  class_name?: string | null
  class_id?: string | null
  question_count?: number
  has_submitted?: boolean
  submission_score?: number | null
  /** Number of times the student has taken this exam */
  attempt_count?: number
  /** Best score (percentage) across all attempts */
  best_score?: number | null
  /** Average score (percentage) across all attempts */
  average_score?: number | null
  start_time?: string | null
  end_time?: string | null
  languages?: string[]
  is_published?: boolean
  created_by?: string | null
  creator?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

export interface StudentExamsListTranslations {
  title: string
  subtitle: string
  showingCount: string
  availableExams: string
  completed: string
  searchPlaceholder: string
  class: string
  teacher: string
  all: string
  noExamsFound: string
  noExamsAvailable: string
  tryAdjustingSearch: string
  noExamsHint: string
  questions: string
  min: string
  bestScore: string
  notAvailable: string
  available: string
  attempt: string
  attempts: string
  best: string
  avg: string
  exam: string
  duration: string
  attemptsAndScores: string
  created: string
  byCreator: string
  classHeader: string
  questionsHeader: string
}

const DEFAULT_EXAMS_LIST_TRANSLATIONS: StudentExamsListTranslations = {
  title: 'Available Exams',
  subtitle: 'View and take exams from your enrolled classes.',
  showingCount: 'Showing {count} of {total}',
  availableExams: 'Available Exams',
  completed: 'Completed',
  searchPlaceholder: 'Search exams by title, class, teacher, or description...',
  class: 'Class:',
  teacher: 'Teacher:',
  all: 'All',
  noExamsFound: 'No exams found',
  noExamsAvailable: 'No exams available',
  tryAdjustingSearch: 'Try adjusting your search terms',
  noExamsHint: 'Exams from your enrolled classes will appear here once they are published by your teachers.',
  questions: 'questions',
  min: 'min',
  bestScore: 'Best {score}%',
  notAvailable: 'Not Available',
  available: 'Available',
  attempt: 'attempt',
  attempts: 'attempts',
  best: 'Best:',
  avg: 'Avg:',
  exam: 'Exam',
  duration: 'Duration',
  attemptsAndScores: 'Attempts & Scores',
  created: 'Created',
  byCreator: 'By {name}',
  classHeader: 'Class',
  questionsHeader: 'Questions',
}

export interface StudentExamsListProps {
  exams: StudentExamItem[]
  translations?: Partial<StudentExamsListTranslations>
}

function isExamAvailable(exam: StudentExamItem): boolean {
  const hasStart = exam.start_time != null && String(exam.start_time).trim() !== ''
  const hasEnd = exam.end_time != null && String(exam.end_time).trim() !== ''
  if (!hasStart && !hasEnd) return true // No schedule: always available (class library)
  const now = new Date()
  if (hasStart) {
    const start = new Date(exam.start_time!)
    if (!Number.isNaN(start.getTime()) && start > now) return false
  }
  if (hasEnd) {
    const end = new Date(exam.end_time!)
    if (!Number.isNaN(end.getTime()) && end < now) return false
  }
  return true
}

function interpolate(str: string, values: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? key))
}

export function StudentExamsList({ exams, translations: tProp }: StudentExamsListProps) {
  const t = { ...DEFAULT_EXAMS_LIST_TRANSLATIONS, ...tProp }
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all')
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('all')

  // Extract unique classes and teachers for filters
  const uniqueClasses = Array.from(
    new Map(
      exams
        .filter(e => e.class_id && e.class_name)
        .map(e => [e.class_id!, { id: e.class_id!, name: e.class_name! }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name))

  const uniqueTeachers = Array.from(
    new Map(
      exams
        .filter(e => e.creator?.id && e.creator?.full_name)
        .map(e => [e.creator!.id, { id: e.creator!.id, name: e.creator!.full_name! }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name))

  // Filter exams based on search and filters
  const filteredExams = exams.filter(exam => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = (
        exam.title.toLowerCase().includes(query) ||
        exam.class_name?.toLowerCase().includes(query) ||
        exam.description?.toLowerCase().includes(query) ||
        exam.creator?.full_name?.toLowerCase().includes(query)
      )
      if (!matchesSearch) return false
    }

    // Class filter
    if (selectedClassFilter !== 'all' && exam.class_id !== selectedClassFilter) {
      return false
    }

    // Teacher filter
    if (selectedTeacherFilter !== 'all' && exam.created_by !== selectedTeacherFilter) {
      return false
    }

    return true
  })

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-600 via-emerald-700 to-teal-800 p-4 sm:p-6 lg:p-8 text-white shadow-xl">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-12 sm:-top-24 -right-12 sm:-right-24 h-48 w-48 sm:h-96 sm:w-96 rounded-full bg-white/20"></div>
          <div className="absolute -bottom-6 sm:-bottom-12 -left-6 sm:-left-12 h-32 w-32 sm:h-64 sm:w-64 rounded-full bg-white/20"></div>
        </div>
        
        <div className="relative">
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm flex-shrink-0">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold truncate">{t.title}</h1>
            </div>
            <p className="text-sm sm:text-base text-green-100 max-w-lg">
              {t.subtitle}
            </p>
            
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <div className="rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-sm px-4 sm:px-6 py-3 sm:py-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold">{filteredExams.length}</p>
                <p className="text-xs sm:text-sm text-green-200">
                  {exams.length !== filteredExams.length ? interpolate(t.showingCount, { count: filteredExams.length, total: exams.length }) : t.availableExams}
                </p>
              </div>
              <div className="rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-sm px-4 sm:px-6 py-3 sm:py-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold">
                  {filteredExams.filter(e => e.has_submitted).length}
                </p>
                <p className="text-xs sm:text-sm text-green-200">{t.completed}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {exams.length > 0 && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Class and Teacher Filters - combined, similar to lessons list */}
          {(uniqueClasses.length > 0 || uniqueTeachers.length > 0) && (
            <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm flex flex-wrap items-center gap-3 sm:gap-4">
              {/* Class filter */}
              {uniqueClasses.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-gray-700">{t.class}</span>
                  <button
                    onClick={() => setSelectedClassFilter('all')}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                      selectedClassFilter === 'all'
                        ? 'bg-green-100 text-green-700 shadow-sm'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <BookOpen className="h-4 w-4" />
                    {t.all}
                  </button>
                  {uniqueClasses.map((classItem) => (
                    <button
                      key={classItem.id}
                      onClick={() => setSelectedClassFilter(classItem.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                        selectedClassFilter === classItem.id
                          ? 'bg-green-100 text-green-700 shadow-sm'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <BookOpen className="h-4 w-4" />
                      {classItem.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Divider */}
              {uniqueClasses.length > 0 && uniqueTeachers.length > 0 && (
                <div className="hidden sm:block h-6 w-px bg-gray-200" />
              )}

              {/* Teacher filter */}
              {uniqueTeachers.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-gray-700">{t.teacher}</span>
                  <button
                    onClick={() => setSelectedTeacherFilter('all')}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                      selectedTeacherFilter === 'all'
                        ? 'bg-green-100 text-green-700 shadow-sm'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    {t.all}
                  </button>
                  {uniqueTeachers.map((teacher) => (
                    <button
                      key={teacher.id}
                      onClick={() => setSelectedTeacherFilter(teacher.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                        selectedTeacherFilter === teacher.id
                          ? 'bg-green-100 text-green-700 shadow-sm'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium flex-shrink-0 ${
                          selectedTeacherFilter === teacher.id
                            ? 'bg-green-200 text-green-800'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {teacher.name.charAt(0).toUpperCase()}
                      </div>
                      {teacher.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Exams List */}
      <div className="rounded-lg border border-gray-200 bg-white">
        {filteredExams.length === 0 ? (
          <div className="p-8 text-center sm:p-12">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {searchQuery ? t.noExamsFound : t.noExamsAvailable}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchQuery
                ? t.tryAdjustingSearch
                : t.noExamsHint}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="divide-y divide-gray-100 sm:hidden">
              {filteredExams.map((exam) => {
                const isAvailable = isExamAvailable(exam)
                const isCompleted = exam.has_submitted
                
                return (
                  <div key={exam.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link 
                        href={`/student/exams/${exam.id}`}
                        className="flex items-center gap-3 min-w-0 flex-1"
                      >
                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                          isCompleted 
                            ? 'bg-blue-100 text-blue-600' 
                            : isAvailable 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate">{exam.title}</p>
                          {exam.class_name && (
                            <div className="flex items-center gap-1 mt-1">
                              <BookOpen className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500 truncate">{exam.class_name}</span>
                            </div>
                          )}
                          {exam.creator?.full_name && (
                            <div className="flex items-center gap-1 mt-1">
                              <GraduationCap className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500 truncate">{interpolate(t.byCreator, { name: exam.creator.full_name })}</span>
                            </div>
                          )}
                          {exam.languages && exam.languages.length > 0 && (
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
                          )}
                          {exam.description && (
                            <p className="text-xs text-gray-500 truncate mt-1">{exam.description}</p>
                          )}
                        </div>
                      </Link>
                    </div>
                    <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          {exam.question_count ?? 0} {t.questions}
                        </span>
                        <span className="text-gray-300">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {exam.duration_minutes ?? 60} {t.min}
                        </span>
                      </div>
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
                          <CheckCircle className="h-3 w-3" />
                          {exam.submission_score !== null && exam.submission_score !== undefined
                            ? interpolate(t.bestScore, { score: exam.submission_score })
                            : t.completed}
                        </span>
                      ) : isAvailable ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                          <PlayCircle className="h-3 w-3" />
                          {t.available}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700">
                          <Clock className="h-3 w-3" />
                          {t.notAvailable}
                        </span>
                      )}
                    </div>
                    {(exam.attempt_count ?? 0) > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-600">
                        <span className="font-medium">{exam.attempt_count} {(exam.attempt_count ?? 0) !== 1 ? t.attempts : t.attempt}</span>
                        {exam.best_score != null && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span>{t.best} <strong className="text-green-700">{exam.best_score}%</strong></span>
                          </>
                        )}
                        {exam.average_score != null && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span>{t.avg} <strong className="text-gray-700">{exam.average_score}%</strong></span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Desktop Table View */}
            <table className="hidden min-w-full divide-y divide-gray-200 sm:table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:pl-6">
                    {t.exam}
                  </th>
                  <th className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 lg:table-cell">
                    {t.classHeader}
                  </th>
                  <th className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 lg:table-cell">
                    {t.questionsHeader}
                  </th>
                  <th className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 md:table-cell">
                    {t.duration}
                  </th>
                  <th className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 lg:table-cell">
                    {t.attemptsAndScores}
                  </th>
                  <th className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 lg:table-cell">
                    {t.created}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredExams.map((exam) => {
                  const isAvailable = isExamAvailable(exam)
                  const isCompleted = exam.has_submitted
                  
                  return (
                    <tr key={exam.id} className="hover:bg-gray-50 transition-colors">
                      {/* Exam */}
                      <td className="py-4 pl-4 pr-3 sm:pl-6">
                        <Link 
                          href={`/student/exams/${exam.id}`}
                          className="flex items-center gap-3 hover:opacity-80"
                        >
                          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                            isCompleted 
                              ? 'bg-blue-100 text-blue-600' 
                              : isAvailable 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900">{exam.title}</p>
                            {exam.description && (
                              <p className="text-sm text-gray-500 truncate max-w-xs mt-1">
                                {exam.description}
                              </p>
                            )}
                          </div>
                        </Link>
                      </td>

                      {/* Class */}
                      <td className="hidden whitespace-nowrap px-3 py-4 lg:table-cell">
                        <div className="space-y-1">
                          {exam.class_name ? (
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">{exam.class_name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                          {exam.creator?.full_name && (
                            <div className="flex items-center gap-2">
                              <GraduationCap className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">{exam.creator.full_name}</span>
                            </div>
                          )}
                          {exam.languages && exam.languages.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              {exam.languages.slice(0, 4).map((lang: string) => {
                                const countryCode = LANGUAGE_TO_COUNTRY[lang] || 'un'
                                return (
                                  <span 
                                    key={lang} 
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 overflow-hidden" 
                                    title={LANGUAGE_NAMES[lang] || lang}
                                  >
                                    <Image
                                      src={`https://flagcdn.com/w40/${countryCode}.png`}
                                      alt={LANGUAGE_NAMES[lang] || lang}
                                      width={20}
                                      height={14}
                                      className="object-cover"
                                      unoptimized
                                    />
                                  </span>
                                )
                              })}
                              {exam.languages.length > 4 && (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                                  +{exam.languages.length - 4}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Questions */}
                      <td className="hidden whitespace-nowrap px-3 py-4 lg:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <FileText className="h-4 w-4" />
                          {exam.question_count ?? 0} {t.questions}
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="hidden whitespace-nowrap px-3 py-4 md:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          {exam.duration_minutes || 60} {t.min}
                        </div>
                      </td>

                      {/* Your attempts */}
                      <td className="hidden px-3 py-4 lg:table-cell">
                        {(exam.attempt_count ?? 0) > 0 ? (
                          <div className="text-sm text-gray-600 space-y-0.5">
                            <div className="font-medium">{exam.attempt_count} {(exam.attempt_count ?? 0) !== 1 ? t.attempts : t.attempt}</div>
                            {exam.best_score != null && (
                              <div>{t.best} <span className="font-semibold text-green-700">{exam.best_score}%</span></div>
                            )}
                            {exam.average_score != null && (
                              <div>{t.avg} <span className="font-medium text-gray-700">{exam.average_score}%</span></div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
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
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  )
}
