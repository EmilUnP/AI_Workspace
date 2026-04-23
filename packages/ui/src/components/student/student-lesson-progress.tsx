'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Clock } from 'lucide-react'

export interface StudentLessonProgressLabels {
  markedAsLearned?: string
  markAsLearned?: string
  currentSession?: string
  saving?: string
  progressCompleted?: string
  failedToMarkLearned?: string
  pauseTimer?: string
  resumeTimer?: string
  timerPaused?: string
  restartLesson?: string
  failedToRestartLesson?: string
}

const DEFAULT_PROGRESS_LABELS: StudentLessonProgressLabels = {
  markedAsLearned: 'Marked as learned',
  markAsLearned: 'Mark as learned',
  currentSession: 'Current session: {duration}',
  saving: 'Saving…',
  progressCompleted: 'Completed',
  failedToMarkLearned: 'Failed to mark as learned',
  pauseTimer: 'Pause timer',
  resumeTimer: 'Resume timer',
  timerPaused: 'Paused',
  restartLesson: 'Restart lesson',
  failedToRestartLesson: 'Failed to restart lesson',
}

export interface StudentLessonProgressProps {
  lessonId: string
  initialTimeSpentSeconds?: number | null
  initialCompletedAt?: string | null
  /**
   * Server action from app: marks lesson completed and records time.
   * Should return { error?: string | null }.
   */
  markCompleted: (input: { lessonId: string; timeSpentSeconds: number }) => Promise<{ error?: string | null }>
  /** Server action from app: restarts lesson progress for a fresh attempt. */
  restartLesson: (input: { lessonId: string }) => Promise<{ error?: string | null }>
  labels?: Partial<StudentLessonProgressLabels>
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '0 min'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) {
    return secs > 0 ? `${mins} min ${secs}s` : `${mins} min`
  }
  return `${secs}s`
}

export function StudentLessonProgress({
  lessonId,
  initialTimeSpentSeconds,
  initialCompletedAt,
  markCompleted,
  restartLesson,
  labels: labelsProp,
}: StudentLessonProgressProps) {
  const L = { ...DEFAULT_PROGRESS_LABELS, ...labelsProp }
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [completed, setCompleted] = useState<boolean>(Boolean(initialCompletedAt))
  const [timeSpentSeconds, setTimeSpentSeconds] = useState<number | null>(initialTimeSpentSeconds ?? null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)

  // Track time only if not completed yet
  useEffect(() => {
    if (completed || isPaused) return
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [completed, isPaused])

  const handleMarkCompleted = async () => {
    if (completed || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const seconds = elapsedSeconds > 0 ? elapsedSeconds : 1
      const res = await markCompleted({ lessonId, timeSpentSeconds: seconds })
      if (res.error) {
        setError(res.error)
        setSubmitting(false)
        return
      }
      setCompleted(true)
      setTimeSpentSeconds(seconds)
      setIsPaused(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : (L.failedToMarkLearned ?? null))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRestartLesson = async () => {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await restartLesson({ lessonId })
      if (res.error) {
        setError(res.error || L.failedToRestartLesson || null)
        return
      }
      setCompleted(false)
      setTimeSpentSeconds(null)
      setElapsedSeconds(0)
      setIsPaused(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : (L.failedToRestartLesson ?? null))
    } finally {
      setSubmitting(false)
    }
  }

  if (completed && timeSpentSeconds == null && initialTimeSpentSeconds == null) {
    // Completed but no time stored; still show a simple badge.
    return (
      <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs sm:text-sm font-medium text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="h-4 w-4" />
        <span>{L.markedAsLearned}</span>
      </div>
    )
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 text-xs sm:text-sm">
      {completed ? (
        <>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            <span>{L.progressCompleted}</span>
            {timeSpentSeconds != null && (
              <>
                <span className="text-emerald-500">•</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatDuration(timeSpentSeconds)}</span>
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={handleRestartLesson}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs sm:text-sm font-medium text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-60"
          >
            <Clock className="h-3 w-3" />
            {L.restartLesson}
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={handleMarkCompleted}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1 text-xs sm:text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            <CheckCircle2 className="h-3 w-3" />
            {submitting ? L.saving : L.markAsLearned}
          </button>
          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs sm:text-sm font-medium text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-60"
          >
            <Clock className="h-3 w-3" />
            {isPaused ? L.resumeTimer : L.pauseTimer}
          </button>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-1 text-[11px] sm:text-xs text-gray-600 border border-gray-200">
            <Clock className="h-3 w-3" />
            <span>{(L.currentSession ?? 'Current session: {duration}').replace(/\{duration\}/g, formatDuration(elapsedSeconds))}</span>
          </span>
          {isPaused && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] sm:text-xs text-amber-700 border border-amber-200">
              {L.timerPaused}
            </span>
          )}
          {error && (
            <span className="text-xs text-red-600">
              {error}
            </span>
          )}
        </>
      )}
    </div>
  )
}

