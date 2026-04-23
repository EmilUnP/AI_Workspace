'use client'

import { useState } from 'react'
import { 
  BookOpen, 
  FileQuestion, 
  Lightbulb,
} from 'lucide-react'
import { LessonContent } from './lesson-content'
import { RichTextWithMath } from '../math/rich-text-with-math'

export interface LessonImage {
  url: string
  alt: string
  description: string
  position?: 'top' | 'middle' | 'bottom'
}

export interface MiniTestQuestion {
  question: string
  options: string[]
  correct_answer: number
  explanation: string
}

export interface Example {
  title: string
  description: string
  code?: string
}

export interface LessonTabsLabels {
  tabContent?: string
  tabExamples?: string
  tabMiniTest?: string
  chooseBestAnswers?: string
  checkAnswers?: string
  tryAgain?: string
  scoreLabel?: string
  noExamples?: string
  noTestQuestions?: string
  contentsLabel?: string
  expand?: string
  collapse?: string
  fullScreen?: string
}

interface LessonTabsProps {
  content: string
  images: LessonImage[]
  miniTest: MiniTestQuestion[]
  examples: Example[]
  /** When true, lesson content is rendered centered (from metadata.generation_options.centerText). */
  centerText?: boolean
  labels?: LessonTabsLabels
}

type TabType = 'content' | 'examples' | 'test'

const DEFAULT_TABS_LABELS: LessonTabsLabels = {
  tabContent: 'Content',
  tabExamples: 'Examples',
  tabMiniTest: 'Mini Test',
  chooseBestAnswers: 'Choose the best answers. When you are ready, click',
  checkAnswers: 'Check answers',
  tryAgain: 'Try again',
  scoreLabel: 'Score:',
  noExamples: 'No examples available for this lesson',
  noTestQuestions: 'No test questions available for this lesson',
  contentsLabel: 'Contents',
  expand: 'Expand',
  collapse: 'Collapse',
  fullScreen: 'Full screen',
}

