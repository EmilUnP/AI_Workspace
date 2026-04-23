'use client'

import { useState, useCallback } from 'react'
import { Bot, Loader2, X } from 'lucide-react'
import { StudentAssistantClient } from './student-assistant-client'
import type {
  AssistantExam,
  AssistantLesson,
  TodayActivity,
  ClassUpdate,
  AssistantProgress,
  StudentAssistantLabels,
} from './student-assistant-client'
import { cn } from '../../lib/utils'

export interface StudentAssistantFabProps {
  /** GET URL that returns JSON with assistant data (same shape as StudentAssistantClientProps minus embedded/onClose). */
  dataApiPath: string
  /** POST URL for the assistant chat action. */
  assistantActionPath?: string
  variant: 'erp'
  /** Optional: custom position. */
  className?: string
  /** Optional: translated labels (from studentAssistant namespace). */
  labels?: Partial<StudentAssistantLabels>
}

interface AssistantData {
  studentName: string
  variant: 'erp'
  upcomingExams: AssistantExam[]
  recentLessons: AssistantLesson[]
  todayActivity: TodayActivity
  classUpdates: ClassUpdate[]
  progress: AssistantProgress
  contextSummary: string
  assistantActionPath?: string
  examsHref?: string
  lessonsHref?: string
  progressHref?: string
}

const FAB_DEFAULT_LABELS: Pick<StudentAssistantLabels, 'failedToLoad' | 'invalidResponse' | 'invalidResponseFromServer' | 'somethingWentWrong' | 'openAssistant' | 'openStudyAssistant' | 'studyAssistant' | 'close'> = {
  failedToLoad: 'Failed to load assistant',
  invalidResponse: 'Invalid response',
  invalidResponseFromServer: 'Invalid response from server',
  somethingWentWrong: 'Something went wrong',
  openAssistant: 'Open assistant',
  openStudyAssistant: 'Open study assistant',
  studyAssistant: 'Study assistant',
  close: 'Close',
}

export function StudentAssistantFab({
  dataApiPath,
  assistantActionPath,
  variant: _variant,
  className,
  labels: labelsProp,
}: StudentAssistantFabProps) {
  const L = { ...FAB_DEFAULT_LABELS, ...labelsProp }

  const [open, setOpen] = useState(false)
  const [data, setData] = useState<AssistantData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpen = useCallback(async () => {
    if (open) {
      setOpen(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(dataApiPath)
      const raw = await res.text()
      if (!res.ok) {
        setError(L.failedToLoad)
        return
      }
      try {
        const json = raw ? (JSON.parse(raw) as AssistantData) : null
        if (!json) {
          setError(L.invalidResponse)
          return
        }
        setData(json)
        setOpen(true)
      } catch {
        setError(L.invalidResponseFromServer)
      }
    } catch (e) {
      setError((e as Error).message || L.somethingWentWrong)
    } finally {
      setLoading(false)
    }
  }, [dataApiPath, open, L])

  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={loading}
        className={cn(
          'fixed bottom-6 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-all duration-200',
          'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
          'hover:scale-105 hover:shadow-xl hover:shadow-emerald-900/25',
          'focus:outline-none focus:ring-4 focus:ring-emerald-400/40 focus:ring-offset-2',
          'disabled:opacity-70 disabled:pointer-events-none',
          'lg:bottom-8 lg:right-8',
          className
        )}
        title={L.openAssistant}
        aria-label={L.openStudyAssistant}
      >
        {loading ? (
          <Loader2 className="h-7 w-7 animate-spin" />
        ) : (
          <Bot className="h-7 w-7" strokeWidth={1.5} />
        )}
      </button>

      {open ? (
        <div role="dialog" aria-modal="true" aria-label={L.studyAssistant}>
          <div
            className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-200"
            onClick={handleClose}
          />
          <div
            className={cn(
              'fixed top-0 right-0 z-[120] h-full w-full max-w-2xl flex flex-col overflow-hidden',
              'bg-gray-50/95 shadow-2xl animate-in slide-in-from-right duration-300 ease-out',
              'sm:max-w-xl md:max-w-2xl'
            )}
          >
            <div className="flex items-center justify-between border-b border-gray-200/80 bg-white/95 backdrop-blur-sm px-5 py-3.5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                  <Bot className="h-5 w-5 text-white" strokeWidth={1.5} />
                </div>
                <span className="font-semibold text-gray-900">{L.studyAssistant}</span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-2.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                aria-label={L.close}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {error ? (
                <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
              {data ? (
                <StudentAssistantClient
                  studentName={data.studentName}
                  variant={data.variant}
                  upcomingExams={data.upcomingExams}
                  recentLessons={data.recentLessons}
                  todayActivity={data.todayActivity}
                  classUpdates={data.classUpdates}
                  progress={data.progress}
                  contextSummary={data.contextSummary}
                  assistantActionPath={data.assistantActionPath ?? assistantActionPath}
                  examsHref={data.examsHref}
                  lessonsHref={data.lessonsHref}
                  progressHref={data.progressHref}
                  embedded={true}
                  onClose={handleClose}
                  labels={labelsProp}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
