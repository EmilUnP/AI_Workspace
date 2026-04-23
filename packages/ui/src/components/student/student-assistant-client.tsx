'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  FileText,
  Clock,
  CheckCircle,
  ChevronRight,
  Send,
  Loader2,
  AlertCircle,
  Bot,
  Sun,
  Bell,
  ChevronDown,
  X,
  TrendingUp,
  Flame,
  Award,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '../ui/button'
import { DashboardCard } from '../analytics/dashboard-card'
import { ProgressRing } from '../analytics/charts'
import { cn } from '../../lib/utils'

export interface AssistantExam {
  id: string
  title: string
  class: string
  dueDate: string
  duration: number
  /** When set, this is a scheduled final exam; use for take URL query param. */
  finalExamId?: string
}

export interface AssistantLesson {
  id: string
  title: string
  class_name?: string | null
  created_at: string
  is_completed?: boolean
  duration_minutes?: number | null
}

export interface TodayActivity {
  didLesson: boolean
  didExam: boolean
  lessonCount: number
  examCount: number
}

export interface ClassUpdate {
  type: 'lesson' | 'exam'
  id: string
  title: string
  class_name?: string | null
  created_at: string
}

/** Progress & scores for the assistant Progress step */
export interface AssistantProgress {
  lessonsCompleted: number
  lessonsTotal: number
  examsTaken: number
  averageExamScore: number | null
  totalLessonMinutes: number
  /** 0-100 combined "readiness" / study pulse */
  studyPulse: number
  streakDays: number
}

export type WizardStep = 1 | 2 | 3 | 4 | 5

/** All UI strings for the student assistant (Fab + Client). Pass from layout via getTranslations('studentAssistant'). */
export interface StudentAssistantLabels {
  // Fab
  openAssistant: string
  openStudyAssistant: string
  studyAssistant: string
  close: string
  failedToLoad: string
  invalidResponse: string
  invalidResponseFromServer: string
  somethingWentWrong: string
  // Hero & header
  yourStudyAssistant: string
  heroSubtitle: string
  yourAssistant: string
  examsLessonsProgress: string
  // Steps
  stepToday: string
  stepExams: string
  stepLessons: string
  stepUpdates: string
  stepProgress: string
  // Nudge
  nudgeNoActivity: string
  // Today
  todayTitle: string
  todayDescription: string
  lessons: string
  completedToday: string
  noneCompletedToday: string
  exams: string
  takenToday: string
  noneTakenToday: string
  youHaveUpcoming: string
  // Upcoming exams
  upcomingExams: string
  upcomingExamsDescription: string
  viewAll: string
  min: string
  noUpcomingExams: string
  checkBackLater: string
  // Lessons
  lessonsDescription: string
  class: string
  noLessonsYet: string
  lessonsAppearWhenAssigned: string
  // Updates
  classUpdates: string
  classUpdatesDescription: string
  newInClass: string
  newUpdate: string
  typeLesson: string
  typeExam: string
  open: string
  noNewUpdates: string
  allCaughtUp: string
  // Progress
  myProgressScores: string
  progressDescription: string
  fullReport: string
  studyPulse: string
  studyPulseDescription: string
  minTotal: string
  taken: string
  averageScore: string
  noExamsYet: string
  takeOneToSeeScore: string
  dayStreak: string
  achievements: string
  firstLesson: string
  fiveLessons: string
  firstExam: string
  average80: string
  completeForBadge: string
  // Chat
  askMeAnything: string
  examsLessonsProgressShort: string
  iHaveYourSchedule: string
  promptFocusToday: string
  promptUpcomingExams: string
  promptMyProgress: string
  promptDidLessonOrExam: string
  placeholderQuestion: string
  requestFailed: string
  requestFailedTryAgain: string
  useTabsAbove: string
}

