'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { FileText, Calendar, Users, Plus, Trash2, Loader2, User, Clock, ListChecks, Pencil, Eye } from 'lucide-react'
import type { FinalExamWithSource } from '@eduator/core/types/final-exam'

export interface TeacherOption {
  id: string
  full_name: string
  exam_count: number
}

export interface FinalExamListProps {
  finalExams: FinalExamWithSource[]
  teachers?: TeacherOption[]
  selectedTeacherId?: string
  onTeacherFilterChange?: (teacherId: string) => void
  onDeleteFinalExam: (id: string) => Promise<{ error?: string | null }>
  onReleaseResults?: (id: string) => Promise<{ error?: string | null }>
  createHref: string
  listPath?: string
  showTeacherFilter?: boolean
  labels?: {
    pageTitle?: string
    pageDescription?: string
    createButton?: string
    noFinalExams?: string
    getStartedHint?: string
    filterByTeacher?: string
    allTeachers?: string
    teacherLabel?: string
    oneAttempt?: string
    resultsHidden?: string
    resultsShown?: string
    releaseResults?: string
    viewDetails?: string
    edit?: string
    questionsFromSources?: string
    duration?: string
    source?: string
    sources?: string
    defaultTitle?: string
    questionMode?: string
    modeFixedSelection?: string
    modeRandomPool?: string
    questionsPerAttempt?: string
  }
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

export function FinalExamList({
  finalExams,
  teachers = [],
  selectedTeacherId = '',
  onTeacherFilterChange,
  onDeleteFinalExam,
  onReleaseResults,
  createHref,
  listPath = '',
  showTeacherFilter = false,
  labels = {},
}: FinalExamListProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [releasingId, setReleasingId] = useState<string | null>(null)

  const t = {
    pageTitle: labels.pageTitle ?? 'Final Exams',
    pageDescription:
      labels.pageDescription ??
      'Create and manage final exams from existing exams. Set availability and one attempt per student.',
    createButton: labels.createButton ?? 'Create final exam',
    noFinalExams: labels.noFinalExams ?? 'No final exams yet. Create one from an existing exam.',
    getStartedHint: labels.getStartedHint ?? 'Get started by creating your first final exam.',
    filterByTeacher: labels.filterByTeacher ?? 'Filter by teacher',
    allTeachers: labels.allTeachers ?? 'All teachers',
    teacherLabel: labels.teacherLabel ?? 'Teacher',
    oneAttempt: labels.oneAttempt ?? 'One attempt',
    resultsHidden: labels.resultsHidden ?? 'Results hidden until you release',
    resultsShown: labels.resultsShown ?? 'Students see result after finishing',
    releaseResults: labels.releaseResults ?? 'Release results',
    viewDetails: labels.viewDetails ?? 'View details',
    edit: labels.edit ?? 'Edit',
    questionsFromSources: labels.questionsFromSources ?? 'questions from',
    duration: labels.duration ?? 'Duration',
    source: labels.source ?? 'source',
    sources: labels.sources ?? 'sources',
    defaultTitle: labels.defaultTitle ?? 'Final exam',
    questionMode: labels.questionMode ?? 'Question mode',
    modeFixedSelection: labels.modeFixedSelection ?? 'Fixed selection',
    modeRandomPool: labels.modeRandomPool ?? 'Randomized from pool',
    questionsPerAttempt: labels.questionsPerAttempt ?? 'Questions per attempt',
  }

  const handleTeacherFilterChange = (teacherId: string) => {
    if (!listPath) {
      onTeacherFilterChange?.(teacherId)
      return
    }
    const url = teacherId ? `${listPath}?teacher=${encodeURIComponent(teacherId)}` : listPath
    router.push(url)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await onDeleteFinalExam(id)
    } finally {
      setDeletingId(null)
    }
  }

