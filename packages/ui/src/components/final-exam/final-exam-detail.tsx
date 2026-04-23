'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import {
  ArrowLeft,
  Users,
  Clock,
  ListChecks,
  User,
  Pencil,
  Trash2,
  Loader2,
  Target,
  BarChart3,
} from 'lucide-react'
import type { FinalExamWithSource } from '@eduator/core/types/final-exam'
import { getQuestionTypeBadgeClass, getDifficultyBadgeClass } from './badge-classes'

const TYPE_KEYS = ['multiple_choice', 'true_false', 'multiple_select', 'fill_blank'] as const
const DIFF_KEYS = ['easy', 'medium', 'hard'] as const

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function getQuestionBreakdown(questions: unknown[], selectedIds: string[] | null) {
  if (!Array.isArray(questions) || questions.length === 0) return { typeCounts: {} as Record<string, number>, diffCounts: {} as Record<string, number> }
  const set = selectedIds && selectedIds.length > 0 ? new Set(selectedIds) : null
  const typeCounts: Record<string, number> = {}
  const diffCounts: Record<string, number> = {}
  for (const q of questions as { id?: string; type?: string; difficulty?: string }[]) {
    if (set && q.id != null && !set.has(String(q.id))) continue
    const t = (q.type ?? '').toLowerCase().replace(/-/g, '_')
    if (t) typeCounts[t] = (typeCounts[t] ?? 0) + 1
    const d = (q.difficulty ?? '').toLowerCase()
    if (d) diffCounts[d] = (diffCounts[d] ?? 0) + 1
  }
  return { typeCounts, diffCounts }
}

export interface FinalExamDetailProps {
  finalExam: FinalExamWithSource
  editHref: string
  listHref: string
  onDelete: (id: string) => Promise<{ error?: string | null }>
  onReleaseResults?: (id: string) => Promise<{ error?: string | null }>
  showTeacherInfo?: boolean
  labels?: {
    backTo?: string
    edit?: string
    delete?: string
    releaseResults?: string
    oneAttempt?: string
    resultsHidden?: string
    resultsShown?: string
    questionsFromSources?: string
    duration?: string
    availablePeriod?: string
    classLabel?: string
    teacherLabel?: string
    summaryTitle?: string
    summaryDescription?: string
    primarySource?: string
    moreSources?: string
    deleteConfirm?: string
    defaultTitle?: string
    source?: string
    sources?: string
    byType?: string
    byDifficulty?: string
    typeMC?: string
    typeTF?: string
    typeMS?: string
    typeFill?: string
    diffEasy?: string
    diffMedium?: string
    diffHard?: string
    questionMode?: string
    modeFixedSelection?: string
    modeRandomPool?: string
    questionsPerAttempt?: string
    questionBreakdown?: string
    deleteConfirmTitle?: string
    confirmDelete?: string
    cancel?: string
  }
}

