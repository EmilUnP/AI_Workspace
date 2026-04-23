'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { cn } from '../../lib/utils'
import type { CreateFinalExamInput, FinalExamSourceEntry } from '@eduator/core/types/final-exam'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  FileText,
  Settings,
} from 'lucide-react'
import { FinalExamPreview } from './final-exam-preview'
import { getQuestionTypeBadgeClass, getDifficultyBadgeClass } from './badge-classes'

export interface SourceExamOption {
  id: string
  title: string
  duration_minutes: number | null
  question_count: number
  created_by?: string
  created_by_name?: string | null
}

export interface ClassOption {
  id: string
  name: string
}

export type QuestionTypeLabel = 'multiple_choice' | 'true_false' | 'multiple_select' | 'fill_blank'
export type DifficultyLabel = 'easy' | 'medium' | 'hard'

export interface QuestionOption {
  id: string
  question: string
  order: number
  text?: string
  type?: QuestionTypeLabel | string
  difficulty?: DifficultyLabel | string
}

function getQuestionDisplay(q: QuestionOption): string {
  const raw = (q.question ?? (q as { text?: string }).text ?? '').trim()
  if (!raw) return ''
  return raw
}

export interface TeacherOption {
  id: string
  full_name: string
  exam_count: number
}

export interface FinalExamCreatePageProps {
  sourceExams: SourceExamOption[]
  classes: ClassOption[]
  teachers?: TeacherOption[]
  selectedTeacherId?: string
  onLoadSourceExam: (examId: string) => Promise<QuestionOption[]>
  onCreateFinalExam: (input: CreateFinalExamInput) => Promise<{ error?: string | null }>
  listHref: string
  /** When true, show teacher dropdown to filter source exams. */
  showTeacherFilter?: boolean
  labels?: {
    title?: string
    backTo?: string
    addSourceExam?: string
    sourceExam?: string
    selectQuestions?: string
    selectAll?: string
    unselectAll?: string
    titleOverride?: string
    titlePlaceholder?: string
    selectClass?: string
    selectClassOption?: string
    availableFrom?: string
    availableTo?: string
    oneAttemptPerStudent?: string
    showResultToStudent?: string
    showResultToStudentHelp?: string
    durationMinutes?: string
    durationMinutesHelp?: string
    questionMode?: string
    fixedSelectionMode?: string
    randomPoolMode?: string
    questionsPerAttempt?: string
    questionsPerAttemptHelp?: string
    questionsPerAttemptPlaceholder?: string
    poolSizeLabel?: string
    selectTeacher?: string
    selectTeacherOption?: string
    selectExamOption?: string
    selectTeacherFirst?: string
    create?: string
    creating?: string
    cancel?: string
    loadingQuestions?: string
    sourceExamsSectionTitle?: string
    sourceExamsSectionDesc?: string
    settingsTitle?: string
    filterByTeacherTitle?: string
    filterByTeacherDesc1?: string
    filterByTeacherDesc2?: string
    errorSelectClassAndPeriod?: string
    errorEndAfterStart?: string
    errorAddSourceAndQuestions?: string
    errorPerAttemptRequired?: string
    previewHeading?: string
    previewSubheading?: string
    previewQuestions?: string
    previewDuration?: string
    previewSources?: string
    previewOneAttempt?: string
    previewFrom?: string
    previewDefaultTitle?: string
    previewTitleOptionalHint?: string
    byType?: string
    byDifficulty?: string
    typeMC?: string
    typeTF?: string
    typeMS?: string
    typeFill?: string
    diffEasy?: string
    diffMedium?: string
    diffHard?: string
    selectedCount?: string
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

export function FinalExamCreatePage({
  sourceExams,
  classes,
  teachers = [],
  selectedTeacherId = '',
  onLoadSourceExam,
  onCreateFinalExam,
  listHref,
  showTeacherFilter = false,
  labels = {},
}: FinalExamCreatePageProps) {
  const [sourceRows, setSourceRows] = useState<SourceRow[]>([])
  const [titleOverride, setTitleOverride] = useState('')
  const [classId, setClassId] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [durationMinutes, setDurationMinutes] = useState<number | ''>('')
  const [questionMode, setQuestionMode] = useState<'fixed_selection' | 'random_pool'>('fixed_selection')
  const [questionsPerAttempt, setQuestionsPerAttempt] = useState<number | ''>('')
  const [oneAttempt, setOneAttempt] = useState(true)
  const [showResultToStudent, setShowResultToStudent] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const t = {
    title: labels.title ?? 'Create final exam',
    backTo: labels.backTo ?? 'Back to Final Exams',
    addSourceExam: labels.addSourceExam ?? 'Add source exam',
    sourceExam: labels.sourceExam ?? 'Source exam',
    selectQuestions: labels.selectQuestions ?? 'Select questions (leave all to use full exam)',
    selectAll: labels.selectAll ?? 'Select all',
    unselectAll: labels.unselectAll ?? 'Unselect all',
    titleOverride: labels.titleOverride ?? 'Title (optional)',
    titlePlaceholder: labels.titlePlaceholder ?? 'e.g. Math Final – Spring 2025',
    selectClass: labels.selectClass ?? 'Class',
    selectClassOption: labels.selectClassOption ?? 'Select class',
    availableFrom: labels.availableFrom ?? 'Available from',
    availableTo: labels.availableTo ?? 'Available to',
    oneAttemptPerStudent: labels.oneAttemptPerStudent ?? 'One attempt per student',
    showResultToStudent: labels.showResultToStudent ?? 'Students see result after finishing',
    showResultToStudentHelp:
      labels.showResultToStudentHelp ??
      'If unchecked, results are hidden until you release them (teacher/ERP or school admin/ERP).',
    durationMinutes: labels.durationMinutes ?? 'Duration (minutes)',
    durationMinutesHelp: labels.durationMinutesHelp ?? 'Time limit for the exam (e.g. 35, 60).',
    questionMode: labels.questionMode ?? 'Question mode',
    fixedSelectionMode: labels.fixedSelectionMode ?? 'Fixed selection (same questions for everyone)',
    randomPoolMode: labels.randomPoolMode ?? 'Randomized from pool (different set per student)',
    questionsPerAttempt: labels.questionsPerAttempt ?? 'Questions per final exam attempt',
    questionsPerAttemptHelp:
      labels.questionsPerAttemptHelp ??
      'Students receive this many random non-duplicate questions from the selected pool.',
    questionsPerAttemptPlaceholder: labels.questionsPerAttemptPlaceholder ?? 'e.g. 30',
    poolSizeLabel: labels.poolSizeLabel ?? 'Pool size: {count}',
    selectTeacher: labels.selectTeacher ?? 'Teacher',
    selectTeacherOption: labels.selectTeacherOption ?? 'Select teacher',
    selectExamOption: labels.selectExamOption ?? 'Select an exam',
    selectTeacherFirst: labels.selectTeacherFirst ?? 'Select teacher first',
    create: labels.create ?? 'Create final exam',
    creating: labels.creating ?? 'Creating…',
    cancel: labels.cancel ?? 'Cancel',
    loadingQuestions: labels.loadingQuestions ?? 'Loading questions…',
    sourceExamsSectionTitle: labels.sourceExamsSectionTitle ?? 'Source exams & questions',
    sourceExamsSectionDesc: labels.sourceExamsSectionDesc ?? 'Add one or more exams. From each exam, choose which questions to include.',
    settingsTitle: labels.settingsTitle ?? 'Settings',
    filterByTeacherTitle: labels.filterByTeacherTitle ?? 'Filter source exams by teacher',
    filterByTeacherDesc1: labels.filterByTeacherDesc1 ?? 'Showing exams for the teacher selected on the list page.',
    filterByTeacherDesc2: labels.filterByTeacherDesc2 ?? "Select a teacher on the Final Exams list page, then open Create.",
    errorSelectClassAndPeriod: labels.errorSelectClassAndPeriod ?? 'Please select class and set availability period.',
    errorEndAfterStart: labels.errorEndAfterStart ?? 'End time must be after start time.',
    errorAddSourceAndQuestions: labels.errorAddSourceAndQuestions ?? 'Add at least one source exam and select at least one question.',
    errorPerAttemptRequired:
      labels.errorPerAttemptRequired ??
      'Set a valid "questions per attempt" value for randomized mode.',
    previewHeading: labels.previewHeading ?? 'How it will look for students',
    previewSubheading: labels.previewSubheading ?? 'When they open this final exam they will see:',
    previewQuestions: labels.previewQuestions ?? 'questions',
    previewDuration: labels.previewDuration ?? 'min',
    previewSources: labels.previewSources ?? 'source exams',
    previewOneAttempt: labels.previewOneAttempt ?? 'One attempt',
    previewFrom: labels.previewFrom ?? 'From',
    previewDefaultTitle: labels.previewDefaultTitle ?? 'Final exam',
    previewTitleOptionalHint: labels.previewTitleOptionalHint ?? 'Set a custom name in Settings (optional)',
    byType: labels.byType ?? 'By type',
    byDifficulty: labels.byDifficulty ?? 'By difficulty',
    typeMC: labels.typeMC ?? 'MC',
    typeTF: labels.typeTF ?? 'T/F',
    typeMS: labels.typeMS ?? 'MS',
    typeFill: labels.typeFill ?? 'Fill',
    diffEasy: labels.diffEasy ?? 'Easy',
    diffMedium: labels.diffMedium ?? 'Medium',
    diffHard: labels.diffHard ?? 'Hard',
    selectedCount: labels.selectedCount ?? 'selected',
  }

  const questionTypeShort: Record<string, string> = {
    multiple_choice: t.typeMC,
    true_false: t.typeTF,
    multiple_select: t.typeMS,
    fill_blank: t.typeFill,
  }

  const difficultyShort: Record<string, string> = {
    easy: t.diffEasy,
    medium: t.diffMedium,
    hard: t.diffHard,
  }

  const poolSizeTemplate =
    t.poolSizeLabel.startsWith('(') && t.poolSizeLabel.includes('.')
      ? 'Pool size: {count}'
      : t.poolSizeLabel

  const loadQuestionsForRow = useCallback(
    async (rowId: string, examId: string) => {
      setSourceRows((prev) =>
        prev.map((r) =>
          r.id === rowId ? { ...r, loading: true, examId, questions: [], questionIds: [] } : r
        )
      )
      try {
        const list = await onLoadSourceExam(examId)
        setSourceRows((prev) =>
          prev.map((r) =>
            r.id === rowId
              ? {
                  ...r,
                  loading: false,
                  questions: list,
                  questionIds: list.map((q) => q.id),
                }
              : r
          )
        )
      } catch {
        setSourceRows((prev) =>
          prev.map((r) =>
            r.id === rowId ? { ...r, loading: false, questions: [], questionIds: [] } : r
          )
        )
      }
    },
    [onLoadSourceExam]
  )

  const addSourceRow = () => {
    const id = generateRowId()
    setSourceRows((prev) => [...prev, { id, teacherId: '', examId: '', questionIds: [], questions: [], loading: false }])
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
      prev.map((r) =>
        r.id === rowId ? { ...r, questionIds: r.questions.map((q) => q.id) } : r
      )
    )
  }

  const unselectAllRowQuestions = (rowId: string) => {
    setSourceRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, questionIds: [] } : r
      )
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

