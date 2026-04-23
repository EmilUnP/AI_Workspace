'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { cn } from '../../lib/utils'
import type { FinalExamWithSource } from '@eduator/core/types/final-exam'
import type { UpdateFinalExamInput, FinalExamSourceEntry } from '@eduator/core/types/final-exam'
import { ArrowLeft, Loader2, FileText, Plus, Trash2, Settings } from 'lucide-react'
import { FinalExamPreview } from './final-exam-preview'
import { getQuestionTypeBadgeClass, getDifficultyBadgeClass } from './badge-classes'

export interface ClassOption {
  id: string
  name: string
}

export interface SourceExamOption {
  id: string
  title: string
  duration_minutes: number | null
  question_count: number
  created_by?: string
  created_by_name?: string | null
}

export interface QuestionOption {
  id: string
  question: string
  order: number
  text?: string
  type?: string
  difficulty?: string
}

function getQuestionDisplay(q: QuestionOption): string {
  const raw = (q.question ?? (q as { text?: string }).text ?? '').trim()
  return raw
}

function getQuestionTypeShort(labels: { typeMC?: string; typeTF?: string; typeMS?: string; typeFill?: string }): Record<string, string> {
  return {
    multiple_choice: labels.typeMC ?? 'MC',
    true_false: labels.typeTF ?? 'T/F',
    multiple_select: labels.typeMS ?? 'MS',
    fill_blank: labels.typeFill ?? 'Fill',
  }
}

function getDifficultyShort(labels: { difficultyEasy?: string; difficultyMedium?: string; difficultyHard?: string }): Record<string, string> {
  return {
    easy: labels.difficultyEasy ?? 'Easy',
    medium: labels.difficultyMedium ?? 'Medium',
    hard: labels.difficultyHard ?? 'Hard',
  }
}

export interface TeacherOption {
  id: string
  full_name: string
  exam_count: number
}

export interface FinalExamEditPageProps {
  finalExam: FinalExamWithSource
  classes: ClassOption[]
  onUpdateFinalExam: (id: string, input: UpdateFinalExamInput) => Promise<{ error?: string | null }>
  listHref: string
  detailHref: string
  /** When provided, show full form with source exams and question selection (edit questions). */
  sourceExams?: SourceExamOption[]
  teachers?: TeacherOption[]
  showTeacherFilter?: boolean
  onLoadSourceExam?: (examId: string) => Promise<QuestionOption[]>
  labels?: {
    title?: string
    backTo?: string
    save?: string
    saving?: string
    cancel?: string
    titleOverride?: string
    titlePlaceholder?: string
    selectClass?: string
    selectClassOption?: string
    availableFrom?: string
    availableTo?: string
    durationMinutes?: string
    durationMinutesHelp?: string
    questionMode?: string
    fixedSelectionMode?: string
    randomPoolMode?: string
    questionsPerAttempt?: string
    questionsPerAttemptHelp?: string
    oneAttemptPerStudent?: string
    showResultToStudent?: string
    addSourceExam?: string
    sourceExam?: string
    selectQuestions?: string
    selectAll?: string
    unselectAll?: string
    sourceExamsSectionTitle?: string
    sourceExamsSectionDesc?: string
    settingsTitle?: string
    selectTeacher?: string
    selectTeacherOption?: string
    selectExamOption?: string
    selectTeacherFirst?: string
    loadingQuestions?: string
    errorSelectClassAndPeriod?: string
    errorEndAfterStart?: string
    errorAddSourceAndQuestions?: string
    errorPerAttemptRequired?: string
    previewDefaultTitle?: string
    previewHeading?: string
    previewSubheading?: string
    previewQuestions?: string
    previewDuration?: string
    previewSources?: string
    previewOneAttempt?: string
    previewFrom?: string
    previewTitleOptionalHint?: string
    durationPlaceholder?: string
    selectedCount?: string
    selectedBadge?: string
    examsCount?: string
    questionsCount?: string
    typeMC?: string
    typeTF?: string
    typeMS?: string
    typeFill?: string
    difficultyEasy?: string
    difficultyMedium?: string
    difficultyHard?: string
    byType?: string
    byDifficulty?: string
  }
}

interface SourceRow {
  id: string
  teacherId: string
  examId: string
  questionIds: string[]
  questions: QuestionOption[]
  loading: boolean
}