export function FinalExamDetail({
  finalExam,
  editHref,
  listHref,
  onDelete,
  onReleaseResults,
  showTeacherInfo = false,
  labels = {},
}: FinalExamDetailProps) {
  const [deleting, setDeleting] = useState(false)
  const [releasing, setReleasing] = useState(false)

  const t = {
    backTo: labels.backTo ?? 'Back to Final Exams',
    edit: labels.edit ?? 'Edit',
    delete: labels.delete ?? 'Delete',
    releaseResults: labels.releaseResults ?? 'Release results',
    oneAttempt: labels.oneAttempt ?? 'One attempt per student',
    resultsHidden: labels.resultsHidden ?? 'Results hidden until you release',
    resultsShown: labels.resultsShown ?? 'Students see result after finishing',
    questionsFromSources: labels.questionsFromSources ?? 'questions from',
    duration: labels.duration ?? 'Duration',
    availablePeriod: labels.availablePeriod ?? 'Available period',
    classLabel: labels.classLabel ?? 'Class',
    teacherLabel: labels.teacherLabel ?? 'Teacher',
    summaryTitle: labels.summaryTitle ?? 'Summary',
    summaryDescription: labels.summaryDescription ?? 'Declarative overview of what this final exam contains and when it runs.',
    primarySource: labels.primarySource ?? 'Primary source:',
    moreSources: labels.moreSources ?? '+#N# more source exam(s)',
    deleteConfirm: labels.deleteConfirm ?? 'Are you sure you want to delete this final exam?',
    defaultTitle: labels.defaultTitle ?? 'Final exam',
    source: labels.source ?? 'source',
    sources: labels.sources ?? 'sources',
    byType: labels.byType ?? 'By type',
    byDifficulty: labels.byDifficulty ?? 'By difficulty',
    typeMC: labels.typeMC ?? 'MC',
    typeTF: labels.typeTF ?? 'T/F',
    typeMS: labels.typeMS ?? 'MS',
    typeFill: labels.typeFill ?? 'Fill',
    diffEasy: labels.diffEasy ?? 'Easy',
    diffMedium: labels.diffMedium ?? 'Medium',
    diffHard: labels.diffHard ?? 'Hard',
    questionMode: labels.questionMode ?? 'Question mode',
    modeFixedSelection: labels.modeFixedSelection ?? 'Fixed selection',
    modeRandomPool: labels.modeRandomPool ?? 'Randomized from pool',
    questionsPerAttempt: labels.questionsPerAttempt ?? 'Questions per attempt',
    questionBreakdown: labels.questionBreakdown ?? 'Question breakdown',
    deleteConfirmTitle: labels.deleteConfirmTitle ?? 'Delete final exam?',
    confirmDelete: labels.confirmDelete ?? 'Yes, delete',
    cancel: labels.cancel ?? 'Cancel',
  }

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { typeCounts: questionTypeCounts, diffCounts: difficultyCounts } = useMemo(() => {
    const questions = finalExam.source_exam?.questions
    const selectedIds = finalExam.source_entries?.[0]?.selected_question_ids ?? finalExam.selected_question_ids
    return getQuestionBreakdown(Array.isArray(questions) ? questions : [], selectedIds ?? null)
  }, [finalExam.source_exam?.questions, finalExam.source_entries, finalExam.selected_question_ids])

  const totalQuestions =
    finalExam.total_question_count ??
    (finalExam.source_exam?.questions && Array.isArray(finalExam.source_exam.questions)
      ? finalExam.source_exam.questions.length
      : 0)
  const questionMode = finalExam.question_mode === 'random_pool' ? 'random_pool' : 'fixed_selection'
  const modeLabel = questionMode === 'random_pool' ? t.modeRandomPool : t.modeFixedSelection
  const perAttempt =
    questionMode === 'random_pool'
      ? Math.max(1, Math.floor(Number(finalExam.questions_per_attempt) || 1))
      : null
  const sourceCount = finalExam.source_entries?.length ?? 1
  const duration = finalExam.duration_minutes

  const handleDeleteClick = () => setDeleteDialogOpen(true)

  const handleDeleteConfirm = async () => {
    setDeleting(true)
    try {
      await onDelete(finalExam.id)
      setDeleteDialogOpen(false)
      window.location.href = listHref
    } finally {
      setDeleting(false)
    }
  }

  const handleRelease = async () => {
    if (!onReleaseResults) return
    setReleasing(true)
    try {
      await onReleaseResults(finalExam.id)
    } finally {
      setReleasing(false)
    }
  }

  const title = finalExam.title || finalExam.source_exam?.title || t.defaultTitle

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={listHref}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.backTo}
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <Link href={editHref}>
          <Button variant="outline" size="sm">
            <Pencil className="mr-1.5 h-4 w-4" />
            {t.edit}
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeleteClick}
          disabled={deleting}
          className="text-red-600 hover:text-red-700"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
          {t.delete}
        </Button>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => deleting && e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t.deleteConfirmTitle}</DialogTitle>
            <DialogDescription>{t.deleteConfirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              {t.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t.confirmDelete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t.summaryTitle}</CardTitle>
          <CardDescription>
            {t.summaryDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Overview: question count, duration, class, teacher */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-1.5 text-gray-700">
              <ListChecks className="h-4 w-4 shrink-0 text-gray-500" />
              <strong>{totalQuestions}</strong> {t.questionsFromSources} {sourceCount} {sourceCount === 1 ? t.source : t.sources}
            </span>
            {duration != null && (
              <span className="inline-flex items-center gap-1.5 text-gray-700">
                <Clock className="h-4 w-4 shrink-0 text-gray-500" />
                {duration} min
              </span>
            )}
            {finalExam.class_name && (
              <span className="inline-flex items-center gap-1.5 text-gray-700">
                <Users className="h-4 w-4 shrink-0 text-gray-500" />
                {finalExam.class_name}
              </span>
            )}
            {showTeacherInfo && finalExam.created_by_name && (
              <span className="inline-flex items-center gap-1.5 text-gray-700">
                <User className="h-4 w-4 shrink-0 text-gray-500" />
                {finalExam.created_by_name}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{t.questionMode}: {modeLabel}</Badge>
            {perAttempt != null && (
              <Badge variant="outline">
                {t.questionsPerAttempt}: {perAttempt}
              </Badge>
            )}
          </div>

          {/* Question breakdown: type and difficulty */}
          {(TYPE_KEYS.some((k) => (questionTypeCounts[k] ?? 0) > 0) || DIFF_KEYS.some((k) => (difficultyCounts[k] ?? 0) > 0)) && (
            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t.questionBreakdown}
              </p>
              {TYPE_KEYS.some((k) => (questionTypeCounts[k] ?? 0) > 0) && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" />
                    {t.byType}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {TYPE_KEYS.map((key) => {
                      const n = questionTypeCounts[key] ?? 0
                      if (n === 0) return null
                      const label = { multiple_choice: t.typeMC, true_false: t.typeTF, multiple_select: t.typeMS, fill_blank: t.typeFill }[key] ?? key
                      return (
                        <span
                          key={key}
                          className={getQuestionTypeBadgeClass(key, 'md')}
                        >
                          {label} {n}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
              {DIFF_KEYS.some((k) => (difficultyCounts[k] ?? 0) > 0) && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                    <BarChart3 className="h-3.5 w-3.5" />
                    {t.byDifficulty}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {DIFF_KEYS.map((key) => {
                      const n = difficultyCounts[key] ?? 0
                      if (n === 0) return null
                      const label = { easy: t.diffEasy, medium: t.diffMedium, hard: t.diffHard }[key] ?? key
                      return (
                        <span
                          key={key}
                          className={getDifficultyBadgeClass(key, 'md')}
                        >
                          {label} {n}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Availability */}
          <div>
            <p className="text-sm font-medium text-gray-700">{t.availablePeriod}</p>
            <p className="text-sm text-gray-600">
              {formatDate(finalExam.start_time)} – {formatDate(finalExam.end_time)}
            </p>
          </div>

          {/* Attempts & results */}
          <div className="flex flex-wrap gap-2">
            {finalExam.one_attempt_per_student && (
              <Badge variant="secondary">{t.oneAttempt}</Badge>
            )}
            {finalExam.show_result_to_student === false ? (
              <>
                <Badge variant="outline">{t.resultsHidden}</Badge>
                {onReleaseResults && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRelease}
                    disabled={releasing}
                  >
                    {releasing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    {t.releaseResults}
                  </Button>
                )}
              </>
            ) : (
              <Badge variant="outline" className="border-green-200 text-green-700">
                {t.resultsShown}
              </Badge>
            )}
          </div>

          {/* Source exam(s) */}
          {finalExam.source_exam && (
            <p className="text-sm text-gray-600 border-t border-gray-100 pt-3">
              {t.primarySource} {finalExam.source_exam.title}
              {finalExam.source_entries && finalExam.source_entries.length > 1 && (
                <> · {t.moreSources.replace('#N#', String(finalExam.source_entries.length - 1))}</>
              )}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
