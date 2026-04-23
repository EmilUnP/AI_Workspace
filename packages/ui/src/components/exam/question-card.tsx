'use client'

import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { RichTextWithMath } from '../math/rich-text-with-math'

// Question type for student-facing exam taking (matches @eduator/core/types but defined locally to avoid TS rootDir issues)
interface Question {
  id: string
  type: 'multiple_choice' | 'true_false' | 'multiple_select' | 'fill_blank'
  question: string
  options?: string[]
  correct_answer: string | string[]
  difficulty: 'easy' | 'medium' | 'hard'
  points?: number
  explanation?: string
  hint?: string
  image_url?: string
  audio_url?: string
  tags?: string[]
  metadata?: unknown
  order: number
}

export interface QuestionCardProps {
  question: Question
  index: number
  selectedAnswer?: string | string[]
  onAnswerChange?: (answer: string | string[]) => void
  showCorrectAnswer?: boolean
  disabled?: boolean
  className?: string
}

export function QuestionCard({
  question,
  index,
  selectedAnswer,
  onAnswerChange,
  showCorrectAnswer = false,
  disabled = false,
  className,
}: QuestionCardProps) {
  const handleOptionClick = (option: string) => {
    if (disabled) return

    if (question.type === 'multiple_select') {
      const currentAnswers = Array.isArray(selectedAnswer) ? selectedAnswer : []
      const newAnswers = currentAnswers.includes(option)
        ? currentAnswers.filter((a) => a !== option)
        : [...currentAnswers, option]
      onAnswerChange?.(newAnswers)
    } else {
      onAnswerChange?.(option)
    }
  }

  const isSelected = (option: string) => {
    if (Array.isArray(selectedAnswer)) {
      return selectedAnswer.includes(option)
    }
    return selectedAnswer === option
  }

  const isCorrect = (option: string) => {
    if (!showCorrectAnswer) return null
    if (Array.isArray(question.correct_answer)) {
      return question.correct_answer.includes(option)
    }
    return question.correct_answer === option
  }

  const difficultyColor = {
    easy: 'success',
    medium: 'warning',
    hard: 'destructive',
  } as const

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-6 shadow-sm',
        className
      )}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-700">
            {index + 1}
          </span>
          <Badge variant={difficultyColor[question.difficulty]}>
            {question.difficulty}
          </Badge>
        </div>
        <Badge variant="outline">{question.type.replace('_', ' ')}</Badge>
      </div>

      {/* Question */}
      <p className="mb-6 text-lg font-medium text-gray-900">
        <RichTextWithMath content={question.question} asHtml={false} />
      </p>

      {/* Options */}
      {question.type === 'multiple_choice' || question.type === 'multiple_select' ? (
        <div className="space-y-3">
          {question.options?.map((option, optionIndex) => {
            const selected = isSelected(option)
            const correct = isCorrect(option)

            return (
              <button
                key={optionIndex}
                onClick={() => handleOptionClick(option)}
                disabled={disabled}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-all',
                  selected && !showCorrectAnswer && 'border-green-500 bg-green-50',
                  !selected && !showCorrectAnswer && 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                  showCorrectAnswer && correct && 'border-green-500 bg-green-50',
                  showCorrectAnswer && selected && !correct && 'border-red-500 bg-red-50',
                  disabled && 'cursor-not-allowed opacity-75'
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                    selected && !showCorrectAnswer && 'border-green-600 bg-green-600 text-white',
                    !selected && !showCorrectAnswer && 'border-gray-300 text-gray-500',
                    showCorrectAnswer && correct && 'border-green-600 bg-green-600 text-white',
                    showCorrectAnswer && selected && !correct && 'border-red-600 bg-red-600 text-white'
                  )}
                >
                  {String.fromCharCode(65 + optionIndex)}
                </span>
                <span className="text-gray-700">
                  <RichTextWithMath content={option} asHtml={false} />
                </span>
              </button>
            )
          })}
        </div>
      ) : question.type === 'true_false' ? (
        <div className="flex gap-4">
          {['True', 'False'].map((option) => {
            const selected = selectedAnswer === option.toLowerCase()
            const correct = isCorrect(option.toLowerCase())

            return (
              <button
                key={option}
                onClick={() => handleOptionClick(option.toLowerCase())}
                disabled={disabled}
                className={cn(
                  'flex-1 rounded-lg border p-4 text-center font-medium transition-all',
                  selected && !showCorrectAnswer && 'border-green-500 bg-green-50 text-green-700',
                  !selected && !showCorrectAnswer && 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50',
                  showCorrectAnswer && correct && 'border-green-500 bg-green-50 text-green-700',
                  showCorrectAnswer && selected && !correct && 'border-red-500 bg-red-50 text-red-700',
                  disabled && 'cursor-not-allowed opacity-75'
                )}
              >
                {option}
              </button>
            )
          })}
        </div>
      ) : question.type === 'fill_blank' ? (
        <input
          type="text"
          value={selectedAnswer as string || ''}
          onChange={(e) => onAnswerChange?.(e.target.value)}
          disabled={disabled}
          placeholder="Type your answer..."
          className={cn(
            'w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400',
            'focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500',
            disabled && 'cursor-not-allowed bg-gray-50 opacity-75'
          )}
        />
      ) : null}

      {/* Explanation */}
      {showCorrectAnswer && question.explanation && (
        <div className="mt-6 rounded-lg bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-800">Explanation:</p>
          <p className="mt-1 text-sm text-blue-700">
            <RichTextWithMath content={question.explanation} asHtml={false} />
          </p>
        </div>
      )}

      {/* Hint */}
      {!showCorrectAnswer && question.hint && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            Show hint
          </summary>
          <p className="mt-2 text-sm text-gray-600">{question.hint}</p>
        </details>
      )}
    </div>
  )
}