const DEFAULT_LABELS: StudentAssistantLabels = {
  openAssistant: 'Open assistant',
  openStudyAssistant: 'Open study assistant',
  studyAssistant: 'Study assistant',
  close: 'Close',
  failedToLoad: 'Failed to load assistant',
  invalidResponse: 'Invalid response',
  invalidResponseFromServer: 'Invalid response from server',
  somethingWentWrong: 'Something went wrong',
  yourStudyAssistant: 'Your study assistant',
  heroSubtitle: "Exams, lessons, today's activity, and answers — all in one place.",
  yourAssistant: 'Your assistant',
  examsLessonsProgress: 'Exams, lessons & progress',
  stepToday: 'Today',
  stepExams: 'Exams',
  stepLessons: 'Lessons',
  stepUpdates: 'Updates',
  stepProgress: 'Progress',
  nudgeNoActivity: "You didn't work on a lesson or exam today. Consider doing one to stay on track.",
  todayTitle: 'Today',
  todayDescription: 'Your activity at a glance',
  lessons: 'Lessons',
  completedToday: '{count} completed today',
  noneCompletedToday: 'None completed today',
  exams: 'Exams',
  takenToday: '{count} taken today',
  noneTakenToday: 'None taken today',
  youHaveUpcoming: 'You have {exams} upcoming exam(s) and {lessons} lesson(s) available. A short session can keep you on track.',
  upcomingExams: 'Upcoming Exams',
  upcomingExamsDescription: "Plan ahead — don't miss deadlines",
  viewAll: 'View all',
  min: 'min',
  noUpcomingExams: 'No upcoming exams',
  checkBackLater: 'Check back later or ask your teacher.',
  lessonsDescription: 'Pick up where you left off',
  class: 'Class',
  noLessonsYet: 'No lessons yet',
  lessonsAppearWhenAssigned: "They'll appear here when assigned.",
  classUpdates: 'Class Updates',
  classUpdatesDescription: "What's new in your classes",
  newInClass: 'New {type} in {class} · {date}',
  newUpdate: 'New {type} · {date}',
  typeLesson: 'lesson',
  typeExam: 'exam',
  open: 'Open',
  noNewUpdates: 'No new updates',
  allCaughtUp: "You're all caught up.",
  myProgressScores: 'My Progress & Scores',
  progressDescription: 'Your study pulse and performance',
  fullReport: 'Full report',
  studyPulse: 'Study Pulse',
  studyPulseDescription: 'Combined readiness from lessons and exams',
  minTotal: '{minutes} min total',
  taken: 'taken',
  averageScore: 'Average score',
  noExamsYet: 'No exams yet',
  takeOneToSeeScore: 'Take one to see your score',
  dayStreak: '{count} day streak',
  achievements: 'Achievements',
  firstLesson: 'First lesson',
  fiveLessons: '5 lessons',
  firstExam: 'First exam',
  average80: '80%+ average',
  completeForBadge: 'Complete a lesson or exam to earn your first badge.',
  askMeAnything: 'Ask me anything',
  examsLessonsProgressShort: 'Exams, lessons, progress',
  iHaveYourSchedule: 'I have your schedule. Ask about today, exams, or your progress.',
  promptFocusToday: 'What should I focus on today?',
  promptUpcomingExams: 'Any upcoming exams?',
  promptMyProgress: 'How is my progress?',
  promptDidLessonOrExam: 'Did I do a lesson or exam today?',
  placeholderQuestion: 'Type your question...',
  requestFailed: 'Request failed',
  requestFailedTryAgain: 'Request failed. Please try again.',
  useTabsAbove: "Use the tabs above to see your exams, lessons, and updates.",
}

function interpolateAssistant(str: string, values: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? key))
}

const STEP_LABEL_KEYS: Record<WizardStep, keyof StudentAssistantLabels> = {
  1: 'stepToday',
  2: 'stepExams',
  3: 'stepLessons',
  4: 'stepUpdates',
  5: 'stepProgress',
}

export interface StudentAssistantClientProps {
  studentName: string
  variant: 'erp'
  upcomingExams: AssistantExam[]
  recentLessons: AssistantLesson[]
  todayActivity: TodayActivity
  classUpdates: ClassUpdate[]
  progress: AssistantProgress
  /** Summary text for the AI (e.g. "Upcoming exams: Math on Friday. Today: no lesson or exam done.") */
  contextSummary: string
  /** POST URL for the assistant API (message + contextSummary). If set, "Ask AI" is enabled. */
  assistantActionPath?: string
  examsHref?: string
  lessonsHref?: string
  progressHref?: string
  /** When true, skip hero and show wizard directly (e.g. in a drawer). */
  embedded?: boolean
  /** Called when user closes the assistant (e.g. in embedded mode). */
  onClose?: () => void
  /** Optional translated labels (from studentAssistant namespace). */
  labels?: Partial<StudentAssistantLabels>
}

