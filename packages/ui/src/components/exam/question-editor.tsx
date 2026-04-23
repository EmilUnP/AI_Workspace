'use client'

import { CheckCircle, X } from 'lucide-react'
import type { Question, DifficultyLevel } from './exam-creator'

export interface QuestionEditorTranslations {
  questionLabel: string
  questionPlaceholder: string
  optionsSelectOne: string
  optionsSelectAll: string
  optionLetter: string
  correctAnswerLabel: string
  correctAnswerPlaceholder: string
  explanationLabel: string
  explanationPlaceholder: string
  topicsLabel: string
  topicPlaceholder: string
  removeTopic: string
  addTopic: string
  difficultyLabel: string
  done: string
  difficultyEasy: string
  difficultyMedium: string
  difficultyHard: string
}

const DEFAULT_QUESTION_EDITOR_TRANSLATIONS: QuestionEditorTranslations = {
  questionLabel: 'Question',
  questionPlaceholder: 'Enter your question...',
  optionsSelectOne: 'Options (select correct answer)',
  optionsSelectAll: 'Options (select all correct answers)',
  optionLetter: 'Option',
  correctAnswerLabel: 'Correct Answer',
  correctAnswerPlaceholder: 'Enter the correct answer...',
  explanationLabel: 'Explanation (Optional)',
  explanationPlaceholder: 'Explain why this answer is correct...',
  topicsLabel: 'Topics (Optional - up to 5)',
  topicPlaceholder: 'Topic',
  removeTopic: 'Remove topic',
  addTopic: '+ Add Topic',
  difficultyLabel: 'Difficulty',
  done: 'Done',
  difficultyEasy: 'Easy',
  difficultyMedium: 'Medium',
  difficultyHard: 'Hard',
}

export interface QuestionEditorProps {
  question: Question
  onUpdate: (updates: Partial<Question>) => void
  onClose: () => void
  /** Optional translations for labels and placeholders */
  translations?: Partial<QuestionEditorTranslations>
}

export function QuestionEditor({ question, onUpdate, onClose, translations: tProp }: QuestionEditorProps) {
  const t: QuestionEditorTranslations = { ...DEFAULT_QUESTION_EDITOR_TRANSLATIONS, ...tProp }

  return (
    <div className="space-y-4">
      {/* Question Text */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">{t.questionLabel}</label>
        <textarea
          value={question.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          rows={3}
          className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
          placeholder={t.questionPlaceholder}
        />
      </div>

      {/* Multiple Choice Options */}
      {question.type === 'multiple_choice' && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">{t.optionsSelectOne}</label>
          <div className="space-y-2">
            {question.options.map((option, i) => (
              <div key={i} className="flex items-center gap-3">
                <input
                  type="radio"
                  checked={question.correctAnswer === option && option !== ''}
                  onChange={() => onUpdate({ correctAnswer: option })}
                  className="h-5 w-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...question.options]
                    newOptions[i] = e.target.value
                    onUpdate({ options: newOptions })
                  }}
                  className="flex-1 rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder={`${t.optionLetter} ${String.fromCharCode(65 + i)}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Multiple Select Options */}
      {question.type === 'multiple_select' && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">{t.optionsSelectAll}</label>
          <div className="space-y-2">
            {question.options.map((option, i) => {
              const correctAnswers = Array.isArray(question.correctAnswer) ? question.correctAnswer : []
              const isChecked = correctAnswers.includes(option) && option !== ''
              return (
                <div key={i} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const currentAnswers = Array.isArray(question.correctAnswer) ? [...question.correctAnswer] : []
                      if (e.target.checked) {
                        if (!currentAnswers.includes(option)) {
                          currentAnswers.push(option)
                        }
                      } else {
                        const index = currentAnswers.indexOf(option)
                        if (index > -1) {
                          currentAnswers.splice(index, 1)
                        }
                      }
                      onUpdate({ correctAnswer: currentAnswers })
                    }}
                    className="h-5 w-5 text-purple-600 border-gray-300 focus:ring-purple-500 rounded"
                  />
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...question.options]
                      newOptions[i] = e.target.value
                      // Update correct answers if this option was selected
                      const currentAnswers = Array.isArray(question.correctAnswer) ? [...question.correctAnswer] : []
                      const oldOption = question.options[i]
                      if (currentAnswers.includes(oldOption)) {
                        const index = currentAnswers.indexOf(oldOption)
                        currentAnswers[index] = e.target.value
                      }
                      onUpdate({ options: newOptions, correctAnswer: currentAnswers })
                    }}
                    className="flex-1 rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    placeholder={`${t.optionLetter} ${String.fromCharCode(65 + i)}`}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* True/False — use question.options so value matches stored correctAnswer */}
      {question.type === 'true_false' && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">{t.correctAnswerLabel}</label>
          <div className="flex gap-4">
            {(question.options || []).map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={question.correctAnswer === opt}
                  onChange={() => onUpdate({ correctAnswer: opt })}
                  className="h-5 w-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Fill Blank */}
      {question.type === 'fill_blank' && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">{t.correctAnswerLabel}</label>
          <input
            type="text"
            value={question.correctAnswer as string}
            onChange={(e) => onUpdate({ correctAnswer: e.target.value })}
            className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            placeholder={t.correctAnswerPlaceholder}
          />
        </div>
      )}

      {/* Explanation */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">{t.explanationLabel}</label>
        <textarea
          value={question.explanation || ''}
          onChange={(e) => onUpdate({ explanation: e.target.value || undefined })}
          rows={2}
          className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
          placeholder={t.explanationPlaceholder}
        />
      </div>

      {/* Topics */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">{t.topicsLabel}</label>
        <div className="space-y-2">
          {(question.topics || []).map((topic, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={topic}
                onChange={(e) => {
                  const newTopics = [...(question.topics || [])]
                  newTopics[index] = e.target.value.trim()
                  onUpdate({ topics: newTopics.filter(t => t.length > 0) })
                }}
                className="flex-1 rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                placeholder={`${t.topicPlaceholder} ${index + 1}`}
              />
              <button
                type="button"
                onClick={() => {
                  const newTopics = [...(question.topics || [])]
                  newTopics.splice(index, 1)
                  onUpdate({ topics: newTopics.length > 0 ? newTopics : undefined })
                }}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title={t.removeTopic}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {(question.topics || []).length < 5 && (
            <button
              type="button"
              onClick={() => {
                const newTopics = [...(question.topics || []), '']
                onUpdate({ topics: newTopics })
              }}
              className="w-full px-3 py-2 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg border-2 border-dashed border-purple-200 transition-colors"
            >
              {t.addTopic}
            </button>
          )}
        </div>
      </div>

      {/* Difficulty & Done */}
      <div className="flex items-center gap-3 pt-2 flex-wrap">
        <div className="w-32">
          <label className="block text-sm font-semibold text-gray-700 mb-1">{t.difficultyLabel}</label>
          <select
            value={question.difficulty || 'medium'}
            onChange={(e) => onUpdate({ difficulty: e.target.value as DifficultyLevel })}
            className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="easy">{t.difficultyEasy}</option>
            <option value="medium">{t.difficultyMedium}</option>
            <option value="hard">{t.difficultyHard}</option>
          </select>
        </div>
        <button
          onClick={onClose}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 shadow-md transition-colors"
        >
          <CheckCircle className="h-4 w-4" />
          {t.done}
        </button>
      </div>
    </div>
  )
}
