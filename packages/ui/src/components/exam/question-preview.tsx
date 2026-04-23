'use client'

import { CheckCircle } from 'lucide-react'
import { RichTextWithMath } from '../math/rich-text-with-math'
import type { Question } from './exam-creator'

export interface QuestionPreviewProps {
  question: Question
  /** When set, True/False options are shown in this locale (e.g. "Doğru"/"Yanlış"); correctAnswer is matched against both English and these labels. */
  trueFalseLabels?: { optionTrue: string; optionFalse: string }
}

export function QuestionPreview({ question, trueFalseLabels }: QuestionPreviewProps) {
  return (
    <div>
      <p className="text-gray-900 font-medium mb-4 text-base leading-relaxed">
        <RichTextWithMath content={question.text} asHtml={false} />
      </p>

      {question.type === 'multiple_choice' && question.options && (
        <div className="grid gap-2 sm:grid-cols-2">
          {question.options.map((option, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors ${
                option === question.correctAnswer
                  ? 'bg-green-50 border-2 border-green-300 text-green-800'
                  : 'bg-gray-50 border border-gray-100 text-gray-600'
              }`}
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                option === question.correctAnswer ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">
                <RichTextWithMath content={option} asHtml={false} />
              </span>
              {option === question.correctAnswer && (
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}

      {question.type === 'true_false' && (() => {
        const canonical: ['True', 'False'] = ['True', 'False']
        const labels = trueFalseLabels
          ? [trueFalseLabels.optionTrue, trueFalseLabels.optionFalse]
          : (question.options && question.options.length === 2 ? question.options : canonical)
        return (
          <div className="flex gap-3">
            {canonical.map((canon, idx) => {
              const label = labels[idx]
              const isCorrect = question.correctAnswer === canon || question.correctAnswer === label
              return (
                <div
                  key={canon}
                  className={`flex-1 rounded-lg px-4 py-3 text-sm text-center font-medium transition-colors ${
                    isCorrect
                      ? 'bg-green-50 border-2 border-green-300 text-green-800'
                      : 'bg-gray-50 border border-gray-100 text-gray-500'
                  }`}
                >
                  {label}
                  {isCorrect && (
                    <CheckCircle className="inline-block ml-2 h-4 w-4 text-green-500" />
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}

      {question.type === 'multiple_select' && question.options && (
        <div className="grid gap-2 sm:grid-cols-2">
          {question.options.map((option, i) => {
            const correctAnswers = Array.isArray(question.correctAnswer) ? question.correctAnswer : []
            const isCorrect = correctAnswers.includes(option)
            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors ${
                  isCorrect
                    ? 'bg-green-50 border-2 border-green-300 text-green-800'
                    : 'bg-gray-50 border border-gray-100 text-gray-600'
                }`}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">
                  <RichTextWithMath content={option} asHtml={false} />
                </span>
                {isCorrect && (
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      )}

      {question.type === 'fill_blank' && (
        <div className="rounded-lg bg-green-50 border-2 border-green-300 px-4 py-3 text-sm">
          <span className="text-green-600 font-semibold">Answer:</span>{' '}
          <span className="text-green-800 font-medium">
            <RichTextWithMath content={String(question.correctAnswer)} asHtml={false} />
          </span>
        </div>
      )}

      {question.explanation && (
        <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
          <strong className="font-semibold">Explanation:</strong>{' '}
          <RichTextWithMath content={question.explanation} asHtml={false} />
        </div>
      )}
    </div>
  )
}
