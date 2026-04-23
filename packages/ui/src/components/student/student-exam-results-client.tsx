'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Award,
  BookOpen,
  AlertCircle,
  Lock,
  FileDown,
} from 'lucide-react'
import { Button } from '../ui/button'
import { RichTextWithMath } from '../math/rich-text-with-math'
import type { ExamResultData } from '@eduator/core/utils/student-exam-results'

export interface StudentExamResultsClientTranslations {
  backToExams: string
  submittedMessage: string
  resultsNotAvailable: string
  teacherWillShareResults: string
  submittedOn: string
  correct: string
  viewCertificateDownload: string
  incorrect: string
  unanswered: string
  total: string
  questionReview: string
  reviewCorrectSolutions: string
  correctOnlyShown: string
  reviewNoCorrectShown: string
  question: string
  correctAnswer: string
  yourAnswer: string
  explanation: string
  noAnswerProvided: string
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

function interpolateResults(str: string, values: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? key))
}

const DEFAULT_RESULTS_TRANSLATIONS: StudentExamResultsClientTranslations = {
  backToExams: 'Back to Exams',
  submittedMessage: 'You have submitted this exam.',
  resultsNotAvailable: 'Results are not yet available',
  teacherWillShareResults: 'Your teacher will share the results when they are ready. You can check back later or they will notify you.',
  submittedOn: 'Submitted on',
  correct: 'correct',
  viewCertificateDownload: 'View certificate & download PDF',
  incorrect: 'Incorrect',
  unanswered: 'Unanswered',
  total: 'Total',
  questionReview: 'Question Review',
  reviewCorrectSolutions: 'Review your answers and see the correct solutions',
  correctOnlyShown: 'Correct answers and explanations are shown only for questions you answered correctly.',
  reviewNoCorrectShown: 'Review your answers. Correct answers and explanations are not shown for this exam.',
  question: 'Question',
  correctAnswer: 'Correct Answer',
  yourAnswer: 'Your Answer',
  explanation: 'Explanation',
  noAnswerProvided: '(No answer provided)',
  trueLabel: 'True',
  falseLabel: 'False',
  finalExamForTitle: 'Final exam for {title}.',
  examPassingMessage: 'Passing this exam (70% or higher) indicates successful completion of the course.',
  questionTypeMultipleChoice: 'Multiple choice',
  questionTypeTrueFalse: 'True / False',
  questionTypeMultipleSelect: 'Multiple select',
  questionTypeFillBlank: 'Fill in the blank',
}

const QUESTION_TYPE_KEYS: Record<string, keyof StudentExamResultsClientTranslations> = {
  multiple_choice: 'questionTypeMultipleChoice',
  true_false: 'questionTypeTrueFalse',
  multiple_select: 'questionTypeMultipleSelect',
  fill_blank: 'questionTypeFillBlank',
}

function getQuestionTypeLabel(
  type: string,
  t: StudentExamResultsClientTranslations
): string {
  const key = QUESTION_TYPE_KEYS[type]
  if (key && t[key]) return t[key] as string
  return type.replace(/_/g, ' ')
}

export interface StudentExamResultsClientProps {
  results: ExamResultData
  /** When set (e.g. from course run), back link goes here instead of /student/exams. */
  backHref?: string
  /** Label for back link, e.g. "Back to My Courses". */
  backLabel?: string
  /** When set and student passed, show link to view/download course certificate. */
  certificateHref?: string
  /** Optional translations for all UI strings. */
  translations?: Partial<StudentExamResultsClientTranslations>
}

