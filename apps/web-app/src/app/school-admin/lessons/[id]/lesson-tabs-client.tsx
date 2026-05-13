'use client'

import { useState } from 'react'
import { BookOpen, FileQuestion } from 'lucide-react'

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

export interface LessonTabsLabels {
  tabContent?: string
  tabMiniTest?: string
  chooseBestAnswers?: string
  checkAnswers?: string
  tryAgain?: string
  scoreLabel?: string
  noTestQuestions?: string
}

interface LessonTabsClientProps {
  content: string
  images: LessonImage[]
  miniTest: MiniTestQuestion[]
  centerText?: boolean
  labels?: LessonTabsLabels
}

type TabType = 'content' | 'test'

const DEFAULT_TABS_LABELS: LessonTabsLabels = {
  tabContent: 'Content',
  tabMiniTest: 'Mini Test',
  chooseBestAnswers: 'Choose the best answers, then click',
  checkAnswers: 'Check answers',
  tryAgain: 'Try again',
  scoreLabel: 'Score:',
  noTestQuestions: 'No test questions available for this lesson',
}

export function LessonTabsClient({ content, images, miniTest, centerText, labels = {} }: LessonTabsClientProps) {
  const L = { ...DEFAULT_TABS_LABELS, ...labels }
  const [activeTab, setActiveTab] = useState<TabType>('content')

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
  }

  return (
    <div className="overflow-visible rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex">
          <button onClick={() => handleTabChange('content')} className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium ${activeTab === 'content' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            <BookOpen className="h-4 w-4" /> {L.tabContent}
            {activeTab === 'content' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />}
          </button>
          {miniTest.length > 0 && (
            <button onClick={() => handleTabChange('test')} className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium ${activeTab === 'test' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <FileQuestion className="h-4 w-4" /> {L.tabMiniTest}
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700">{miniTest.length}</span>
              {activeTab === 'test' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />}
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'content' && (
          <div className={centerText ? 'text-center' : ''}>
            <div className="prose max-w-none whitespace-pre-wrap text-sm text-gray-800">{content}</div>
            {images.length > 0 && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {images.map((img, idx) => (
                  <a
                    key={`${img.url}-${idx}`}
                    href={img.url}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                  >
                    <div className="aspect-video w-full bg-gray-100">
                      <img
                        src={img.url}
                        alt={img.alt || `Image ${idx + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium text-gray-700">{img.alt || `Image ${idx + 1}`}</p>
                      <p className="mt-1 text-xs text-gray-500">{img.description}</p>
                    </div>
                  </a>
                ))}
              </div>
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
                  <p>{L.chooseBestAnswers}.</p>
                </div>
                {miniTest.map((q, qi) => (
                  <div key={qi} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <div className="border-b border-gray-200 bg-gray-50 p-4">
                      <p className="font-medium text-gray-900">{qi + 1}. {q.question}</p>
                    </div>
                    <div className="space-y-2 p-4">
                      {q.options.map((opt, oi) => {
                        const isCorrect = oi === q.correct_answer
                        return (
                          <div
                            key={oi}
                            className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left ${
                              isCorrect
                                ? 'border-gray-300 bg-gray-200'
                                : 'border-transparent bg-gray-50'
                            }`}
                          >
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-xs font-medium text-gray-600">
                              {String.fromCharCode(65 + oi)}
                            </span>
                            <span className="text-sm text-gray-800">{opt}</span>
                          </div>
                        )
                      })}
                    </div>
                    {q.explanation && (
                      <div className="px-4 pb-4">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">{q.explanation}</div>
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