  const handleReleaseResults = async (id: string) => {
    if (!onReleaseResults) return
    setReleasingId(id)
    try {
      await onReleaseResults(id)
    } finally {
      setReleasingId(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {t.pageTitle}
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 max-w-xl">
            {t.pageDescription}
          </p>
        </div>
        <Link href={createHref} className="shrink-0">
          <Button size="lg" className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" />
            {t.createButton}
          </Button>
        </Link>
      </div>

      {/* Teacher filter */}
      {showTeacherFilter && teachers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3">
          <span className="text-sm font-medium text-gray-700">{t.filterByTeacher}</span>
          <select
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm"
            value={selectedTeacherId}
            onChange={(e) => handleTeacherFilterChange(e.target.value)}
          >
            <option value="">{t.allTeachers}</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.full_name} ({teacher.exam_count} exams)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* List or empty state */}
      {finalExams.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-200 bg-gray-50/30">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-gray-100 p-4">
              <FileText className="h-10 w-10 text-gray-400" />
            </div>
            <p className="mt-4 text-base font-medium text-gray-900">{t.noFinalExams}</p>
            <p className="mt-1 text-sm text-gray-500">{t.getStartedHint}</p>
            <Link href={createHref} className="mt-6">
              <Button size="lg" variant="outline" className="shadow-sm">
                <Plus className="mr-2 h-4 w-4" />
                {t.createButton}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {finalExams.map((fe) => {
            const detailHref = listPath ? `${listPath}/${fe.id}` : '#'
            const totalQuestions =
              fe.total_question_count ??
              (fe.source_exam?.questions && Array.isArray(fe.source_exam.questions)
                ? fe.source_exam.questions.length
                : 0)
            const questionMode = fe.question_mode === 'random_pool' ? 'random_pool' : 'fixed_selection'
            const modeLabel =
              questionMode === 'random_pool' ? t.modeRandomPool : t.modeFixedSelection
            const perAttempt =
              questionMode === 'random_pool'
                ? Math.max(1, Math.floor(Number(fe.questions_per_attempt) || 1))
                : null
            const sourceCount = fe.source_entries?.length ?? 1
            return (
              <li key={fe.id}>
                <Card className="overflow-hidden transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={detailHref}
                            className="focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded"
                          >
                            <CardTitle className="text-lg font-semibold text-gray-900 hover:text-indigo-600">
                              {fe.title || (fe.source_exam?.title ?? t.defaultTitle)}
                            </CardTitle>
                          </Link>
                          {fe.source_entries && fe.source_entries.length > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              {fe.source_entries.length} {t.sources}
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <ListChecks className="h-4 w-4 text-gray-400" />
                              <strong className="text-gray-700">{totalQuestions}</strong>{' '}
                              {t.questionsFromSources} {sourceCount} {sourceCount === 1 ? t.source : t.sources}
                            </span>
                            {fe.duration_minutes != null && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-4 w-4 text-gray-400" />
                                {fe.duration_minutes} min
                              </span>
                            )}
                            {fe.class_name && (
                              <span className="inline-flex items-center gap-1">
                                <Users className="h-4 w-4 text-gray-400" />
                                {fe.class_name}
                              </span>
                            )}
                            {showTeacherFilter && fe.created_by_name && (
                              <span className="inline-flex items-center gap-1">
                                <User className="h-4 w-4 text-gray-400" />
                                {fe.created_by_name}
                              </span>
                            )}
                        </CardDescription>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {listPath && (
                          <Link href={detailHref}>
                            <Button variant="ghost" size="sm" className="gap-1">
                              <Eye className="h-4 w-4" />
                              {t.viewDetails}
                            </Button>
                          </Link>
                        )}
                        {listPath && (
                          <Link href={`${listPath}/${fe.id}/edit`}>
                            <Button variant="ghost" size="sm" className="gap-1">
                              <Pencil className="h-4 w-4" />
                              {t.edit}
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(fe.id)}
                          disabled={deletingId === fe.id}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          {deletingId === fe.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="border-t border-gray-100 bg-gray-50/50 pt-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 text-gray-600">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(fe.start_time)} – {formatDate(fe.end_time)}
                      </span>
                      {fe.one_attempt_per_student && (
                        <Badge variant="secondary" className="font-normal">
                          {t.oneAttempt}
                        </Badge>
                      )}
                      <Badge variant="outline" className="font-normal">
                        {t.questionMode}: {modeLabel}
                      </Badge>
                      {perAttempt != null && (
                        <Badge variant="outline" className="font-normal">
                          {t.questionsPerAttempt}: {perAttempt}
                        </Badge>
                      )}
                      {fe.show_result_to_student === false ? (
                        <>
                          <Badge variant="outline" className="font-normal">
                            {t.resultsHidden}
                          </Badge>
                          {onReleaseResults && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleReleaseResults(fe.id)}
                              disabled={releasingId === fe.id}
                            >
                              {releasingId === fe.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                t.releaseResults
                              )}
                            </Button>
                          )}
                        </>
                      ) : (
                          <Badge variant="outline" className="border-green-200 text-green-700 font-normal">
                            {t.resultsShown}
                          </Badge>
                        )}
                      {fe.course_title && (
                        <Badge variant="outline" className="font-normal">
                          {fe.course_title}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
