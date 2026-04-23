'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  PlayCircle,
  Clock,
  GraduationCap,
  Calendar,
  Search,
  X,
  BookOpen,
  Volume2,
  Image as ImageIcon,
  FileQuestion,
} from 'lucide-react'
import { Input } from '../ui/input'

export interface StudentLessonItem {
  id: string
  title: string
  description?: string | null
  topic?: string | null
  duration_minutes?: number | null
  created_at: string
  class_name?: string | null
  class_id?: string | null
  is_published: boolean
  created_by?: string | null
  creator?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
  has_audio?: boolean
  has_images?: boolean
  has_quiz?: boolean
  is_completed?: boolean
  time_spent_seconds?: number | null
}

export interface StudentLessonsListTranslations {
  title: string
  subtitle: string
  showingCount: string
  availableLessons: string
  published: string
  completed: string
  searchPlaceholder: string
  status: string
  all: string
  notCompleted: string
  class: string
  noLessonsFound: string
  noLessonsAvailable: string
  tryAdjustingSearch: string
  noLessonsHint: string
  createdBy: string
  voice: string
  images: string
  quiz: string
  view: string
  available: string
  unused: string
}

const DEFAULT_LESSONS_LIST_TRANSLATIONS: StudentLessonsListTranslations = {
  title: 'Available Lessons',
  subtitle: 'Access lessons from your enrolled classes.',
  showingCount: "Showing {shown} of {total}",
  availableLessons: 'Available Lessons',
  published: 'Published',
  completed: 'Completed',
  searchPlaceholder: 'Search lessons by title, class, topic, or description...',
  status: 'Status:',
  all: 'All',
  notCompleted: 'Not completed',
  class: 'Class:',
  noLessonsFound: 'No lessons found',
  noLessonsAvailable: 'No lessons available',
  tryAdjustingSearch: 'Try adjusting your search terms',
  noLessonsHint: 'Lessons from your enrolled classes will appear here once they are shared by your teachers.',
  createdBy: 'Created by {name}',
  voice: 'Voice',
  images: 'Images',
  quiz: 'Quiz',
  view: 'View',
  available: 'Available',
  unused: 'Unused',
}

export interface StudentLessonsListProps {
  lessons: StudentLessonItem[]
  translations?: Partial<StudentLessonsListTranslations>
}

