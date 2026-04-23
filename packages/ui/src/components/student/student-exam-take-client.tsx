'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Clock,
  FileText,
  BookOpen,
  CheckCircle,
  PlayCircle,
  Globe,
  ChevronLeft,
  ChevronRight,
  Navigation,
  X
} from 'lucide-react'
import { Button } from '../ui/button'
import { RichTextWithMath } from '../math/rich-text-with-math'
import type { StudentExamDetailData } from '@eduator/core/utils/student-exam-detail'

// Map language codes to country codes for flag images
const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  en: 'gb',
  tr: 'tr',
  de: 'de',
  fr: 'fr',
  es: 'es',
  it: 'it',
  pt: 'pt',
  ru: 'ru',
  ar: 'sa',
  zh: 'cn',
  ja: 'jp',
  ko: 'kr',
  nl: 'nl',
  pl: 'pl',
  uk: 'ua',
  az: 'az',
}

// Language names mapping
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  tr: 'Turkish',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  ar: 'Arabic',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  nl: 'Dutch',
  pl: 'Polish',
  uk: 'Ukrainian',
  az: 'Azerbaijani',
}

export interface StudentExamTakeClientTranslations {
  backToExams: string
  questions: string
  minutes: string
  yourProgress: string
  takenExamTimes: string
  time: string
  times: string
  youCanRetake: string
  viewLastResults: string
  availableLanguages: string
  selectPreferredLanguage: string
  original: string
  startExam: string
  questionOf: string
  answered: string
  questionNavigation: string
  enterAnswerPlaceholder: string
  hint: string
  previous: string
  navigate: string
  next: string
  questionsAnswered: string
  submitting: string
  submitExam: string
  sessionExpiredMessage: string
  signInAgain: string
  failedToSubmit: string
  trueLabel: string
  falseLabel: string
  /** "Final exam for {title}." - used when exam description is the standard course-final text */
  finalExamForTitle?: string
  /** "Passing this exam (70% or higher) indicates successful completion of the course." */
  examPassingMessage?: string
  /** Question type labels (e.g. "Multiple choice", "True/False") */
  questionTypeMultipleChoice?: string
  questionTypeTrueFalse?: string
  questionTypeMultipleSelect?: string
  questionTypeFillBlank?: string
}

const QUESTION_TYPE_KEYS_TAKE: Record<string, keyof StudentExamTakeClientTranslations> = {
  multiple_choice: 'questionTypeMultipleChoice',
  true_false: 'questionTypeTrueFalse',
  multiple_select: 'questionTypeMultipleSelect',
  fill_blank: 'questionTypeFillBlank',
}

function getQuestionTypeLabelTake(
  type: string,
  t: StudentExamTakeClientTranslations
): string {
  const key = QUESTION_TYPE_KEYS_TAKE[type]
  if (key && t[key]) return t[key] as string
  return type.replace(/_/g, ' ')
}

const DEFAULT_EXAM_TAKE_TRANSLATIONS: StudentExamTakeClientTranslations = {
  backToExams: 'Back to Exams',
  questions: 'Questions',
  minutes: 'Minutes',
  yourProgress: 'Your progress',
  takenExamTimes: "You've taken this exam",
  time: 'time',
  times: 'times',
  youCanRetake: 'You can take it again to improve your score.',
  viewLastResults: 'View last results',
  availableLanguages: 'Available Languages',
  selectPreferredLanguage: 'Select your preferred language for this exam',
  original: 'Original',
  startExam: 'Start Exam',
  questionOf: 'Question {current} of {total}',
  answered: 'answered',
  questionNavigation: 'Question Navigation',
  enterAnswerPlaceholder: 'Enter your answer here...',
  hint: 'Hint:',
  previous: 'Previous',
  navigate: 'Navigate',
  next: 'Next',
  questionsAnswered: '{answered} of {total} questions answered',
  submitting: 'Submitting...',
  submitExam: 'Submit Exam',
  sessionExpiredMessage: 'Your session expired (e.g. exam open too long). Sign in again to submit your answers.',
  signInAgain: 'Sign in again',
  failedToSubmit: 'Failed to submit exam',
  trueLabel: 'True',
  falseLabel: 'False',
  finalExamForTitle: 'Final exam for {title}.',
  examPassingMessage: 'Passing this exam (70% or higher) indicates successful completion of the course.',
  questionTypeMultipleChoice: 'Multiple choice',
  questionTypeTrueFalse: 'True / False',
  questionTypeMultipleSelect: 'Multiple select',
  questionTypeFillBlank: 'Fill in the blank',
}

