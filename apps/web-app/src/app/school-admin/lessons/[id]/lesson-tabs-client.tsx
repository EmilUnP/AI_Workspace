'use client'

import { useState } from 'react'
import { BookOpen, FileQuestion, Lightbulb } from 'lucide-react'

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
}

interface LessonTabsClientProps {
  content: string
  images: LessonImage[]
  miniTest: MiniTestQuestion[]
  examples: Example[]
  centerText?: boolean
  labels?: LessonTabsLabels
}

type TabType = 'content' | 'examples' | 'test'

const DEFAULT_TABS_LABELS: LessonTabsLabels = {
  tabContent: 'Content',
  tabExamples: 'Examples',
  tabMiniTest: 'Mini Test',
  chooseBestAnswers: 'Choose the best answers, then click',
  checkAnswers: 'Check answers',
  tryAgain: 'Try again',
  scoreLabel: 'Score:',
  noExamples: 'No examples available for this lesson',
  noTestQuestions: 'No test questions available for this lesson',
}

export function LessonTabsClient({ content, images, miniTest, examples, centerText, labels = {} }: LessonTabsClientProps) {
  const L = { ...DEFAULT_TABS_LABELS, ...labels }
  const [activeTab, setActiveTab] = useState<TabType>('content')
  const [selectedOptions, setSelectedOptions] = useState<(number | null)[]>(() => miniTest.map(() => null))
  const [checked, setChecked] = useState(false)

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    if (tab !== 'test') {
      setChecked(false)
      setSelectedOptions(miniTest.map(() => null))
    }
  }

  const totalCorrect = checked
    ? miniTest.reduce((acc, q, idx) => acc + (selectedOptions[idx] === q.correct_answer ? 1 : 0), 0)
    : 0

  return (
    <div className="overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex">
          <button onClick={() => handleTabChange('content')} className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium ${activeTab === 'content' ? 'bg-white text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            <BookOpen className="h-4 w-4" /> {L.tabContent}
            {activeTab === 'content' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
          </button>
          {examples.length > 0 && (
            <button onClick={() => handleTabChange('examples')} className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium ${activeTab === 'examples' ? 'bg-white text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              <Lightbulb className="h-4 w-4" /> {L.tabExamples}
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{examples.length}</span>
              {activeTab === 'examples' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
            </button>
          )}
          {miniTest.length > 0 && (
            <button onClick={() => handleTabChange('test')} className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium ${activeTab === 'test' ? 'bg-white text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              <FileQuestion className="h-4 w-4" /> {L.tabMiniTest}
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">{miniTest.length}</span>
              {activeTab === 'test' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'content' && (
          <div className={centerText ? 'text-center' : ''}>
            <div className="prose max-w-none whitespace-pre-wrap text-sm text-gray-800">{content}</div>
            {images.length > 0 && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {images.map((img, idx) => (
                  <a key={`${img.url}-${idx}`} href={img.url} target="_blank" rel="noreferrer" className="rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
                    <p className="text-xs font-medium text-gray-700">{img.alt || `Image ${idx + 1}`}</p>
                    <p className="mt-1 text-xs text-gray-500">{img.description}</p>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'examples' && (
          <div className="space-y-3">
            {examples.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">{L.noExamples}</p>
            ) : (
              examples.map((ex, i) => (
                <div key={i} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-semibold text-gray-900">{ex.title}</p>
                  <p className="mt-1 text-sm text-gray-700">{ex.description}</p>
                  {ex.code && <pre className="mt-3 overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">{ex.code}</pre>}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'test' && (
          <div className="space-y-4">
            {miniTest.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">{L.noTestQuestions}</p>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between text-xs text-gray-600 sm:text-sm">
                  <p>{L.chooseBestAnswers} <span className="font-medium">{L.checkAnswers}</span>.</p>
                  <div className="flex items-center gap-2">
                    {checked && <span className="font-medium text-purple-700">{L.scoreLabel} {totalCorrect}/{miniTest.length}</span>}
                    <button
                      type="button"
                      onClick={() => {
                        if (!checked) setChecked(true)
                        else {
                          setChecked(false)
                          setSelectedOptions(miniTest.map(() => null))
                        }
                      }}
                      className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100"
                    >
                      {checked ? L.tryAgain : L.checkAnswers}
                    </button>
                  </div>
                </div>
                {miniTest.map((q, qi) => (
                  <div key={qi} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <div className="border-b border-gray-200 bg-gray-50 p-4">
                      <p className="font-medium text-gray-900">{qi + 1}. {q.question}</p>
                    </div>
                    <div className="space-y-2 p-4">
                      {q.options.map((opt, oi) => {
                        const isSelected = selectedOptions[qi] === oi
                        const isCorrect = checked && oi === q.correct_answer
                        const isWrongSelected = checked && isSelected && !isCorrect
                        return (
                          <button
                            key={oi}
                            type="button"
                            onClick={() => {
                              if (checked) return
                              setSelectedOptions((prev) => {
                                const next = [...prev]
                                next[qi] = oi
                                return next
                              })
                            }}
                            className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left ${
                              isCorrect
                                ? 'border-green-200 bg-green-50'
                                : isWrongSelected
                                  ? 'border-red-200 bg-red-50'
                                  : isSelected
                                    ? 'border-blue-200 bg-blue-50'
                                    : 'border-transparent bg-gray-50'
                            }`}
                          >
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-xs font-medium text-gray-600">
                              {String.fromCharCode(65 + oi)}
                            </span>
                            <span className="text-sm text-gray-800">{opt}</span>
                          </button>
                        )
                      })}
                    </div>
                    {checked && q.explanation && (
                      <div className="px-4 pb-4">
                        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">{q.explanation}</div>
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