const STEP_ICONS: Record<WizardStep, LucideIcon> = {
  1: Sun,
  2: FileText,
  3: BookOpen,
  4: Bell,
  5: TrendingUp,
}

export function StudentAssistantClient({
  upcomingExams,
  recentLessons,
  todayActivity,
  classUpdates,
  progress,
  contextSummary,
  assistantActionPath,
  examsHref = '/student/exams',
  lessonsHref = '/student/lessons',
  progressHref = '/student/progress',
  embedded = false,
  onClose: _onClose,
  labels: labelsProp,
}: StudentAssistantClientProps) {
  const L = { ...DEFAULT_LABELS, ...labelsProp }

  const [wizardOpen, setWizardOpen] = useState(embedded)
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [aiMessage, setAiMessage] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiReply, setAiReply] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  const steps: WizardStep[] = [1, 2, 3, 4, 5]
  const hasActivityToday = todayActivity.didLesson || todayActivity.didExam
  const nudgeMessage = !hasActivityToday && (upcomingExams.length > 0 || recentLessons.length > 0)
    ? L.nudgeNoActivity
    : null

  const canUseAi = Boolean(assistantActionPath?.trim())

  const handleSendAi = async () => {
    const msg = aiMessage.trim()
    if (!msg || !assistantActionPath) return
    setAiLoading(true)
    setAiError(null)
    setAiReply(null)
    try {
      const res = await fetch(assistantActionPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, contextSummary }),
      })
      const raw = await res.text()
      type ActionResponse = { text?: string; response?: string; error?: { message?: string }; message?: string }
      let data: ActionResponse
      try {
        data = raw ? (JSON.parse(raw) as ActionResponse) : {}
      } catch {
        setAiError(res.ok ? L.invalidResponseFromServer : L.requestFailedTryAgain)
        return
      }
      if (!res.ok) {
        setAiError(data?.error?.message ?? data?.message ?? L.requestFailed)
        return
      }
      setAiReply(typeof data.text === 'string' ? data.text : data.response ?? '')
      setAiMessage('')
    } catch (e) {
      setAiError((e as Error).message || L.somethingWentWrong)
    } finally {
      setAiLoading(false)
    }
  }

  // —— Hero: one clean card, click to open wizard (skip when embedded) ——
  if (!embedded && !wizardOpen) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          className={cn(
            'group relative flex w-full max-w-md flex-col items-center gap-8 rounded-3xl p-10 text-center overflow-hidden',
            'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700',
            'shadow-xl shadow-emerald-900/25 hover:shadow-2xl hover:shadow-emerald-900/30',
            'transition-all duration-300 hover:scale-[1.02] active:scale-[0.99]',
            'focus:outline-none focus:ring-4 focus:ring-emerald-400/40 focus:ring-offset-2'
          )}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white/25 backdrop-blur-md transition-transform duration-300 group-hover:scale-105 group-hover:bg-white/30">
            <Bot className="h-14 w-14 text-white" strokeWidth={1.5} />
          </div>
          <div className="relative space-y-3">
            <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">{L.yourStudyAssistant}</h1>
            <p className="max-w-xs text-sm leading-relaxed text-emerald-50/95">
              {L.heroSubtitle}
            </p>
          </div>
          <span className="relative inline-flex items-center gap-2 rounded-full bg-white/25 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors group-hover:bg-white/35">
            {L.openAssistant}
            <ChevronDown className="h-4 w-4 rotate-[-90deg]" aria-hidden />
          </span>
        </button>
      </div>
    )
  }

  // —— Wizard open: bot header (only when not embedded) + steps + content + chat ——
  return (
    <div className="space-y-5">
      {!embedded && (
        <div className="flex items-center justify-between rounded-2xl border border-gray-200/80 bg-white px-5 py-3.5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <Bot className="h-6 w-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{L.yourAssistant}</p>
              <p className="text-xs text-gray-500">{L.examsLessonsProgress}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWizardOpen(false)}
            className="h-9 w-9 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label={L.close}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Nudge — soft, friendly */}
      {nudgeMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-sky-200/80 bg-sky-50/80 px-4 py-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
          <p className="text-sm text-sky-800">{nudgeMessage}</p>
        </div>
      )}

      {/* Step tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-xl bg-gray-100/80 p-1.5">
        {steps.map((step) => {
          const Icon = STEP_ICONS[step]
          const hasDot = step === 1 && !hasActivityToday && (upcomingExams.length > 0 || recentLessons.length > 0)
          return (
            <button
              key={step}
              type="button"
              onClick={() => setCurrentStep(step)}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200',
                currentStep === step
                  ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/80'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {L[STEP_LABEL_KEYS[step]]}
              {hasDot && (
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden />
              )}
            </button>
          )
        })}
      </div>

      {/* Step content + Chat: content takes remaining space, chat has min width for readability */}
      <div className={cn(
        'grid gap-6',
        embedded
          ? 'grid-cols-1' // Drawer: stack on small; single col keeps chat full width below
          : 'lg:grid-cols-[1fr_minmax(300px,380px)]'
      )}>
        <div className="min-w-0 space-y-6">
          {currentStep === 1 && (
            <DashboardCard title={L.todayTitle} description={L.todayDescription}>
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    className={cn(
                      'flex items-center gap-4 rounded-xl border px-5 py-4 transition-colors',
                      todayActivity.didLesson
                        ? 'border-emerald-200/80 bg-emerald-50/60'
                        : 'border-gray-100 bg-gray-50/50'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                        todayActivity.didLesson ? 'bg-emerald-500/20 text-emerald-600' : 'bg-gray-200/80 text-gray-500'
                      )}
                    >
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{L.lessons}</p>
                      <p className="text-sm text-gray-500">
                        {todayActivity.didLesson
                          ? interpolateAssistant(L.completedToday, { count: todayActivity.lessonCount })
                          : L.noneCompletedToday}
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'flex items-center gap-4 rounded-xl border px-5 py-4 transition-colors',
                      todayActivity.didExam
                        ? 'border-emerald-200/80 bg-emerald-50/60'
                        : 'border-gray-100 bg-gray-50/50'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                        todayActivity.didExam ? 'bg-emerald-500/20 text-emerald-600' : 'bg-gray-200/80 text-gray-500'
                      )}
                    >
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{L.exams}</p>
                      <p className="text-sm text-gray-500">
                        {todayActivity.didExam
                          ? interpolateAssistant(L.takenToday, { count: todayActivity.examCount })
                          : L.noneTakenToday}
                      </p>
                    </div>
                  </div>
                </div>
                {!hasActivityToday && (upcomingExams.length > 0 || recentLessons.length > 0) && (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {interpolateAssistant(L.youHaveUpcoming, { exams: upcomingExams.length, lessons: recentLessons.length })}
                  </p>
                )}
              </div>
            </DashboardCard>
          )}

          {currentStep === 2 && (
            <DashboardCard
              title={L.upcomingExams}
              description={L.upcomingExamsDescription}
              actions={
                <Link href={examsHref} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                  {L.viewAll}
                </Link>
              }
            >
              <div className="space-y-2">
                {upcomingExams.length > 0 ? (
                  upcomingExams.map((exam) => (
                    <Link
                      key={exam.finalExamId ? `fe-${exam.finalExamId}` : exam.id}
                      href={`${examsHref}/${exam.id}${exam.finalExamId ? `?finalExamId=${encodeURIComponent(exam.finalExamId)}` : ''}`}
                      className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/30 px-4 py-3.5 transition-colors hover:border-emerald-200/80 hover:bg-emerald-50/40"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-gray-900 truncate">{exam.title}</h4>
                        <p className="text-sm text-gray-500">{exam.class}</p>
                      </div>
                      <div className="hidden sm:block text-right shrink-0">
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(exam.dueDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">{exam.duration} {L.min}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" aria-hidden />
                    </Link>
                  ))
                ) : (
                  <div className="py-10 text-center">
                    <FileText className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-2 text-sm font-medium text-gray-500">{L.noUpcomingExams}</p>
                    <p className="text-xs text-gray-400">{L.checkBackLater}</p>
                  </div>
                )}
              </div>
            </DashboardCard>
          )}

          {currentStep === 3 && (
            <DashboardCard
              title={L.lessons}
              description={L.lessonsDescription}
              actions={
                <Link href={lessonsHref} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                  {L.viewAll}
                </Link>
              }
            >
              <div className="space-y-2">
                {recentLessons.length > 0 ? (
                  recentLessons.slice(0, 5).map((lesson) => (
                    <Link
                      key={lesson.id}
                      href={`${lessonsHref}/${lesson.id}`}
                      className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/30 px-4 py-3.5 transition-colors hover:border-emerald-200/80 hover:bg-emerald-50/40"
                    >
                      <div
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                          lesson.is_completed ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                        )}
                      >
                        {lesson.is_completed ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <BookOpen className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-gray-900 truncate">{lesson.title}</h4>
                        <p className="text-sm text-gray-500">{lesson.class_name || L.class}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" aria-hidden />
                    </Link>
                  ))
                ) : (
                  <div className="py-10 text-center">
                    <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-2 text-sm font-medium text-gray-500">{L.noLessonsYet}</p>
                    <p className="text-xs text-gray-400">{L.lessonsAppearWhenAssigned}</p>
                  </div>
                )}
              </div>
            </DashboardCard>
          )}

          {currentStep === 4 && (
            <DashboardCard title={L.classUpdates} description={L.classUpdatesDescription}>
              <div className="space-y-2">
                {classUpdates.length > 0 ? (
                  classUpdates.map((update) => (
                    <div
                      key={`${update.type}-${update.id}`}
                      className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/30 px-4 py-3.5"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                        {update.type === 'exam' ? (
                          <FileText className="h-5 w-5" />
                        ) : (
                          <BookOpen className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 truncate">{update.title}</p>
                        <p className="text-sm text-gray-500">
                          {update.class_name
                            ? interpolateAssistant(L.newInClass, {
                                type: update.type === 'exam' ? L.typeExam : L.typeLesson,
                                class: update.class_name,
                                date: new Date(update.created_at).toLocaleDateString(),
                              })
                            : interpolateAssistant(L.newUpdate, {
                                type: update.type === 'exam' ? L.typeExam : L.typeLesson,
                                date: new Date(update.created_at).toLocaleDateString(),
                              })}
                        </p>
                      </div>
                      <Link
                        href={update.type === 'exam' ? `${examsHref}/${update.id}` : `${lessonsHref}/${update.id}`}
                        className="shrink-0 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        {L.open}
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center">
                    <Bell className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-2 text-sm font-medium text-gray-500">{L.noNewUpdates}</p>
                    <p className="text-xs text-gray-400">{L.allCaughtUp}</p>
                  </div>
                )}
              </div>
            </DashboardCard>
          )}

          {currentStep === 5 && (
            <DashboardCard
              title={L.myProgressScores}
              description={L.progressDescription}
              actions={
                <Link href={progressHref} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                  {L.fullReport}
                </Link>
              }
            >
              <div className="space-y-6">
                {/* Study Pulse */}
                <div className="flex flex-col items-center gap-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/80 p-6 border border-emerald-100/80">
                  <div className="text-center">
                    <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">{L.studyPulse}</p>
                    <p className="mt-1 text-xs text-gray-500 max-w-[220px]">
                      {L.studyPulseDescription}
                    </p>
                  </div>
                  <ProgressRing
                    value={progress.studyPulse}
                    max={100}
                    size={150}
                    strokeWidth={12}
                    color={progress.studyPulse >= 70 ? '#059669' : progress.studyPulse >= 40 ? '#d97706' : '#dc2626'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                        <BookOpen className="h-4 w-4 text-emerald-600" />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{L.lessons}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ProgressRing
                        value={progress.lessonsCompleted}
                        max={Math.max(progress.lessonsTotal, 1)}
                        size={64}
                        strokeWidth={6}
                        color="#10b981"
                      />
                      <div>
                        <p className="text-xl font-bold text-gray-900">{progress.lessonsCompleted}<span className="text-gray-400 font-normal">/{progress.lessonsTotal}</span></p>
                        <p className="text-xs text-gray-500">{interpolateAssistant(L.minTotal, { minutes: progress.totalLessonMinutes })}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                        <FileText className="h-4 w-4 text-amber-600" />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{L.exams}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {progress.averageExamScore !== null ? (
                        <>
                          <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-amber-200 bg-amber-50">
                            <span className="text-xl font-bold text-amber-700">{progress.averageExamScore}%</span>
                          </div>
                          <div>
                            <p className="text-xl font-bold text-gray-900">{progress.examsTaken} {L.taken}</p>
                            <p className="text-xs text-gray-500">{L.averageScore}</p>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-1 flex-col items-center justify-center py-1">
                          <p className="text-sm font-medium text-gray-500">{L.noExamsYet}</p>
                          <p className="text-xs text-gray-400">{L.takeOneToSeeScore}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {progress.streakDays > 0 && (
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                    <Flame className="h-5 w-5 text-amber-500" />
                    <span className="font-semibold text-amber-800">{interpolateAssistant(L.dayStreak, { count: progress.streakDays })}</span>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{L.achievements}</p>
                  <div className="flex flex-wrap gap-2">
                    {progress.lessonsCompleted >= 1 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-800">
                        <Award className="h-3.5 w-3.5 shrink-0" /> {L.firstLesson}
                      </span>
                    )}
                    {progress.lessonsCompleted >= 5 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-800">
                        <Award className="h-3.5 w-3.5 shrink-0" /> {L.fiveLessons}
                      </span>
                    )}
                    {progress.examsTaken >= 1 && progress.averageExamScore !== null && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800">
                        <Award className="h-3.5 w-3.5 shrink-0" /> {L.firstExam}
                      </span>
                    )}
                    {progress.averageExamScore !== null && progress.averageExamScore >= 80 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1.5 text-xs font-medium text-violet-800">
                        <Award className="h-3.5 w-3.5 shrink-0" /> {L.average80}
                      </span>
                    )}
                    {progress.lessonsCompleted < 1 && progress.examsTaken < 1 && (
                      <span className="text-xs text-gray-400">{L.completeForBadge}</span>
                    )}
                  </div>
                </div>
              </div>
            </DashboardCard>
          )}
        </div>

        {/* Chat panel: fixed width on desktop when not embedded, full width in drawer */}
        <div className={cn('min-w-0', !embedded && 'lg:min-w-[300px]')}>
          <div
            className={cn(
              'rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden',
              !embedded && 'lg:sticky lg:top-24'
            )}
          >
            <div className="flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 px-4 py-3.5 shrink-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                <Bot className="h-5 w-5 text-white" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{L.askMeAnything}</p>
                <p className="text-xs text-gray-500">{L.examsLessonsProgressShort}</p>
              </div>
            </div>
            <div className="p-4 space-y-4 min-h-[200px] max-h-[420px] overflow-y-auto">
              {canUseAi ? (
                <>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {L.iHaveYourSchedule}
                  </p>
                  <div className="flex flex-col gap-2">
                    {[
                      L.promptFocusToday,
                      L.promptUpcomingExams,
                      L.promptMyProgress,
                      L.promptDidLessonOrExam,
                    ].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => {
                          setAiMessage(q)
                          setAiReply(null)
                        }}
                        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={aiMessage}
                      onChange={(e) => setAiMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendAi()}
                      placeholder={L.placeholderQuestion}
                      className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <Button
                      size="icon"
                      onClick={handleSendAi}
                      disabled={aiLoading || !aiMessage.trim()}
                      className="h-10 w-10 shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                    >
                      {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                  {aiError && (
                    <p className="text-sm text-red-600 rounded-lg bg-red-50 px-3 py-2">{aiError}</p>
                  )}
                  {aiReply && (
                    <div className="flex gap-3 rounded-xl bg-emerald-50/80 p-4 border border-emerald-100">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                        <Bot className="h-4 w-4 text-white" strokeWidth={1.5} />
                      </div>
                      <p className="min-w-0 text-sm text-gray-700 whitespace-pre-wrap flex-1 leading-relaxed">{aiReply}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 py-2">
                  {L.useTabsAbove}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
