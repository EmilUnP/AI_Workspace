'use client'

import { useState, useCallback } from 'react'
import { Button } from '../ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card'
import { Badge } from '../ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { cn } from '../../lib/utils'
import type { FinalExamWithSource, CreateFinalExamInput } from '@eduator/core/types/final-exam'
import { FileText, Calendar, Users, Plus, Trash2, Loader2 } from 'lucide-react'

export interface SourceExamOption {
  id: string
  title: string
  duration_minutes: number | null
  question_count: number
}

export interface ClassOption {
  id: string
  name: string
}

export interface CourseOption {
  id: string
  title: string
}

export interface QuestionOption {
  id: string
  question: string
  order: number
  type?: string
  difficulty?: string
}

export interface FinalExamHubProps {
  finalExams: FinalExamWithSource[]
  sourceExams: SourceExamOption[]
  classes: ClassOption[]
  courses?: CourseOption[]
  onLoadSourceExam: (examId: string) => Promise<QuestionOption[]>
  onCreateFinalExam: (input: CreateFinalExamInput) => Promise<{ error?: string | null }>
  onDeleteFinalExam: (id: string) => Promise<{ error?: string | null }>
  labels?: {
    pageTitle?: string
    pageDescription?: string
    generateButton?: string
    noFinalExams?: string
    sourceExam?: string
    selectQuestions?: string
    selectClass?: string
    selectCourse?: string
    availableFrom?: string
    availableTo?: string
    oneAttemptPerStudent?: string
    create?: string
    cancel?: string
  }
}

