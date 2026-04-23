'use client'

import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw, Sparkles } from 'lucide-react'

export interface CourseContentGeneratingLabels {
  contentGenerating?: string
  contentGeneratingMessage?: string
  contentGeneratingHint?: string
  refreshPage?: string
  analyzingLabel?: string
}

interface CourseContentGeneratingProps {
  courseId: string
  courseTitle: string
  totalLessonsExpected: number
  labels?: CourseContentGeneratingLabels
}

const DEFAULT_LABELS: CourseContentGeneratingLabels = {
  contentGenerating: 'Content is being generated',
  contentGeneratingMessage: 'Your course "{title}" was created. Lessons{lessonsCount} and the final exam are still being generated and combined in the background.',
  contentGeneratingHint: 'This usually takes a few minutes. Refresh the page to see when lessons and exam are ready.',
  refreshPage: 'Refresh page',
  analyzingLabel: 'Analyzing, generating, and combining content',
}

/**
 * Shown when a course exists but has no lessons yet (e.g. user opened the course
 * before generation finished, or page was loaded before lesson_ids were updated).
 */
export function CourseContentGenerating({
  courseTitle,
  totalLessonsExpected,
  labels = {},
}: CourseContentGeneratingProps) {
  const router = useRouter()
  const L = { ...DEFAULT_LABELS, ...labels }

  const handleRefresh = () => {
    router.refresh()
  }

  const lessonsCount = totalLessonsExpected > 0 ? ` (${totalLessonsExpected})` : ''
  const message = L.contentGeneratingMessage!
    .replace('{title}', courseTitle)
    .replace('{lessonsCount}', lessonsCount)

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-8 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <Loader2 className="h-7 w-7 animate-spin text-amber-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-amber-900">
            {L.contentGenerating}
          </h3>
          <p className="text-sm text-amber-800">
            {message}
          </p>
          <p className="text-xs text-amber-700">
            {L.contentGeneratingHint}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          {L.refreshPage}
        </button>
        <div className="flex items-center gap-2 text-xs text-amber-600">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{L.analyzingLabel}</span>
        </div>
      </div>
    </div>
  )
}