export function StudentLessonsList({ lessons, translations: tProp }: StudentLessonsListProps) {
  const t = { ...DEFAULT_LESSONS_LIST_TRANSLATIONS, ...tProp }
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'not_completed'>('all')

  const uniqueClasses = Array.from(
    new Map(
      lessons
        .filter(l => l.class_id && l.class_name)
        .map(l => [l.class_id!, { id: l.class_id!, name: l.class_name! }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name))

  const filteredLessons = lessons.filter(lesson => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = (
        lesson.title.toLowerCase().includes(query) ||
        lesson.class_name?.toLowerCase().includes(query) ||
        lesson.description?.toLowerCase().includes(query) ||
        lesson.topic?.toLowerCase().includes(query)
      )
      if (!matchesSearch) return false
    }
    if (selectedClassFilter !== 'all' && lesson.class_id !== selectedClassFilter) return false
    if (statusFilter === 'completed' && !lesson.is_completed) return false
    if (statusFilter === 'not_completed' && lesson.is_completed) return false
    return true
  })

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 p-4 sm:p-6 lg:p-8 text-white shadow-xl">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-12 sm:-top-24 -right-12 sm:-right-24 h-48 w-48 sm:h-96 sm:w-96 rounded-full bg-white/20"></div>
          <div className="absolute -bottom-6 sm:-bottom-12 -left-6 sm:-left-12 h-32 w-32 sm:h-64 sm:w-64 rounded-full bg-white/20"></div>
        </div>
        
        <div className="relative">
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm flex-shrink-0">
                <PlayCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold truncate">{t.title}</h1>
            </div>
            <p className="text-sm sm:text-base text-emerald-100 max-w-lg">
              {t.subtitle}
            </p>
            
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <div className="rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-sm px-4 sm:px-6 py-3 sm:py-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold">{filteredLessons.length}</p>
                <p className="text-xs sm:text-sm text-emerald-200">
                  {lessons.length !== filteredLessons.length
                    ? t.showingCount.replace(/\{shown\}/g, String(filteredLessons.length)).replace(/\{total\}/g, String(lessons.length))
                    : t.availableLessons}
                </p>
              </div>
              <div className="rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-sm px-4 sm:px-6 py-3 sm:py-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold">
                  {filteredLessons.filter(l => l.is_published).length}
                </p>
                <p className="text-xs sm:text-sm text-emerald-200">{t.published}</p>
              </div>
              <div className="rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-sm px-4 sm:px-6 py-3 sm:py-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold">
                  {filteredLessons.filter(l => l.is_completed).length}
                </p>
                <p className="text-xs sm:text-sm text-emerald-200">{t.completed}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      {lessons.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
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
          {(uniqueClasses.length > 0 || true) && (
            <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm flex flex-wrap items-center gap-3 sm:gap-4">
              {/* Status filter */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs sm:text-sm font-semibold text-gray-700">{t.status}</span>
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-emerald-100 text-emerald-700 shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {t.all}
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                    statusFilter === 'completed'
                      ? 'bg-green-100 text-green-700 shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {t.completed}
                </button>
                <button
                  onClick={() => setStatusFilter('not_completed')}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                    statusFilter === 'not_completed'
                      ? 'bg-amber-100 text-amber-700 shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {t.notCompleted}
                </button>
              </div>

              {/* Divider */}
              {uniqueClasses.length > 0 && (
                <div className="hidden sm:block h-6 w-px bg-gray-200" />
              )}

              {/* Class filter */}
              {uniqueClasses.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-gray-700">{t.class}</span>
                  <button
                    onClick={() => setSelectedClassFilter('all')}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                      selectedClassFilter === 'all'
                        ? 'bg-emerald-100 text-emerald-700 shadow-sm'
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
                          ? 'bg-emerald-100 text-emerald-700 shadow-sm'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <BookOpen className="h-4 w-4" />
                      {classItem.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lessons Grid */}
      {filteredLessons.length === 0 ? (
        <div className="rounded-xl sm:rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 sm:p-12 lg:p-16 text-center">
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gray-100 flex items-center justify-center mb-4 sm:mb-6">
            <PlayCircle className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            {searchQuery ? t.noLessonsFound : t.noLessonsAvailable}
          </h3>
          <p className="text-sm sm:text-base text-gray-500 max-w-md mx-auto mb-4 sm:mb-6 px-4">
            {searchQuery ? t.tryAdjustingSearch : t.noLessonsHint}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLessons.map((lesson) => (
            <Link
              key={lesson.id}
              href={`/student/lessons/${lesson.id}`}
              className="group relative rounded-xl sm:rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all duration-300"
            >
              {/* Colored Header */}
              <div className="h-2 sm:h-3 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
              
              <div className="p-4 sm:p-6">
                {/* Lesson Icon & Title */}
                <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-lg sm:rounded-xl flex-shrink-0 bg-emerald-100 text-emerald-600 shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <PlayCircle className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
                      {lesson.title}
                    </h3>
                    {lesson.class_name && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <BookOpen className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500 truncate">{lesson.class_name}</span>
                      </div>
                    )}
                  </div>
                  {lesson.is_completed ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 flex-shrink-0">
                      {t.completed}
                    </span>
                  ) : lesson.is_published ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 flex-shrink-0">
                      {t.available}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 flex-shrink-0">
                      {t.unused}
                    </span>
                  )}
                </div>
                
                {/* Description */}
                {lesson.description ? (
                  <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-3 sm:mb-4 min-h-[32px] sm:min-h-[40px]">
                    {lesson.description}
                  </p>
                ) : (
                  <div className="mb-3 sm:mb-4 min-h-[32px] sm:min-h-[40px]"></div>
                )}
                
                {/* Creator Info */}
                {lesson.creator && (
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-medium flex-shrink-0">
                      {lesson.creator.full_name?.charAt(0).toUpperCase() || 'T'}
                    </div>
                    <span className="text-xs text-gray-500">{t.createdBy.replace(/\{name\}/g, lesson.creator.full_name || 'Teacher')}</span>
                  </div>
                )}
                
                {/* Stats Row */}
                <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 flex-wrap">
                  {lesson.topic && (
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
                      <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                      <span className="capitalize font-medium truncate">{lesson.topic}</span>
                    </div>
                  )}
                  {lesson.duration_minutes && (
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                      <span className="font-medium">{lesson.duration_minutes} min</span>
                    </div>
                  )}
                </div>

                {/* Content capabilities: audio, images, quiz */}
                {(lesson.has_audio || lesson.has_images || lesson.has_quiz) && (
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-gray-600 mb-3 sm:mb-4 flex-wrap">
                    {lesson.has_audio && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 border border-indigo-100 text-indigo-700">
                        <Volume2 className="h-3 w-3" />
                        <span>{t.voice}</span>
                      </span>
                    )}
                    {lesson.has_images && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 border border-amber-100 text-amber-700">
                        <ImageIcon className="h-3 w-3" />
                        <span>{t.images}</span>
                      </span>
                    )}
                    {lesson.has_quiz && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-1 border border-purple-100 text-purple-700">
                        <FileQuestion className="h-3 w-3" />
                        <span>{t.quiz}</span>
                      </span>
                    )}
                  </div>
                )}
                
                {/* Footer */}
                <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-100">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(lesson.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </span>
                  <div className="flex items-center gap-1 text-xs sm:text-sm font-medium text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="hidden sm:inline">{t.view}</span>
                    <PlayCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