function generateRowId() {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function buildInitialRows(finalExam: FinalExamWithSource): SourceRow[] {
  const entries = (finalExam as { source_entries?: FinalExamSourceEntry[] }).source_entries
  if (Array.isArray(entries) && entries.length > 0) {
    return entries.map((e) => ({
      id: generateRowId(),
      teacherId: '',
      examId: e.exam_id,
      questionIds: e.selected_question_ids ?? [],
      questions: [],
      loading: true,
    }))
  }
  return [
    {
      id: generateRowId(),
      teacherId: '',
      examId: finalExam.source_exam_id,
      questionIds: finalExam.selected_question_ids ?? [],
      questions: [],
      loading: true,
    },
  ]
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

export function FinalExamEditPage({
  finalExam,
  classes,
  onUpdateFinalExam,
  listHref: _listHref,
  detailHref,
  sourceExams = [],
  teachers = [],
  showTeacherFilter = false,
  onLoadSourceExam,
  labels = {},
}: FinalExamEditPageProps) {
  const [title, setTitle] = useState(finalExam.title ?? '')
  const [classId, setClassId] = useState(finalExam.class_id ?? '')
  const [startTime, setStartTime] = useState(toDatetimeLocal(finalExam.start_time))
  const [endTime, setEndTime] = useState(toDatetimeLocal(finalExam.end_time))
  const [durationMinutes, setDurationMinutes] = useState<number | ''>(
    finalExam.duration_minutes != null ? finalExam.duration_minutes : ''
  )
  const [questionMode, setQuestionMode] = useState<'fixed_selection' | 'random_pool'>(
    finalExam.question_mode === 'random_pool' ? 'random_pool' : 'fixed_selection'
  )
  const [questionsPerAttempt, setQuestionsPerAttempt] = useState<number | ''>(
    finalExam.questions_per_attempt != null ? finalExam.questions_per_attempt : ''
  )
  const [oneAttempt, setOneAttempt] = useState(finalExam.one_attempt_per_student)
  const [showResultToStudent, setShowResultToStudent] = useState(
    finalExam.show_result_to_student !== false
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasFullForm = Boolean(onLoadSourceExam)
  const [sourceRows, setSourceRows] = useState<SourceRow[]>(() =>
    onLoadSourceExam ? buildInitialRows(finalExam) : []
  )

  const t = {
    title: labels.title ?? 'Edit final exam',
    backTo: labels.backTo ?? 'Back to Final Exams',
    save: labels.save ?? 'Save changes',
    saving: labels.saving ?? 'Saving…',
    titleOverride: labels.titleOverride ?? 'Title (optional)',
    titlePlaceholder: labels.titlePlaceholder ?? 'e.g. Math Final – Spring 2025',
    selectClass: labels.selectClass ?? 'Class',
    selectClassOption: labels.selectClassOption ?? 'Select class',
    availableFrom: labels.availableFrom ?? 'Available from',
    availableTo: labels.availableTo ?? 'Available to',
    durationMinutes: labels.durationMinutes ?? 'Duration (minutes)',
    durationMinutesHelp: labels.durationMinutesHelp ?? 'Time limit for the exam (e.g. 35, 60).',
    questionMode: labels.questionMode ?? 'Question mode',
    fixedSelectionMode: labels.fixedSelectionMode ?? 'Fixed selection (same questions for everyone)',
    randomPoolMode: labels.randomPoolMode ?? 'Randomized from pool (different set per student)',
    questionsPerAttempt: labels.questionsPerAttempt ?? 'Questions per final exam attempt',
    questionsPerAttemptHelp:
      labels.questionsPerAttemptHelp ??
      'Students receive this many random non-duplicate questions from the selected pool.',
    oneAttemptPerStudent: labels.oneAttemptPerStudent ?? 'One attempt per student',
    showResultToStudent: labels.showResultToStudent ?? 'Students see result after finishing',
    addSourceExam: labels.addSourceExam ?? 'Add source exam',
    sourceExam: labels.sourceExam ?? 'Source exam',
    selectQuestions: labels.selectQuestions ?? 'Select questions (leave all to use full exam)',
    selectAll: labels.selectAll ?? 'Select all',
    unselectAll: labels.unselectAll ?? 'Unselect all',
    sourceExamsSectionTitle: labels.sourceExamsSectionTitle ?? 'Source exams & questions',
    sourceExamsSectionDesc: labels.sourceExamsSectionDesc ?? 'Change which exams and questions are included.',
    settingsTitle: labels.settingsTitle ?? 'Settings',
    selectTeacher: labels.selectTeacher ?? 'Teacher',
    selectTeacherOption: labels.selectTeacherOption ?? 'Select teacher',
    selectExamOption: labels.selectExamOption ?? 'Select an exam',
    selectTeacherFirst: labels.selectTeacherFirst ?? 'Select teacher first',
    loadingQuestions: labels.loadingQuestions ?? 'Loading questions…',
    cancel: labels.cancel ?? 'Cancel',
    errorSelectClassAndPeriod: labels.errorSelectClassAndPeriod ?? 'Please select class and set availability period.',
    errorEndAfterStart: labels.errorEndAfterStart ?? 'End time must be after start time.',
    errorAddSourceAndQuestions: labels.errorAddSourceAndQuestions ?? 'Add at least one source exam and select at least one question.',
    errorPerAttemptRequired:
      labels.errorPerAttemptRequired ??
      'Set a valid "questions per attempt" value for randomized mode.',
    previewDefaultTitle: labels.previewDefaultTitle ?? 'Final exam',
    previewHeading: labels.previewHeading ?? 'How it will look for students',
    previewSubheading: labels.previewSubheading ?? 'When they open this final exam they will see:',
    previewQuestions: labels.previewQuestions ?? 'questions',
    previewDuration: labels.previewDuration ?? 'min',
    previewSources: labels.previewSources ?? 'source exams',
    previewOneAttempt: labels.previewOneAttempt ?? 'One attempt',
    previewFrom: labels.previewFrom ?? 'From',
    previewTitleOptionalHint: labels.previewTitleOptionalHint ?? 'Set a custom name in Settings (optional)',
    durationPlaceholder: labels.durationPlaceholder ?? 'e.g. 35 or 60',
    selectedCount: labels.selectedCount ?? 'selected',
    examsCount: labels.examsCount ?? 'exams',
    questionsCount: labels.questionsCount ?? 'questions',
    typeMC: labels.typeMC ?? 'MC',
    typeTF: labels.typeTF ?? 'T/F',
    typeMS: labels.typeMS ?? 'MS',
    typeFill: labels.typeFill ?? 'Fill',
    difficultyEasy: labels.difficultyEasy ?? 'Easy',
    difficultyMedium: labels.difficultyMedium ?? 'Medium',
    difficultyHard: labels.difficultyHard ?? 'Hard',
    byType: labels.byType ?? 'By type',
    byDifficulty: labels.byDifficulty ?? 'By difficulty',
  }
  const questionTypeShort = getQuestionTypeShort(t)
  const difficultyShort = getDifficultyShort(t)

  useEffect(() => {
    if (!onLoadSourceExam || sourceRows.length === 0) return
    const toLoad = sourceRows.filter((r) => r.loading && r.examId)
    if (toLoad.length === 0) return
    let cancelled = false
    Promise.all(
      toLoad.map(async (r) => ({ rowId: r.id, questions: await onLoadSourceExam(r.examId) }))
    ).then((results) => {
      if (cancelled) return
      setSourceRows((prev) =>
        prev.map((row) => {
          const res = results.find((x) => x.rowId === row.id)
          if (!res) return row
          const keepIds = row.questionIds.filter((id) => res.questions.some((q) => q.id === id))
          return { ...row, questions: res.questions, questionIds: keepIds, loading: false }
        })
      )
    })
    return () => {
      cancelled = true
    }
  }, [finalExam.id, onLoadSourceExam])

  const loadQuestionsForRow = useCallback(
    (rowId: string, examId: string) => {
      if (!onLoadSourceExam) return
      setSourceRows((prev) =>
        prev.map((r) =>
          r.id === rowId ? { ...r, loading: true, examId, questions: [], questionIds: [] } : r
        )
      )
      onLoadSourceExam(examId)
        .then((list) =>
          setSourceRows((prev) =>
            prev.map((r) =>
              r.id === rowId
                ? { ...r, loading: false, questions: list, questionIds: list.map((q) => q.id) }
                : r
            )
          )
        )
        .catch(() =>
          setSourceRows((prev) =>
            prev.map((r) =>
              r.id === rowId ? { ...r, loading: false, questions: [], questionIds: [] } : r
            )
          )
        )
    },
    [onLoadSourceExam]
  )

  const addSourceRow = () => {
    setSourceRows((prev) => [
      ...prev,
      {
        id: generateRowId(),
        teacherId: '',
        examId: '',
        questionIds: [],
        questions: [],
        loading: false,
      },
    ])
  }

  const removeSourceRow = (rowId: string) => {
    setSourceRows((prev) => prev.filter((r) => r.id !== rowId))
  }

  const setRowTeacherId = (rowId: string, teacherId: string) => {
    setSourceRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, teacherId, examId: '', questions: [], questionIds: [] } : r
      )
    )
  }

  const setRowExamId = (rowId: string, examId: string) => {
    if (!examId) {
      setSourceRows((prev) =>
        prev.map((r) =>
          r.id === rowId ? { ...r, examId: '', questions: [], questionIds: [] } : r
        )
      )
      return
    }
    loadQuestionsForRow(rowId, examId)
  }

  const getExamsForRow = (row: SourceRow) => {
    let list = sourceExams
    if (showTeacherFilter && row.teacherId) {
      list = sourceExams.filter((e) => e.created_by === row.teacherId)
    }
    // Exclude exams already selected in another row (prevent same exam twice)
    const otherRowExamIds = new Set(
      sourceRows.filter((r) => r.id !== row.id && r.examId).map((r) => r.examId)
    )
    return list.filter((e) => e.id === row.examId || !otherRowExamIds.has(e.id))
  }

  const toggleRowQuestion = (rowId: string, qId: string) => {
    setSourceRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r
        const next = new Set(r.questionIds)
        if (next.has(qId)) next.delete(qId)
        else next.add(qId)
        return { ...r, questionIds: Array.from(next) }
      })
    )
  }

  const selectAllRowQuestions = (rowId: string) => {
    setSourceRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, questionIds: r.questions.map((q) => q.id) } : r))
    )
  }

  const unselectAllRowQuestions = (rowId: string) => {
    setSourceRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, questionIds: [] } : r))
    )
  }

  const handleSubmit = async () => {
    if (!classId || !startTime || !endTime) {
      setError(t.errorSelectClassAndPeriod)
      return
    }
    if (new Date(startTime) >= new Date(endTime)) {
      setError(t.errorEndAfterStart)
      return
    }
    if (hasFullForm) {
      const validRows = sourceRows.filter((r) => r.examId && r.questionIds.length > 0)
      if (validRows.length === 0) {
        setError(t.errorAddSourceAndQuestions)
        return
      }
      const poolSize = validRows.reduce((sum, r) => sum + r.questionIds.length, 0)
      if (questionMode === 'random_pool') {
        const perAttempt = Math.floor(Number(questionsPerAttempt) || 0)
        if (perAttempt <= 0 || perAttempt > poolSize) {
          setError(`${t.errorPerAttemptRequired} (1-${poolSize})`)
          return
        }
      }
    }
    setSubmitting(true)
    setError(null)
    try {
      const input: UpdateFinalExamInput = {
        title: title.trim() || null,
        class_id: classId,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        duration_minutes: durationMinutes === '' ? null : Number(durationMinutes),
        question_mode: questionMode,
        questions_per_attempt:
          questionMode === 'random_pool'
            ? Math.floor(Number(questionsPerAttempt) || 0)
            : null,
        one_attempt_per_student: oneAttempt,
        show_result_to_student: showResultToStudent,
      }
      if (hasFullForm) {
        const validRows = sourceRows.filter((r) => r.examId && r.questionIds.length > 0)
        input.source_entries = validRows.map((r) => ({
          exam_id: r.examId,
          selected_question_ids: r.questionIds,
        }))
      }
      const result = await onUpdateFinalExam(finalExam.id, input)
      if (result.error) {
        setError(result.error)
      } else {
        window.location.href = detailHref
      }
    } finally {
      setSubmitting(false)
    }
  }

  const validRows = sourceRows.filter((r) => r.examId && r.questionIds.length > 0)
  const totalQuestions = hasFullForm
    ? validRows.reduce((sum, r) => sum + r.questionIds.length, 0)
    : (finalExam.total_question_count ?? 0)
  const randomizedQuestionsPerAttempt = questionMode === 'random_pool'
    ? Math.max(1, Math.min(Math.floor(Number(questionsPerAttempt) || 0), Math.max(1, totalQuestions)))
    : null
  const previewQuestionCount = randomizedQuestionsPerAttempt ?? totalQuestions
  const sourceCount = hasFullForm ? validRows.length : 1
  const previewTitle =
    title.trim() ||
    (finalExam.source_exam as { title?: string } | undefined)?.title ||
    ''
  const previewDuration = durationMinutes === '' ? null : Number(durationMinutes)

  const { questionTypeCounts, difficultyCounts } = (() => {
    const typeCounts: Record<string, number> = {}
    const diffCounts: Record<string, number> = {}
    validRows.forEach((row) => {
      const selectedSet = new Set(row.questionIds)
      row.questions.forEach((q) => {
        if (!selectedSet.has(q.id)) return
        const t = (q.type ?? '').toLowerCase().replace(/-/g, '_')
        if (t) typeCounts[t] = (typeCounts[t] ?? 0) + 1
        const d = (q.difficulty ?? '').toLowerCase()
        if (d) diffCounts[d] = (diffCounts[d] ?? 0) + 1
      })
    })
    return { questionTypeCounts: typeCounts, difficultyCounts: diffCounts }
  })()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={detailHref}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.backTo}
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        <div className="space-y-6">
          {hasFullForm && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  {t.sourceExamsSectionTitle}
                </CardTitle>
                <p className="text-sm text-gray-500">
                  {t.sourceExamsSectionDesc}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {sourceRows.map((row) => {
                  const examsForRow = getExamsForRow(row)
                  return (
                    <div
                      key={row.id}
                      className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-sm font-medium text-gray-700">{t.sourceExam}</label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSourceRow(row.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {showTeacherFilter && teachers.length > 0 && (
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            {t.selectTeacher}
                          </label>
                          <select
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            value={row.teacherId}
                            onChange={(e) => setRowTeacherId(row.id, e.target.value)}
                          >
                            <option value="">{t.selectTeacherOption}</option>
                            {teachers.map((teacher) => (
                              <option key={teacher.id} value={teacher.id}>
                                {teacher.full_name} ({teacher.exam_count} {t.examsCount})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <select
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        value={row.examId}
                        onChange={(e) => setRowExamId(row.id, e.target.value)}
                        disabled={showTeacherFilter && teachers.length > 0 && !row.teacherId}
                      >
                        <option value="">
                          {showTeacherFilter && teachers.length > 0 && !row.teacherId
                            ? t.selectTeacherFirst
                            : t.selectExamOption}
                        </option>
                        {examsForRow.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.title} ({e.question_count} {t.questionsCount})
                          </option>
                        ))}
                      </select>
                      {row.examId && (
                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                              {t.selectQuestions}
                            </span>
                            {row.questions.length > 0 && (
                              <button
                                type="button"
                                className="text-xs text-green-600 hover:underline"
                                onClick={() =>
                                  row.questionIds.length === row.questions.length
                                    ? unselectAllRowQuestions(row.id)
                                    : selectAllRowQuestions(row.id)
                                }
                              >
                                {row.questionIds.length === row.questions.length ? t.unselectAll : t.selectAll}
                              </button>
                            )}
                          </div>
                          {row.loading ? (
                            <p className="flex items-center gap-2 text-sm text-gray-500">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {t.loadingQuestions}
                            </p>
                          ) : row.questions.length > 0 ? (
                            <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2">
                              <p className="text-xs text-gray-500 px-1 pb-0.5">
                                {row.questionIds.length} {t.selectedCount}
                              </p>
                              {row.questions
                                .sort((a, b) => a.order - b.order)
                                .map((q) => {
                                  const isSelected = row.questionIds.includes(q.id)
                                  return (
                                    <label
                                      key={q.id}
                                      className={cn(
                                        'flex cursor-pointer gap-2 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-gray-50',
                                        isSelected
                                          ? 'bg-green-50 border border-green-200 ring-1 ring-green-200/50'
                                          : 'border border-transparent'
                                      )}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleRowQuestion(row.id, q.id)}
                                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <span className="line-clamp-2 text-gray-900">{getQuestionDisplay(q)}</span>
                                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                          {(q.type || q.difficulty) && (
                                            <>
                                              {q.type && (
                                                <span className={getQuestionTypeBadgeClass(q.type ?? '')}>
                                                  {questionTypeShort[(q.type ?? '').toLowerCase().replace(/-/g, '_')] ?? (q.type ?? '—')}
                                                </span>
                                              )}
                                              {q.difficulty && (
                                                <span className={getDifficultyBadgeClass(q.difficulty ?? '')}>
                                                  {difficultyShort[(q.difficulty ?? '').toLowerCase()] ?? (q.difficulty ? String(q.difficulty) : '—')}
                                                </span>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </label>
                                  )
                                })}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )
                })}
                <Button type="button" variant="outline" onClick={addSourceRow} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  {t.addSourceExam}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" />
                {t.settingsTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t.titleOverride}
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.titlePlaceholder}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t.selectClass}</label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                >
                  <option value="">{t.selectClassOption}</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t.durationMinutes}
                </label>
                <Input
                  type="number"
                  min={1}
                  max={300}
                  placeholder={t.durationPlaceholder}
                  value={durationMinutes === '' ? '' : durationMinutes}
                  onChange={(e) =>
                    setDurationMinutes(e.target.value === '' ? '' : parseInt(e.target.value, 10) || '')
                  }
                />
                <p className="mt-0.5 text-xs text-gray-500">{t.durationMinutesHelp}</p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{t.questionMode}</label>
                <label className="flex cursor-pointer items-start gap-2 rounded-md border border-gray-200 bg-white p-2.5">
                  <input
                    type="radio"
                    name="questionMode"
                    checked={questionMode === 'fixed_selection'}
                    onChange={() => setQuestionMode('fixed_selection')}
                  />
                  <span className="text-sm text-gray-700">{t.fixedSelectionMode}</span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 rounded-md border border-gray-200 bg-white p-2.5">
                  <input
                    type="radio"
                    name="questionMode"
                    checked={questionMode === 'random_pool'}
                    onChange={() => setQuestionMode('random_pool')}
                  />
                  <span className="text-sm text-gray-700">{t.randomPoolMode}</span>
                </label>
                {questionMode === 'random_pool' && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">{t.questionsPerAttempt}</label>
                    <Input
                      type="number"
                      min={1}
                      max={Math.max(1, totalQuestions)}
                      placeholder="e.g. 30"
                      value={questionsPerAttempt === '' ? '' : questionsPerAttempt}
                      onChange={(e) =>
                        setQuestionsPerAttempt(e.target.value === '' ? '' : parseInt(e.target.value, 10) || '')
                      }
                    />
                    <p className="mt-0.5 text-xs text-gray-500">
                      {t.questionsPerAttemptHelp} {totalQuestions > 0 ? `(Pool size: ${totalQuestions})` : ''}
                    </p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {t.availableFrom}
                  </label>
                  <Input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {t.availableTo}
                  </label>
                  <Input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={oneAttempt}
                  onChange={(e) => setOneAttempt(e.target.checked)}
                />
                <span className="text-sm font-medium text-gray-700">{t.oneAttemptPerStudent}</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={showResultToStudent}
                  onChange={(e) => setShowResultToStudent(e.target.checked)}
                />
                <span className="text-sm font-medium text-gray-700">{t.showResultToStudent}</span>
              </label>
            </CardContent>
          </Card>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <Link href={detailHref}>
              <Button variant="outline" disabled={submitting}>
                {t.cancel}
              </Button>
            </Link>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.saving}
                </>
              ) : (
                t.save
              )}
            </Button>
          </div>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <FinalExamPreview
            title={previewTitle}
            totalQuestions={previewQuestionCount}
            durationMinutes={previewDuration}
            sourceCount={sourceCount}
            oneAttempt={oneAttempt}
            showTitleHint={!title.trim()}
            questionTypeCounts={questionTypeCounts}
            difficultyCounts={difficultyCounts}
            labels={{
              heading: t.previewHeading,
              subheading: t.previewSubheading,
              questions: t.previewQuestions ?? 'questions',
              duration: t.previewDuration ?? 'min',
              sources: t.previewSources ?? 'source exams',
              oneAttempt: t.previewOneAttempt ?? 'One attempt',
              fromPrefix: t.previewFrom ? `${t.previewFrom} ` : 'From ',
              defaultTitle: t.previewDefaultTitle,
              titleOptionalHint: t.previewTitleOptionalHint ?? 'Set a custom name in Settings (optional)',
              byType: t.byType,
              byDifficulty: t.byDifficulty,
              typeMC: t.typeMC,
              typeTF: t.typeTF,
              typeMS: t.typeMS,
              typeFill: t.typeFill,
              diffEasy: t.difficultyEasy,
              diffMedium: t.difficultyMedium,
              diffHard: t.difficultyHard,
            }}
          />
        </div>
      </div>
    </div>
  )
}
