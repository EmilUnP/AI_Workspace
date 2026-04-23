'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { StudentLessonItem } from '@eduator/core/utils/student-lessons'
import { HorizontalBarChart, ProgressRing, type StudentExamItem } from '@eduator/ui'
import {
  BarChart3,
  Clock,
  CheckCircle2,
  FileText,
  BookOpen,
  Calendar,
  Volume2,
  Image as ImageIcon,
  FileQuestion,
  Trophy,
  Target,
  TrendingDown,
} from 'lucide-react'

interface StudentProgressClientProps {
  lessons: StudentLessonItem[]
  exams: StudentExamItem[]
}

export function StudentProgressClient({ lessons, exams }: StudentProgressClientProps) {
  const t = useTranslations('studentProgress')
  const [activeTab, setActiveTab] = useState<'overview' | 'lessons' | 'exams'>('overview')
  const {
    totalLessonTime,
    completedLessons,
    inProgressLessons,
    totalLessonsWithProgress,
  } = useMemo(() => {
    const withProgress = lessons.filter(
      (l) => l.is_completed || (l.time_spent_seconds ?? 0) > 0
    )
    const completed = withProgress.filter((l) => l.is_completed)
    const inProgress = withProgress.filter(
      (l) => !l.is_completed && (l.time_spent_seconds ?? 0) > 0
    )
    const totalTime = withProgress.reduce(
      (sum, l) => sum + (l.time_spent_seconds ?? 0),
      0
    )
    return {
      totalLessonTime: totalTime,
      completedLessons: completed.length,
      inProgressLessons: inProgress.length,
      totalLessonsWithProgress: withProgress.length,
    }
  }, [lessons])

  const {
    examsTaken,
    averageBestScore,
    scoredExams,
  } = useMemo(() => {
    const taken = exams.filter((e) => e.has_submitted)
    if (taken.length === 0) {
      return {
        examsTaken: 0,
        averageBestScore: null as number | null,
        scoredExams: [] as StudentExamItem[],
      }
    }
    const scores = taken
      .map((e) => (typeof e.best_score === 'number' ? e.best_score : null))
      .filter((s): s is number => s !== null && !Number.isNaN(s))

    const avg =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null

    return {
      examsTaken: taken.length,
      averageBestScore: avg,
      scoredExams: taken.filter((e) => typeof e.best_score === 'number'),
    }
  }, [exams])

  function formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '0 min'
    const mins = Math.floor(seconds / 60)
    const hrs = Math.floor(mins / 60)
    const remMins = mins % 60
    if (hrs > 0) {
      return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`
    }
    return `${mins} min`
  }

  const lessonsWithProgress = lessons.filter(
    (l) => l.is_completed || (l.time_spent_seconds ?? 0) > 0
  )

  const totalLessons = lessons.length
  const completedCount = lessons.filter((l) => l.is_completed).length
  const completionRate =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  const topTimeLessons = [...lessonsWithProgress]
    .sort((a, b) => (b.time_spent_seconds ?? 0) - (a.time_spent_seconds ?? 0))
    .slice(0, 5)

  const bestScoredExams = [...scoredExams]
    .sort((a, b) => (b.best_score ?? 0) - (a.best_score ?? 0))
    .slice(0, 5)

  const weakScoredExams = [...scoredExams]
    .sort((a, b) => (a.best_score ?? 0) - (b.best_score ?? 0))
    .slice(0, 5)

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/20" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/20" />
        </div>
        <div className="relative flex flex-col gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{t('title')}</h1>
              <p className="text-sm sm:text-base text-emerald-100">
                {t('subtitle')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-2">
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'overview' as const, label: t('overviewTab') },
            { id: 'lessons' as const, label: t('lessonsTab') },
            { id: 'exams' as const, label: t('examsTab') },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      {activeTab === 'overview' ? (
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-emerald-100 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">
                {t('totalLessonTime')}
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {formatDuration(totalLessonTime)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Clock className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">
                {t('completedLessons')}
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {completedLessons}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">
                {t('inProgressLessons')}
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {inProgressLessons}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <BookOpen className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">
                {t('examsTaken')}
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {examsTaken}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {averageBestScore != null
                  ? t('avgBestScore', { score: averageBestScore })
                  : t('noScoredExamsYet')}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>
      ) : null}

      {/* Visual breakdown: lessons & exams */}
      {activeTab === 'overview' ? (
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Lesson completion & time distribution */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 sm:text-base">
                {t('lessonCompletionOverview')}
              </h2>
              <p className="text-xs text-gray-500">
                {t('lessonCompletionDescription')}
              </p>
            </div>
          </div>

          {/* Completion bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>{t('overallCompletion')}</span>
              <span className="font-medium text-emerald-600">
                {completionRate}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-500">
              <span>{t('completedCount', { count: completedCount })}</span>
              <span>{t('totalLessons', { count: totalLessons })}</span>
            </div>
          </div>

          {/* Time by top lessons */}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-700 uppercase tracking-wide">
              {t('timeSpentByLesson')}
            </p>
            {topTimeLessons.length === 0 ? (
              <p className="text-xs text-gray-500">
                {t('startLessonToSeeTime')}
              </p>
            ) : (
              <div className="space-y-2">
                {topTimeLessons.map((lesson) => {
                  const maxSeconds = topTimeLessons[0]?.time_spent_seconds ?? 0
                  const value = lesson.time_spent_seconds ?? 0
                  const width =
                    maxSeconds > 0 ? Math.max(6, (value / maxSeconds) * 100) : 0
                  return (
                    <div key={lesson.id}>
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-0.5">
                        <span className="truncate max-w-[65%]">
                          {lesson.title}
                        </span>
                        <span className="ml-2 text-[11px] text-gray-500">
                          {formatDuration(value)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-emerald-400"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Exam performance mini-chart */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 sm:text-base">
                {t('examPerformance')}
              </h2>
              <p className="text-xs text-gray-500">
                {t('examPerformanceDescription')}
              </p>
            </div>
          </div>

          {scoredExams.length === 0 ? (
            <p className="text-xs text-gray-500">
              {t('noExamChartYet')}
            </p>
            ) : (
            <div className="space-y-3">
              <div className="flex items-end gap-2 h-40 sm:h-44">
                {scoredExams.slice(0, 6).map((exam) => {
                  const score =
                    typeof exam.best_score === 'number' ? exam.best_score : 0
                  const height = Math.max(8, Math.min(100, score))
                  return (
                    <div
                      key={exam.id}
                      className="flex-1 flex flex-col items-center justify-end gap-1"
                    >
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-emerald-500 to-teal-400 shadow-sm"
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-[11px] font-medium text-gray-700">
                        {score}%
                      </span>
                      <span className="line-clamp-2 text-[10px] text-gray-500 text-center">
                        {exam.title}
                      </span>
                    </div>
                  )
                })}
              </div>
              {averageBestScore != null && (
                <p className="text-[11px] text-gray-500">
                  {t('averageBestScoreLabel')}{' '}
                  <span className="font-semibold text-emerald-600">
                    {averageBestScore}%
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      ) : null}

      {activeTab === 'overview' ? (
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 sm:text-base mb-3">{t('timeByTopLessons')}</h2>
            {topTimeLessons.length === 0 ? (
              <p className="text-xs text-gray-500">{t('startLessonToSeeTime')}</p>
            ) : (
              <HorizontalBarChart
                data={topTimeLessons.map((lesson) => Math.round((lesson.time_spent_seconds ?? 0) / 60))}
                labels={topTimeLessons.map((lesson) => lesson.title)}
                colors={['#10B981', '#14B8A6', '#22C55E', '#06B6D4', '#3B82F6']}
                valueSuffix="m"
                showPercentage={false}
                totalLabel={t('totalLabel')}
              />
            )}
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 sm:text-base mb-3">{t('completionRing')}</h2>
            <div className="flex items-center justify-center">
              <ProgressRing value={completedCount} max={Math.max(totalLessons, 1)} color="#10B981" />
            </div>
          </div>
        </div>
      ) : null}

      {/* Lessons with progress */}
      {activeTab === 'lessons' || activeTab === 'overview' ? (
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900 sm:text-base">
            {t('lessonsYouStarted')}
          </h2>
          <p className="text-xs text-gray-500">
            {t('lessonsWithTrackedTime', { count: totalLessonsWithProgress })}
          </p>
        </div>
        {lessonsWithProgress.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
            {t('noLessonsStarted')}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {lessonsWithProgress.map((lesson) => (
              <div
                key={lesson.id}
                className="flex flex-col gap-1 px-4 py-3 sm:px-5 sm:py-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        lesson.is_completed ? 'bg-emerald-500' : 'bg-amber-400'
                      }`}
                    />
                    <p className="truncate text-sm font-medium text-gray-900">
                      {lesson.title}
                    </p>
                  </div>
                  {typeof lesson.time_spent_seconds === 'number' &&
                    lesson.time_spent_seconds > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{formatDuration(lesson.time_spent_seconds)}</span>
                      </span>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                  {lesson.class_name && (
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      <span className="truncate max-w-[140px] sm:max-w-[200px]">
                        {lesson.class_name}
                      </span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(lesson.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{lesson.is_completed ? t('completed') : t('inProgress')}</span>
                  </span>
                  {(lesson.has_audio || lesson.has_images || lesson.has_quiz) && (
                    <span className="inline-flex items-center gap-1">
                      {lesson.has_audio && <Volume2 className="h-3 w-3" />}
                      {lesson.has_images && <ImageIcon className="h-3 w-3" />}
                      {lesson.has_quiz && <FileQuestion className="h-3 w-3" />}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      ) : null}

      {activeTab === 'exams' ? (
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-white p-4 sm:p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 sm:text-base mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-emerald-600" />
              {t('strongestExams')}
            </h2>
            {bestScoredExams.length === 0 ? (
              <p className="text-xs text-gray-500">{t('noScoredExamsYet')}</p>
            ) : (
              <div className="space-y-2">
                {bestScoredExams.map((exam) => (
                  <div key={exam.id} className="rounded-lg border border-gray-100 p-3 text-sm">
                    <p className="font-medium text-gray-900 truncate">{exam.title}</p>
                    <p className="text-gray-600 mt-1 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        {t('bestLabel')} {exam.best_score}%
                      </span>
                      <span>{t('attemptsLabel')}: {exam.attempt_count || 0}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-amber-900 sm:text-base mb-3 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-amber-700" />
              {t('improveNext')}
            </h2>
            {weakScoredExams.length === 0 ? (
              <p className="text-xs text-amber-700">{t('noScoredExamsYet')}</p>
            ) : (
              <div className="space-y-2">
                {weakScoredExams.map((exam) => (
                  <div key={exam.id} className="rounded-lg border border-amber-200 bg-white p-3 text-sm">
                    <p className="font-medium text-gray-900 truncate">{exam.title}</p>
                    <p className="text-gray-600 mt-1 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {t('bestLabel')} {exam.best_score}%
                      </span>
                      <span>{t('attemptsLabel')}: {exam.attempt_count || 0}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === 'exams' && scoredExams.length > 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 sm:text-base mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-600" />
            {t('scoreComparisonChart')}
          </h2>
          <HorizontalBarChart
            data={scoredExams.slice(0, 8).map((exam) => exam.best_score || 0)}
            labels={scoredExams.slice(0, 8).map((exam) => exam.title)}
            colors={['#3B82F6', '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#84CC16']}
            maxValue={100}
            valueSuffix="%"
            showPercentage={false}
            totalLabel={t('totalLabel')}
          />
        </div>
      ) : null}
    </div>
  )
}