export function FinalExamHub({
  finalExams,
  sourceExams,
  classes,
  courses = [],
  onLoadSourceExam,
  onCreateFinalExam,
  onDeleteFinalExam,
  labels = {},
}: FinalExamHubProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sourceExamId, setSourceExamId] = useState<string>('')
  const [questions, setQuestions] = useState<QuestionOption[]>([])
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set())
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [classId, setClassId] = useState<string>('')
  const [courseId, setCourseId] = useState<string>('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [oneAttempt, setOneAttempt] = useState(true)
  const [titleOverride, setTitleOverride] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const t = {
    pageTitle: labels.pageTitle ?? 'Final Exams',
    pageDescription: labels.pageDescription ?? 'Create and manage final exams from existing exams. Set availability period and one attempt per student.',
    generateButton: labels.generateButton ?? 'Generate final exam',
    noFinalExams: labels.noFinalExams ?? 'No final exams yet. Create one from an existing exam.',
    sourceExam: labels.sourceExam ?? 'Source exam',
    selectQuestions: labels.selectQuestions ?? 'Select questions (leave all selected to use full exam)',
    selectClass: labels.selectClass ?? 'Class',
    selectCourse: labels.selectCourse ?? 'Course (optional)',
    availableFrom: labels.availableFrom ?? 'Available from',
    availableTo: labels.availableTo ?? 'Available to',
    oneAttemptPerStudent: labels.oneAttemptPerStudent ?? 'One attempt per student',
    create: labels.create ?? 'Create final exam',
    cancel: labels.cancel ?? 'Cancel',
  }

  const loadQuestions = useCallback(
    async (examId: string) => {
      setLoadingQuestions(true)
      setError(null)
      try {
        const list = await onLoadSourceExam(examId)
        setQuestions(list)
        setSelectedQuestionIds(new Set(list.map((q) => q.id)))
      } catch {
        setQuestions([])
        setSelectedQuestionIds(new Set())
      } finally {
        setLoadingQuestions(false)
      }
    },
    [onLoadSourceExam]
  )

  const openDialog = () => {
    setSourceExamId('')
    setQuestions([])
    setSelectedQuestionIds(new Set())
    setClassId('')
    setCourseId('')
    setStartTime('')
    setEndTime('')
    setOneAttempt(true)
    setTitleOverride('')
    setError(null)
    setDialogOpen(true)
  }

  const onSourceExamChange = (examId: string) => {
    setSourceExamId(examId)
    if (examId) loadQuestions(examId)
    else setQuestions([])
  }

  const toggleQuestion = (id: string) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllQuestions = () => {
    setSelectedQuestionIds(new Set(questions.map((q) => q.id)))
  }

  const handleSubmit = async () => {
    if (!sourceExamId || !classId || !startTime || !endTime) {
      setError('Please select source exam, class, and set availability period.')
      return
    }
    if (new Date(startTime) >= new Date(endTime)) {
      setError('End time must be after start time.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const result = await onCreateFinalExam({
        source_exam_id: sourceExamId,
        title: titleOverride.trim() || null,
        selected_question_ids: questions.length > 0 ? Array.from(selectedQuestionIds) : null,
        class_id: classId,
        course_id: courseId || null,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        one_attempt_per_student: oneAttempt,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setDialogOpen(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await onDeleteFinalExam(id)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{t.pageTitle}</h1>
          <p className="mt-1 text-sm text-gray-500">{t.pageDescription}</p>
        </div>
        <Button onClick={openDialog}>
          <Plus className="mr-2 h-4 w-4" />
          {t.generateButton}
        </Button>
      </div>

      {finalExams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">{t.noFinalExams}</p>
            <Button variant="outline" className="mt-4" onClick={openDialog}>
              <Plus className="mr-2 h-4 w-4" />
              {t.generateButton}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {finalExams.map((fe) => (
            <Card key={fe.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">
                      {fe.title || (fe.source_exam?.title ?? 'Final exam')}
                    </CardTitle>
                    <CardDescription className="mt-0.5">
                      From: {fe.source_exam?.title ?? fe.source_exam_id}
                      {fe.class_name && (
                        <>
                          {' · '}
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3.5 w-3" />
                            {fe.class_name}
                          </span>
                        </>
                      )}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(fe.id)}
                    disabled={deletingId === fe.id}
                  >
                    {deletingId === fe.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-red-600" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(fe.start_time)} – {formatDate(fe.end_time)}
                </span>
                {fe.one_attempt_per_student && (
                  <Badge variant="secondary">One attempt</Badge>
                )}
                {fe.course_title && (
                  <Badge variant="outline">{fe.course_title}</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.generateButton}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t.sourceExam}</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={sourceExamId}
                onChange={(e) => onSourceExamChange(e.target.value)}
              >
                <option value="">Select an exam</option>
                {sourceExams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} ({e.question_count} questions)
                  </option>
                ))}
              </select>
            </div>

            {sourceExamId && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Title override (optional)
                  </label>
                  <Input
                    value={titleOverride}
                    onChange={(e) => setTitleOverride(e.target.value)}
                    placeholder="e.g. Math Final – Spring 2025"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {t.selectQuestions}
                  </label>
                  {loadingQuestions ? (
                    <p className="text-sm text-gray-500">Loading questions…</p>
                  ) : questions.length > 0 ? (
                    <div className="max-h-40 space-y-1 overflow-y-auto rounded border border-gray-200 p-2">
                      <button
                        type="button"
                        className="text-xs text-green-600 hover:underline"
                        onClick={selectAllQuestions}
                      >
                        Select all
                      </button>
                      {questions
                        .sort((a, b) => a.order - b.order)
                        .map((q) => (
                          <label
                            key={q.id}
                            className={cn(
                              'flex cursor-pointer gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50',
                              selectedQuestionIds.has(q.id) && 'bg-green-50'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={selectedQuestionIds.has(q.id)}
                              onChange={() => toggleQuestion(q.id)}
                            />
                            <span className="line-clamp-1">{q.question}</span>
                          </label>
                        ))}
                    </div>
                  ) : null}
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t.selectClass}</label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {courses.length > 0 && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t.selectCourse}
                </label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                >
                  <option value="">None</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

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

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={oneAttempt}
                onChange={(e) => setOneAttempt(e.target.checked)}
              />
              <span className="text-sm font-medium text-gray-700">{t.oneAttemptPerStudent}</span>
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              {t.cancel}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                t.create
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
