'use client'

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Clock, ListChecks, FileText, Eye, Target, BarChart3 } from 'lucide-react'
import { getQuestionTypeBadgeClass, getDifficultyBadgeClass } from './badge-classes'

export interface FinalExamPreviewProps {
  title: string
  totalQuestions: number
  durationMinutes: number | null
  sourceCount: number
  oneAttempt?: boolean
  /** When true, show a hint that the title can be set in Settings (optional). Use when user has not set a custom name. */
  showTitleHint?: boolean
  /** Counts of selected questions by type (e.g. { multiple_choice: 5, true_false: 2 }) */
  questionTypeCounts?: Record<string, number>
  /** Counts of selected questions by difficulty (e.g. { easy: 3, medium: 4, hard: 2 }) */
  difficultyCounts?: Record<string, number>
  labels?: {
    heading?: string
    subheading?: string
    questions?: string
    duration?: string
    sources?: string
    oneAttempt?: string
    fromPrefix?: string
    defaultTitle?: string
    titleOptionalHint?: string
    byType?: string
    byDifficulty?: string
    typeMC?: string
    typeTF?: string
    typeMS?: string
    typeFill?: string
    diffEasy?: string
    diffMedium?: string
    diffHard?: string
  }
}

const TYPE_KEYS = ['multiple_choice', 'true_false', 'multiple_select', 'fill_blank'] as const
const DIFF_KEYS = ['easy', 'medium', 'hard'] as const

function getTypeLabel(key: string, labels: Record<string, string>): string {
  const map: Record<string, string> = {
    multiple_choice: labels.typeMC ?? 'MC',
    true_false: labels.typeTF ?? 'T/F',
    multiple_select: labels.typeMS ?? 'MS',
    fill_blank: labels.typeFill ?? 'Fill',
  }
  return map[key] ?? key
}

function getDiffLabel(key: string, labels: Record<string, string>): string {
  const map: Record<string, string> = {
    easy: labels.diffEasy ?? 'Easy',
    medium: labels.diffMedium ?? 'Medium',
    hard: labels.diffHard ?? 'Hard',
  }
  return map[key] ?? key
}

export function FinalExamPreview({
  title,
  totalQuestions,
  durationMinutes,
  sourceCount,
  oneAttempt = true,
  showTitleHint = false,
  questionTypeCounts = {},
  difficultyCounts = {},
  labels = {},
}: FinalExamPreviewProps) {
  const t = {
    heading: labels.heading ?? 'How it will look for students',
    subheading: labels.subheading ?? 'When they open this final exam they will see:',
    questions: labels.questions ?? 'questions',
    duration: labels.duration ?? 'min',
    sources: labels.sources ?? 'source exams',
    oneAttempt: labels.oneAttempt ?? 'One attempt',
    fromPrefix: labels.fromPrefix ?? 'From ',
    defaultTitle: labels.defaultTitle ?? 'Final exam',
    titleOptionalHint: labels.titleOptionalHint ?? 'Set a custom name in Settings (optional)',
    byType: labels.byType ?? 'By type',
    byDifficulty: labels.byDifficulty ?? 'By difficulty',
    typeMC: labels.typeMC ?? 'MC',
    typeTF: labels.typeTF ?? 'T/F',
    typeMS: labels.typeMS ?? 'MS',
    typeFill: labels.typeFill ?? 'Fill',
    diffEasy: labels.diffEasy ?? 'Easy',
    diffMedium: labels.diffMedium ?? 'Medium',
    diffHard: labels.diffHard ?? 'Hard',
  }

  const trimmed = title.trim()
  const isDefaultEnglish = trimmed === 'Final exam'
  const displayTitle = trimmed && !isDefaultEnglish ? trimmed : t.defaultTitle
  const hasTypeCounts = totalQuestions > 0 && TYPE_KEYS.some((k) => (questionTypeCounts[k] ?? 0) > 0)
  const hasDiffCounts = totalQuestions > 0 && DIFF_KEYS.some((k) => (difficultyCounts[k] ?? 0) > 0)

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <Eye className="h-4 w-4 text-indigo-600" />
          {t.heading}
        </CardTitle>
        <p className="text-sm text-gray-600">{t.subheading}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-indigo-100 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div>
                <p className="font-medium text-gray-900">{displayTitle}</p>
                {showTitleHint && (
                  <p className="mt-0.5 text-xs text-gray-500">{t.titleOptionalHint}</p>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <ListChecks className="h-4 w-4 text-gray-400" />
                  <strong>{totalQuestions}</strong> {t.questions}
                </span>
                {durationMinutes != null && durationMinutes > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <strong>{durationMinutes}</strong> {t.duration}
                  </span>
                )}
              </div>
              {sourceCount > 1 && (
                <div className="mt-2">
                  <Badge variant="secondary" className="font-normal">
                    {t.fromPrefix}{sourceCount} {t.sources}
                  </Badge>
                </div>
              )}
              {oneAttempt && (
                <div className="mt-2">
                  <Badge variant="outline" className="font-normal">
                    {t.oneAttempt}
                  </Badge>
                </div>
              )}

              {hasTypeCounts && (
                <div className="mt-3 pt-3 border-t border-indigo-100">
                  <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" />
                    {t.byType}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {TYPE_KEYS.map((key) => {
                      const n = questionTypeCounts[key] ?? 0
                      if (n === 0) return null
                      return (
                        <span
                          key={key}
                          className={getQuestionTypeBadgeClass(key)}
                        >
                          {getTypeLabel(key, t)} {n}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {hasDiffCounts && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                    <BarChart3 className="h-3.5 w-3.5" />
                    {t.byDifficulty}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {DIFF_KEYS.map((key) => {
                      const n = difficultyCounts[key] ?? 0
                      if (n === 0) return null
                      return (
                        <span
                          key={key}
                          className={getDifficultyBadgeClass(key)}
                        >
                          {getDiffLabel(key, t)} {n}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