    setSubmitting(true)
    setError(null)

    try {
      const sourceEntries: FinalExamSourceEntry[] = validRows.map((r) => ({
        exam_id: r.examId,
        selected_question_ids: r.questionIds,
      }))

      const input: CreateFinalExamInput = {
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
        title: titleOverride.trim() || null,
      }

      if (sourceEntries.length === 1) {
        input.source_exam_id = sourceEntries[0].exam_id
        input.selected_question_ids = sourceEntries[0].selected_question_ids
      } else {
        input.source_entries = sourceEntries
      }

      const result = await onCreateFinalExam(input)
      if (result.error) {
        setError(result.error)
      } else {
        window.location.href = listHref
      }
    } finally {
      setSubmitting(false)
    }
  }

  const validRows = sourceRows.filter((r) => r.examId && r.questionIds.length > 0)
  const totalQuestions = validRows.reduce((sum, r) => sum + r.questionIds.length, 0)
  const randomizedQuestionsPerAttempt = questionMode === 'random_pool'
    ? Math.max(1, Math.min(Math.floor(Number(questionsPerAttempt) || 0), Math.max(1, totalQuestions)))
    : null
  const previewQuestionCount = randomizedQuestionsPerAttempt ?? totalQuestions
  const sourceCount = validRows.length
  const previewTitle = titleOverride.trim() || (validRows.length === 1 ? sourceExams.find((e) => e.id === validRows[0].examId)?.title : null) || ''
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
        href={listHref}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.backTo}
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>

      {showTeacherFilter && teachers.length > 0 && (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">{t.filterByTeacherTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            {selectedTeacherId ? t.filterByTeacherDesc1 : t.filterByTeacherDesc2}
          </p>
        </CardContent>
      </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
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
              className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3"
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
                  <label className="mb-1 block text-sm font-medium text-gray-700">{t.selectTeacher}</label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={row.teacherId}
                    onChange={(e) => setRowTeacherId(row.id, e.target.value)}
                  >
                    <option value="">{t.selectTeacherOption}</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.full_name} ({teacher.exam_count} exams)
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
                <option value="">{showTeacherFilter && teachers.length > 0 && !row.teacherId ? t.selectTeacherFirst : t.selectExamOption}</option>
                {examsForRow.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} ({e.question_count} questions)
                  </option>
                ))}
              </select>

              {row.examId && (
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{t.selectQuestions}</span>
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
                    <p className="text-sm text-gray-500 flex items-center gap-2">
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
          )})}

          <Button type="button" variant="outline" onClick={addSourceRow} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            {t.addSourceExam}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t.settingsTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t.titleOverride}</label>
            <Input
              value={titleOverride}
              onChange={(e) => setTitleOverride(e.target.value)}
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
            <label className="mb-1 block text-sm font-medium text-gray-700">{t.durationMinutes}</label>
            <Input
              type="number"
              min={1}
              max={300}
              placeholder="e.g. 35 or 60"
              value={durationMinutes === '' ? '' : durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value === '' ? '' : parseInt(e.target.value, 10) || '')}
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
                  placeholder={t.questionsPerAttemptPlaceholder}
                  value={questionsPerAttempt === '' ? '' : questionsPerAttempt}
                  onChange={(e) =>
                    setQuestionsPerAttempt(e.target.value === '' ? '' : parseInt(e.target.value, 10) || '')
                  }
                />
                <p className="mt-0.5 text-xs text-gray-500">
                  {t.questionsPerAttemptHelp} {totalQuestions > 0 ? `(${poolSizeTemplate.replace('{count}', String(totalQuestions))})` : ''}
                </p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t.availableFrom}</label>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t.availableTo}</label>
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
          <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3">
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={showResultToStudent}
                onChange={(e) => setShowResultToStudent(e.target.checked)}
              />
              <span className="text-sm font-medium text-gray-700">{t.showResultToStudent}</span>
            </label>
            <p className="mt-1 text-xs text-gray-600">{t.showResultToStudentHelp}</p>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Link href={listHref}>
          <Button variant="outline" disabled={submitting}>
            {t.cancel}
          </Button>
        </Link>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.creating}
            </>
          ) : (
            t.create
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
            showTitleHint={!titleOverride.trim()}
            questionTypeCounts={questionTypeCounts}
            difficultyCounts={difficultyCounts}
            labels={{
              heading: t.previewHeading,
              subheading: t.previewSubheading,
              questions: t.previewQuestions,
              duration: t.previewDuration,
              sources: t.previewSources,
              oneAttempt: t.previewOneAttempt,
              fromPrefix: t.previewFrom ? `${t.previewFrom} ` : 'From ',
              defaultTitle: t.previewDefaultTitle,
              titleOptionalHint: t.previewTitleOptionalHint,
              byType: t.byType,
              byDifficulty: t.byDifficulty,
              typeMC: t.typeMC,
              typeTF: t.typeTF,
              typeMS: t.typeMS,
              typeFill: t.typeFill,
              diffEasy: t.diffEasy,
              diffMedium: t.diffMedium,
              diffHard: t.diffHard,
            }}
          />
        </div>
      </div>
    </div>
  )
}