export function StudentExamResultsClient({ results, backHref, backLabel, certificateHref, translations: tProp }: StudentExamResultsClientProps) {
  const t = { ...DEFAULT_RESULTS_TRANSLATIONS, ...tProp }
  const { exam, submission, questionResults, statistics, showCorrectAnswers = true, showExplanations = true, resultsHidden, passingScore = 70 } = results
  const passed = statistics.percentage >= passingScore
  const showCertificateLink = !!certificateHref && passed
  const backLinkHref = backHref ?? '/student/exams'
  const backLinkLabel = backLabel ?? t.backToExams

  if (resultsHidden) {
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
          <div className="px-6 py-5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
            <h1 className="text-xl font-bold text-gray-900 mb-2">{exam.title}</h1>
            <p className="text-gray-600">{t.submittedMessage}</p>
          </div>
          <div className="px-6 py-8 flex flex-col items-center justify-center text-center">
            <Lock className="h-12 w-12 text-amber-600 mb-4" />
            <p className="text-lg font-medium text-gray-900">{t.resultsNotAvailable}</p>
            <p className="mt-2 text-sm text-gray-600 max-w-md">
              {t.teacherWillShareResults}
            </p>
            {submission?.submitted_at && (
              <p className="mt-4 text-xs text-gray-500">
                {t.submittedOn} {new Date(submission.submitted_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-50 border-green-200'
    if (percentage >= 60) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  return (
    <div className="space-y-6">
      <Link
        href={backLinkHref}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLinkLabel}
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{exam.title}</h1>
          {(t.finalExamForTitle && t.examPassingMessage) ? (
            <p className="text-gray-600">
              <span className="rich-text-with-math">
                {interpolateResults(t.finalExamForTitle, { title: exam.title })} {t.examPassingMessage}
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

        {/* Score Summary */}
        <div className="px-6 py-6">
          <div className={`rounded-xl border-2 p-6 text-center ${getScoreBgColor(statistics.percentage)}`}>
            <div className="flex items-center justify-center mb-4">
              <div className={`text-6xl font-bold ${getScoreColor(statistics.percentage)}`}>
                {statistics.percentage}%
              </div>
            </div>
            <p className="text-lg font-semibold text-gray-700 mb-2">
              {statistics.pointsEarned} / {statistics.totalPoints} {t.correct}
            </p>
            <p className="text-sm text-gray-600">
              {submission.submitted_at && (
                <>{t.submittedOn} {new Date(submission.submitted_at).toLocaleString()}</>
              )}
            </p>
            {showCertificateLink && (
              <div className="mt-4">
                <Link
                  href={certificateHref}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-200 transition-colors"
                >
                  <FileDown className="h-4 w-4" />
                  {t.viewCertificateDownload}
                </Link>
              </div>
            )}
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-700">{statistics.correctAnswers}</p>
              <p className="text-sm text-green-600">{t.correct.charAt(0).toUpperCase() + t.correct.slice(1)}</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <XCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-700">{statistics.incorrectAnswers}</p>
              <p className="text-sm text-red-600">{t.incorrect}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <AlertCircle className="h-6 w-6 text-gray-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-700">{statistics.unanswered}</p>
              <p className="text-sm text-gray-600">{t.unanswered}</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Award className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-700">{statistics.totalQuestions}</p>
              <p className="text-sm text-blue-600">{t.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Question Results */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t.questionReview}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {showCorrectAnswers || showExplanations
              ? t.reviewCorrectSolutions
              : questionResults.some((r) => r.correctAnswer != null || r.explanation)
                ? t.correctOnlyShown
                : t.reviewNoCorrectShown}
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {questionResults.map((result, index) => (
            <div
              key={result.questionId}
              className={`p-6 ${
                result.isCorrect ? 'bg-green-50/30' : 'bg-red-50/30'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${
                  result.isCorrect
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {result.isCorrect ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    <XCircle className="h-6 w-6" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-500">
                      {t.question} {index + 1}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {getQuestionTypeLabel(result.type, t)}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className={`text-sm font-semibold ${
                      result.isCorrect ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {result.pointsEarned} / {result.points} {t.correct}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    <RichTextWithMath
                      content={result.question_html ?? result.question ?? ''}
                      asHtml={Boolean(result.question_html)}
                      as="div"
                    />
                  </h3>

                  {/* Options Display - Only for multiple choice and multiple select (not true/false) */}
                  {result.type !== 'true_false' && result.type !== 'fill_blank' && result.options && result.options.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {result.options.map((option: string, optIndex: number) => {
                        const variantLetter = String.fromCharCode(65 + optIndex)
                        const isStudentAnswer = 
                          result.type === 'multiple_choice'
                            ? String(result.studentAnswer) === String(option)
                            : Array.isArray(result.studentAnswer) && result.studentAnswer.includes(option)
                        
                        const isCorrectAnswer = result.correctAnswer != null && (
                          result.type === 'multiple_choice'
                            ? String(result.correctAnswer) === String(option)
                            : Array.isArray(result.correctAnswer) && result.correctAnswer.includes(option)
                        )

                        return (
                          <div
                            key={optIndex}
                            className={`p-3 rounded-lg border-2 ${
                              isCorrectAnswer
                                ? 'border-green-500 bg-green-50'
                                : isStudentAnswer && !result.isCorrect
                                ? 'border-red-500 bg-red-50'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-gray-200 text-xs font-bold text-gray-700">
                                {variantLetter}
                              </span>
                              {isCorrectAnswer && (
                                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                              )}
                              {isStudentAnswer && !result.isCorrect && (
                                <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                              )}
                              <span className={`text-sm ${
                                isCorrectAnswer
                                  ? 'font-semibold text-green-700'
                                  : isStudentAnswer && !result.isCorrect
                                  ? 'font-medium text-red-700'
                                  : 'text-gray-700'
                              }`}>
                                <RichTextWithMath content={option} asHtml={false} />
                              </span>
                              {isCorrectAnswer && (
                                <span className="ml-auto text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                                  {t.correctAnswer}
                                </span>
                              )}
                              {isStudentAnswer && !result.isCorrect && (
                                <span className="ml-auto text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded">
                                  {t.yourAnswer}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Fill in the blank display */}
                  {result.type === 'fill_blank' && (
                    <div className="space-y-3">
                      {result.correctAnswer != null && (
                        <div className="p-3 rounded-lg border-2 border-green-500 bg-green-50">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-xs font-medium text-green-700">{t.correctAnswer}</span>
                          </div>
                          <p className="text-sm font-semibold text-green-700">
                            {String(result.correctAnswer)}
                          </p>
                        </div>
                      )}
                      {!result.isCorrect && (
                        <div className="p-3 rounded-lg border-2 border-red-500 bg-red-50">
                          <div className="flex items-center gap-2 mb-1">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-xs font-medium text-red-700">{t.yourAnswer}</span>
                          </div>
                          <p className="text-sm font-semibold text-red-700">
                            {String(result.studentAnswer) || t.noAnswerProvided}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* True/False display */}
                  {result.type === 'true_false' && (
                    <div className="space-y-2 mb-4">
                      {/* True option */}
                      <div className={`p-3 rounded-lg border-2 ${
                        result.correctAnswer != null && String(result.correctAnswer).toLowerCase() === 'true'
                          ? 'border-green-500 bg-green-50'
                          : String(result.studentAnswer).toLowerCase() === 'true' && !result.isCorrect
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 bg-white'
                      }`}>
                        <div className="flex items-center gap-2">
                          {result.correctAnswer != null && String(result.correctAnswer).toLowerCase() === 'true' && (
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                          )}
                          {String(result.studentAnswer).toLowerCase() === 'true' && !result.isCorrect && (
                            <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                          )}
                          <span className={`text-sm ${
                            result.correctAnswer != null && String(result.correctAnswer).toLowerCase() === 'true'
                              ? 'font-semibold text-green-700'
                              : String(result.studentAnswer).toLowerCase() === 'true' && !result.isCorrect
                              ? 'font-medium text-red-700'
                              : 'text-gray-700'
                          }`}>
                            {t.trueLabel}
                          </span>
                          {result.correctAnswer != null && String(result.correctAnswer).toLowerCase() === 'true' && (
                            <span className="ml-auto text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                              {t.correctAnswer}
                            </span>
                          )}
                          {String(result.studentAnswer).toLowerCase() === 'true' && !result.isCorrect && (
                            <span className="ml-auto text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded">
                              {t.yourAnswer}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* False option */}
                      <div className={`p-3 rounded-lg border-2 ${
                        result.correctAnswer != null && String(result.correctAnswer).toLowerCase() === 'false'
                          ? 'border-green-500 bg-green-50'
                          : String(result.studentAnswer).toLowerCase() === 'false' && !result.isCorrect
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 bg-white'
                      }`}>
                        <div className="flex items-center gap-2">
                          {result.correctAnswer != null && String(result.correctAnswer).toLowerCase() === 'false' && (
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                          )}
                          {String(result.studentAnswer).toLowerCase() === 'false' && !result.isCorrect && (
                            <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                          )}
                          <span className={`text-sm ${
                            result.correctAnswer != null && String(result.correctAnswer).toLowerCase() === 'false'
                              ? 'font-semibold text-green-700'
                              : String(result.studentAnswer).toLowerCase() === 'false' && !result.isCorrect
                              ? 'font-medium text-red-700'
                              : 'text-gray-700'
                          }`}>
                            {t.falseLabel}
                          </span>
                          {result.correctAnswer != null && String(result.correctAnswer).toLowerCase() === 'false' && (
                            <span className="ml-auto text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                              {t.correctAnswer}
                            </span>
                          )}
                          {String(result.studentAnswer).toLowerCase() === 'false' && !result.isCorrect && (
                            <span className="ml-auto text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded">
                              {t.yourAnswer}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Show student answer if unanswered */}
                      {(!result.studentAnswer || String(result.studentAnswer).trim() === '') && (
                        <div className="mt-3 p-3 rounded-lg border-2 border-gray-300 bg-gray-50">
                          <p className="text-sm text-gray-600 italic">
                            {t.yourAnswer}: <span className="font-medium">{t.noAnswerProvided}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {result.explanation && (
                    <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <p className="text-sm font-semibold text-emerald-800 mb-2">{t.explanation}</p>
                      <p className="text-sm text-emerald-800 leading-relaxed">
                        <RichTextWithMath content={result.explanation} asHtml={false} />
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-4">
        <Button
          asChild
          variant="outline"
          className="flex items-center gap-2"
        >
          <Link href={backLinkHref}>
            <ArrowLeft className="h-4 w-4" />
            {backLinkLabel}
          </Link>
        </Button>
      </div>
    </div>
  )
}