export function LessonTabs({ content, images, miniTest, examples, centerText, labels = {} }: LessonTabsProps) {
  const L = { ...DEFAULT_TABS_LABELS, ...labels }
  const [activeTab, setActiveTab] = useState<TabType>('content')
  const [selectedOptions, setSelectedOptions] = useState<(number | null)[]>(
    () => miniTest.map(() => null)
  )
  const [checked, setChecked] = useState(false)

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId)
    if (tabId !== 'test') {
      setChecked(false)
      setSelectedOptions(miniTest.map(() => null))
    }
  }

  const handleSelectOption = (questionIndex: number, optionIndex: number) => {
    if (checked) return
    setSelectedOptions((prev) => {
      const next = [...prev]
      next[questionIndex] = optionIndex
      return next
    })
  }

  const handleCheckAnswers = () => {
    if (!checked) {
      setChecked(true)
    } else {
      // Reset for another try
      setChecked(false)
      setSelectedOptions(miniTest.map(() => null))
    }
  }

  const totalQuestions = miniTest.length
  const totalCorrect =
    checked
      ? miniTest.reduce((acc, q, idx) => {
          return acc + (selectedOptions[idx] === q.correct_answer ? 1 : 0)
        }, 0)
      : 0

  const tabs = [
    { id: 'content' as const, label: L.tabContent!, icon: BookOpen, count: null, color: 'blue' },
    { id: 'examples' as const, label: L.tabExamples!, icon: Lightbulb, count: examples.length, color: 'amber', hidden: examples.length === 0 },
    { id: 'test' as const, label: L.tabMiniTest!, icon: FileQuestion, count: miniTest.length, color: 'purple', hidden: miniTest.length === 0 },
  ].filter(tab => !('hidden' in tab) || !tab.hidden)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-visible">
      {/* Tab Headers */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all
                  ${isActive 
                    ? 'text-blue-600 bg-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== null && tab.count > 0 && (
                  <span className={`
                    ml-1 px-2 py-0.5 rounded-full text-xs font-semibold
                    ${isActive 
                      ? tab.color === 'purple' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="animate-in fade-in duration-200">
            <LessonContent content={content} images={images} centerText={centerText} labels={{ contentsLabel: L.contentsLabel, expand: L.expand, collapse: L.collapse, fullScreen: L.fullScreen }} />
          </div>
        )}

        {/* Examples Tab */}
        {activeTab === 'examples' && (
          <div className="animate-in fade-in duration-200 space-y-4">
            {examples.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>{L.noExamples}</p>
              </div>
            ) : (
              examples.map((example, index) => (
                <div 
                  key={index} 
                  className="group p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        <RichTextWithMath content={example.title} asHtml={false} />
                      </h3>
                      <p className="text-gray-700 leading-relaxed">
                        <RichTextWithMath content={example.description} asHtml={false} />
                      </p>
                      {example.code && (
                        <pre className="mt-4 p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm font-mono">
                          <code>{example.code}</code>
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Mini Test Tab */}
        {activeTab === 'test' && (
          <div className="animate-in fade-in duration-200 space-y-4">
            {miniTest.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileQuestion className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>{L.noTestQuestions}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3 text-xs sm:text-sm text-gray-600">
                  <p>
                    {L.chooseBestAnswers}{' '}
                    <span className="font-medium">{L.checkAnswers}</span>.
                  </p>
                  <div className="flex items-center gap-2">
                    {checked && (
                      <span className="text-xs font-medium text-purple-700">
                        {L.scoreLabel} {totalCorrect}/{totalQuestions}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleCheckAnswers}
                      className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100"
                    >
                      {checked ? L.tryAgain : L.checkAnswers}
                    </button>
                  </div>
                </div>
                {miniTest.map((question, index) => (
                <div 
                  key={index} 
                  className="rounded-xl border border-gray-200 overflow-hidden bg-white"
                >
                  {/* Question */}
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <p className="flex-1 font-medium text-gray-900 pt-1">
                        <RichTextWithMath content={question.question} asHtml={false} />
                      </p>
                    </div>
                  </div>
                  
                  {/* Options - correct answer always highlighted */}
                  <div className="p-4 space-y-2">
                    {question.options.map((option, optIndex) => {
                      const isSelected = selectedOptions[index] === optIndex
                      const isCorrect = checked && optIndex === question.correct_answer
                      const isWrongSelected = checked && isSelected && !isCorrect
                      
                      return (
                        <div
                          key={optIndex}
                          className={`
                            flex items-center gap-3 p-3 rounded-lg transition-all
                            ${
                              isCorrect
                                ? 'bg-green-50 border border-green-200'
                                : isWrongSelected
                                ? 'bg-red-50 border border-red-200'
                                : isSelected
                                ? 'bg-blue-50 border border-blue-200'
                                : 'bg-gray-50 border border-transparent'
                            }
                          `}
                          onClick={() => handleSelectOption(index, optIndex)}
                          role="button"
                          tabIndex={0}
                        >
                          <div className={`
                            flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-medium text-sm
                            ${
                              isCorrect
                                ? 'bg-green-500 text-white'
                                : isWrongSelected
                                ? 'bg-red-500 text-white'
                                : isSelected
                                ? 'bg-blue-500 text-white'
                                : 'bg-white border border-gray-300 text-gray-500'
                            }
                          `}>
                            {String.fromCharCode(65 + optIndex)}
                          </div>
                          <span
                            className={`flex-1 text-sm ${
                              isCorrect
                                ? 'text-green-800 font-medium'
                                : isWrongSelected
                                ? 'text-red-800 font-medium'
                                : isSelected
                                ? 'text-blue-800 font-medium'
                                : 'text-gray-600'
                            }`}
                          >
                            <RichTextWithMath content={option} asHtml={false} />
                          </span>
                          {isCorrect && (
                            <span className="text-green-600 text-xl flex-shrink-0">✓</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Explanation */}
                  {checked && question.explanation && (
                    <div className="px-4 pb-4">
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
                        💡 <RichTextWithMath content={question.explanation} asHtml={false} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