function interpolateTake(str: string, values: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? key))
}

export interface StudentExamTakeClientProps {
  exam: StudentExamDetailData
  /** Server action: (examId, answers, finalExamId?) => Promise<{ success, error? }>. Pass raw action from Server Component. */
  onSubmitExam: (examId: string, answers: Record<string, string | string[]>, finalExamId?: string | null) => Promise<{ success: boolean; error?: string }>
  /** When set (e.g. from course run URL), passed to onSubmitExam for submission record. */
  finalExamId?: string | null
  /** When set (e.g. from course run), back link goes here instead of /student/exams. */
  backHref?: string
  /** Label for back link, e.g. "Back to My Courses". */
  backLabel?: string
  /** When set with backHref (course run), appended to results URL so certificate link works. */
  courseRunAccessCode?: string
  /** Optional translations for all UI strings. */
  translations?: Partial<StudentExamTakeClientTranslations>
}

export function StudentExamTakeClient({ exam, onSubmitExam, finalExamId, backHref, backLabel, courseRunAccessCode, translations: tProp }: StudentExamTakeClientProps) {
  const t = { ...DEFAULT_EXAM_TAKE_TRANSLATIONS, ...tProp }
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasStarted, setHasStarted] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    // Use the exam's primary language, or first available language, or 'en' as last resort
    if (exam.language) return exam.language
    if (exam.translations && typeof exam.translations === 'object' && !Array.isArray(exam.translations)) {
      const translationKeys = Object.keys(exam.translations)
      if (translationKeys.length > 0) return translationKeys[0]
    }
    return 'en'
  })
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [showQuestionNav, setShowQuestionNav] = useState(false)

  /** When the student clicked Start (for duration countdown). */
  const startedAtRef = useRef<number>(0)
  /** Always point to latest submit so timer can call it without stale closure. */
  const submitRef = useRef<() => void>(() => {})

  // Get available languages (primary + translations)
  const availableLanguages = useMemo(() => {
    const languages: string[] = []
    
    // Add primary language if it exists
    if (exam.language) {
      languages.push(exam.language)
    }
    
    // Add translation languages
    if (exam.translations && typeof exam.translations === 'object' && !Array.isArray(exam.translations)) {
      Object.keys(exam.translations as Record<string, any>).forEach(lang => {
        if (lang && !languages.includes(lang)) {
          languages.push(lang)
        }
      })
    }
    
    // If no languages found, default to 'en'
    if (languages.length === 0) {
      languages.push('en')
    }
    
    return languages
  }, [exam.language, exam.translations])

  // Get questions for selected language
  const displayQuestions = useMemo(() => {
    // If selected language matches the exam's primary language, use primary questions
    if (exam.language && selectedLanguage === exam.language) {
      return exam.questions
    }
    
    // Get translated questions
    if (exam.translations && typeof exam.translations === 'object' && !Array.isArray(exam.translations)) {
      const translated = (exam.translations as Record<string, any>)[selectedLanguage]
      if (Array.isArray(translated) && translated.length > 0) {
        return translated
      }
    }
    
    // Fallback to primary language questions
    return exam.questions
  }, [selectedLanguage, exam.language, exam.questions, exam.translations])

  const currentQuestion = displayQuestions[currentQuestionIndex]
  const totalQuestions = displayQuestions.length

  // Variant labels A, B, C, D, ...
  const variantLetter = (index: number) => String.fromCharCode(65 + index)

  // Exams list = class library (only exams shared via class management). If the student can open
  // this page, they reached it from that list → always allow. Time-bound access is only for Calendar.

  // Timer: auto-stop and auto-submit when per-attempt duration is reached.
  // Only enforce calendar end_time for scheduled final exam sessions.
  useEffect(() => {
    const hasDuration = exam.duration_minutes != null && exam.duration_minutes > 0
    const shouldEnforceEndTime = Boolean(finalExamId)
    const endTimeMs = shouldEnforceEndTime && exam.end_time ? new Date(exam.end_time).getTime() : null
    if (!hasStarted || (!hasDuration && !endTimeMs)) return

    const durationSeconds = hasDuration ? exam.duration_minutes! * 60 : null

    const computeRemaining = (): number => {
      const now = Date.now()
      let remainingFromDuration: number | null = null
      if (durationSeconds != null && startedAtRef.current > 0) {
        const elapsed = Math.floor((now - startedAtRef.current) / 1000)
        remainingFromDuration = Math.max(0, durationSeconds - elapsed)
      }
      let remainingFromEnd: number | null = null
      if (endTimeMs != null) {
        remainingFromEnd = Math.max(0, Math.floor((endTimeMs - now) / 1000))
      }
      if (remainingFromDuration != null && remainingFromEnd != null) return Math.min(remainingFromDuration, remainingFromEnd)
      return remainingFromDuration ?? remainingFromEnd ?? 0
    }

    const tick = () => {
      const remaining = computeRemaining()
      const timeIsUp = remaining <= 0 || (endTimeMs != null && Date.now() >= endTimeMs)
      if (timeIsUp) {
        setTimeRemaining(0)
        submitRef.current?.()
        return true
      }
      setTimeRemaining(remaining)
      return false
    }

    setTimeRemaining(computeRemaining())
    const timer = setInterval(() => {
      if (tick()) clearInterval(timer)
    }, 1000)

    return () => clearInterval(timer)
  }, [hasStarted, exam.duration_minutes, exam.end_time, finalExamId])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }))
  }

  const handleStart = () => {
    startedAtRef.current = Date.now()
    setHasStarted(true)
    setCurrentQuestionIndex(0)
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleGoToQuestion = (index: number) => {
    if (index >= 0 && index < totalQuestions) {
      setCurrentQuestionIndex(index)
      setShowQuestionNav(false)
    }
  }

  const handleSubmit = async () => {
    if (isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await onSubmitExam(exam.id, answers, finalExamId ?? null)
      if (result.success) {
        const resultsQuery = backHref
          ? '?fromRun=1' + (courseRunAccessCode ? `&accessCode=${encodeURIComponent(courseRunAccessCode)}` : '')
          : ''
        router.push(`/student/exams/${exam.id}/results${resultsQuery}`)
      } else {
        setError(result.error || t.failedToSubmit)
      }
    } catch (err) {
      setError(t.sessionExpiredMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  submitRef.current = handleSubmit

  // Class-managed exams allow unlimited attempts; always show pre-start so student can take or retake.
  const backLinkHref = backHref ?? '/student/exams'
  const backLinkLabel = backLabel ?? t.backToExams

  // Pre-start screen
  if (!hasStarted) {
    return (
      <div className="space-y-6">
        <Link
          href={backLinkHref}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLinkLabel}
        </Link>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-5 bg-green-50 border-b border-green-100">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{exam.title}</h1>
            {(t.finalExamForTitle && t.examPassingMessage) ? (
              <p className="text-gray-600">
                <span className="rich-text-with-math">
                  {interpolateTake(t.finalExamForTitle, { title: exam.title })} {t.examPassingMessage}
                </span>
              </p>
            ) : exam.description ? (
              <p className="text-gray-600">
                <RichTextWithMath content={exam.description} asHtml={false} />
              </p>
            ) : null}
            {exam.class_name && (
              <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                <BookOpen className="h-4 w-4" />
                <span>{exam.class_name}</span>
              </div>
            )}
          </div>

          <div className="px-6 py-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <FileText className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{exam.questions?.length ?? 0}</p>
                <p className="text-sm text-gray-500">{t.questions}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Clock className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{exam.duration_minutes || 60}</p>
                <p className="text-sm text-gray-500">{t.minutes}</p>
              </div>
            </div>

            {(exam.attempt_count ?? 0) > 0 && (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                <p className="text-sm font-semibold text-blue-900 mb-1">{t.yourProgress}</p>
                <p className="text-sm text-blue-800">
                  {t.takenExamTimes} <strong>{exam.attempt_count} {(exam.attempt_count ?? 0) !== 1 ? t.times : t.time}</strong>
                  {exam.best_score != null && <> · Best: <strong>{exam.best_score}%</strong></>}
                  {exam.average_score != null && <> · Average: <strong>{exam.average_score}%</strong></>}
                </p>
                <p className="text-xs text-blue-700 mt-1">{t.youCanRetake}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 border-blue-200 bg-white hover:bg-blue-100 text-blue-800"
                  onClick={() =>
                    router.push(
                      `/student/exams/${exam.id}/results${
                        backHref
                          ? '?fromRun=1' + (courseRunAccessCode ? `&accessCode=${encodeURIComponent(courseRunAccessCode)}` : '')
                          : ''
                      }`
                    )
                  }
                >
                  {t.viewLastResults}
                </Button>
              </div>
            )}

            {/* Language Selection — only show when exam has multiple languages (e.g. course materials in one language don't need this) */}
            {availableLanguages.length > 1 && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <Globe className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <label className="text-base font-semibold text-gray-900">{t.availableLanguages}</label>
                    <p className="text-xs text-gray-500 mt-0.5">{t.selectPreferredLanguage}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {availableLanguages.map((langCode: string) => {
                    const countryCode = LANGUAGE_TO_COUNTRY[langCode] || 'un'
                    const langName = LANGUAGE_NAMES[langCode] || langCode
                    const isSelected = selectedLanguage === langCode
                    const isPrimary = exam.language ? langCode === exam.language : false

                    return (
                      <button
                        key={langCode}
                        type="button"
                        onClick={() => setSelectedLanguage(langCode)}
                        className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-green-500 bg-green-50 shadow-md scale-105'
                            : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/50 hover:shadow-sm'
                        }`}
                        title={langName}
                      >
                        <div className="relative flex-shrink-0">
                          <Image
                            src={`https://flagcdn.com/w40/${countryCode}.png`}
                            alt={langName}
                            width={28}
                            height={21}
                            className="rounded-sm object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className={`text-sm font-semibold ${
                            isSelected ? 'text-green-700' : 'text-gray-700'
                          }`}>
                            {langName}
                          </span>
                          {isPrimary && (
                            <span className="text-xs text-gray-500 mt-0.5">{t.original}</span>
                          )}
                        </div>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <Button
                onClick={handleStart}
                className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                size="lg"
              >
                <PlayCircle className="h-5 w-5 mr-2" />
                {t.startExam}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Exam taking interface
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Timer and Progress */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{exam.title}</h1>
              {exam.class_name && (
                <p className="text-sm text-gray-500 mt-1">{exam.class_name}</p>
              )}
            </div>
            {timeRemaining !== null && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg border border-red-200">
                <Clock className="h-5 w-5 text-red-600" />
                <span className="text-lg font-bold text-red-600">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-gray-600">
              {interpolateTake(t.questionOf, { current: currentQuestionIndex + 1, total: totalQuestions })}
            </p>
            <p className="text-sm text-gray-600">
              {Object.keys(answers).length} {t.answered}
            </p>
          </div>
        </div>
      </div>

      {/* Question Navigation Sidebar */}
      {showQuestionNav && (
        <div className="fixed inset-0 z-30 bg-black/50" onClick={() => setShowQuestionNav(false)}>
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">{t.questionNavigation}</h2>
                <button
                  onClick={() => setShowQuestionNav(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-5 gap-2">
                {displayQuestions.map((q, idx) => {
                  const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '' && (Array.isArray(answers[q.id]) ? (answers[q.id] as string[]).length > 0 : true)
                  const isCurrent = idx === currentQuestionIndex
                  
                  return (
                    <button
                      key={q.id}
                      onClick={() => handleGoToQuestion(idx)}
                      className={`aspect-square rounded-lg border-2 flex items-center justify-center text-sm font-medium transition-all ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                          : isAnswered
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {currentQuestion && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold flex-shrink-0 shadow-sm">
                {currentQuestionIndex + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {getQuestionTypeLabelTake(currentQuestion.type, t)}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-6 leading-relaxed">
                  <RichTextWithMath
                    content={
                      currentQuestion.question_html
                        ? currentQuestion.question_html
                        : (currentQuestion as { question?: string; text?: string }).question ||
                          (currentQuestion as { question?: string; text?: string }).text ||
                          ''
                    }
                    asHtml={Boolean(currentQuestion.question_html)}
                    as="div"
                  />
                </h3>

                {/* Answer Input */}
                {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                  <div className="space-y-3">
                    {currentQuestion.options.map((option: string, optIndex: number) => (
                      <label
                        key={optIndex}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          answers[currentQuestion.id] === option
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
                        }`}
                      >
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-700">
                          {variantLetter(optIndex)}
                        </span>
                        <input
                          type="radio"
                          name={currentQuestion.id}
                          value={option}
                          checked={answers[currentQuestion.id] === option}
                          onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                          className="h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-gray-700 font-medium flex-1">
                          <RichTextWithMath content={option} asHtml={false} />
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {currentQuestion.type === 'true_false' && (
                  <div className="grid grid-cols-2 gap-4">
                    {([['true', t.trueLabel], ['false', t.falseLabel]] as const).map(([value, label]) => (
                      <label
                        key={value}
                        className={`flex items-center justify-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all ${
                          answers[currentQuestion.id] === value
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
                        }`}
                      >
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-700">
                          {variantLetter(value === 'true' ? 0 : 1)}
                        </span>
                        <input
                          type="radio"
                          name={currentQuestion.id}
                          value={value}
                          checked={answers[currentQuestion.id] === value}
                          onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                          className="h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-gray-700 font-semibold text-lg">{label}</span>
                      </label>
                    ))}
                  </div>
                )}

                {currentQuestion.type === 'multiple_select' && currentQuestion.options && (
                  <div className="space-y-3">
                    {currentQuestion.options.map((option: string, optIndex: number) => {
                      const isChecked = (answers[currentQuestion.id] as string[] || []).includes(option)
                      return (
                        <label
                          key={optIndex}
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            isChecked
                              ? 'border-blue-500 bg-blue-50 shadow-sm'
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
                          }`}
                        >
                          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-700">
                            {variantLetter(optIndex)}
                          </span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const current = (answers[currentQuestion.id] as string[] || [])
                              const updated = e.target.checked
                                ? [...current, option]
                                : current.filter((a) => a !== option)
                              handleAnswerChange(currentQuestion.id, updated)
                            }}
                            className="h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500 rounded"
                          />
                          <span className="text-gray-700 font-medium flex-1">
                            <RichTextWithMath content={option} asHtml={false} />
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}

                {currentQuestion.type === 'fill_blank' && (
                  <input
                    type="text"
                    value={(answers[currentQuestion.id] as string) || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    className="w-full px-5 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder={t.enterAnswerPlaceholder}
                  />
                )}

                {currentQuestion.hint && (
                  <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm text-amber-800">
                      <strong className="font-semibold">💡 {t.hint}</strong> {currentQuestion.hint}
                    </p>
                  </div>
                )}

                {/* Explanations are only shown after submission on the results page */}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4 mt-6 mb-20">
          <Button
            onClick={handlePrevQuestion}
            disabled={currentQuestionIndex === 0}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            {t.previous}
          </Button>

          <Button
            onClick={() => setShowQuestionNav(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Navigation className="h-4 w-4" />
            {t.navigate}
          </Button>

          {currentQuestionIndex < totalQuestions - 1 && (
            <Button
              onClick={handleNextQuestion}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {t.next}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Bottom Submit Bar */}
      {currentQuestionIndex === totalQuestions - 1 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
            {error && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm space-y-2">
                <p>
                  {error === 'SESSION_EXPIRED'
                    ? t.sessionExpiredMessage
                    : error}
                </p>
                {(error === 'SESSION_EXPIRED' || error.toLowerCase().includes('session') || error.toLowerCase().includes('timeout')) && (
                  <Link
                    href={`/auth/login?redirectTo=${encodeURIComponent(`/student/exams/${exam.id}`)}`}
                    className="inline-flex items-center gap-1.5 font-medium text-amber-800 hover:text-amber-900 underline"
                  >
                    {t.signInAgain}
                  </Link>
                )}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {interpolateTake(t.questionsAnswered, { answered: Object.keys(answers).length, total: totalQuestions })}
              </div>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 text-lg px-8 py-6"
                size="lg"
              >
                {isSubmitting ? t.submitting : t.submitExam}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
