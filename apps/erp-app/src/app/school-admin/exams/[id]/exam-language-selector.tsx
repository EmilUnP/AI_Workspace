'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import {
  FileText,
  CheckCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { CONTENT_LANGUAGES } from '@eduator/config/constants'
import { RichTextWithMath } from '@eduator/ui'

type DifficultyLevel = 'easy' | 'medium' | 'hard'

interface Question {
  id: string
  type: 'multiple_choice' | 'true_false' | 'multiple_select' | 'fill_blank'
  text: string
  options: string[]
  correctAnswer: string | string[]
  explanation?: string
  difficulty?: DifficultyLevel
  topics?: string[]
}

interface ExamLanguageSelectorProps {
  examId: string
  examTitle?: string
  primaryLanguage: string
  questions: Question[]
  translations: Record<string, Question[]>
}

const LANGUAGES: Record<string, { name: string; countryCode: string }> = CONTENT_LANGUAGES.reduce(
  (acc, lang) => {
    acc[lang.code] = { name: lang.name, countryCode: lang.countryCode }
    return acc
  },
  {} as Record<string, { name: string; countryCode: string }>
)

// Flag component using flagcdn.com
function FlagIcon({ countryCode, size = 24 }: { countryCode: string; size?: number }) {
  return (
    <Image
      src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
      alt={countryCode}
      width={size}
      height={Math.round(size * 0.75)}
      className="rounded-sm object-cover"
      unoptimized
    />
  )
}

const questionTypeColors: Record<string, string> = {
  multiple_choice: 'bg-blue-100 text-blue-700',
  true_false: 'bg-green-100 text-green-700',
  multiple_select: 'bg-purple-100 text-purple-700',
  fill_blank: 'bg-orange-100 text-orange-700',
}

const difficultyColors: Record<DifficultyLevel, string> = {
  easy: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  medium: 'bg-amber-100 text-amber-700 border-amber-300',
  hard: 'bg-red-100 text-red-700 border-red-300',
}

const QUESTIONS_PER_PAGE = 10

export function ExamLanguageSelector({ 
  examTitle = 'Exam',
  primaryLanguage,
  questions,
  translations: initialTranslations 
}: ExamLanguageSelectorProps) {
  const t = useTranslations('teacherExams')
  const [currentLanguage, setCurrentLanguage] = useState(primaryLanguage)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string | null>(null)

  const questionTypeLabels: Record<string, string> = useMemo(() => ({
    multiple_choice: t('multipleChoice'),
    true_false: t('trueFalse'),
    multiple_select: t('multipleSelect'),
    fill_blank: t('fillBlank'),
  }), [t])
  const difficultyLabels: Record<DifficultyLevel, string> = useMemo(() => ({
    easy: t('difficultyEasy'),
    medium: t('difficultyMedium'),
    hard: t('difficultyHard'),
  }), [t])

  // Get all unique topics from questions
  const allTopics = useMemo(() => {
    const topicSet = new Set<string>()
    questions.forEach(q => {
      if (q.topics && q.topics.length > 0) {
        q.topics.forEach(topic => topicSet.add(topic.trim()))
      }
    })
    return Array.from(topicSet).sort()
  }, [questions])

  // Get questions for current language and filter by topic
  const displayQuestions = useMemo(() => {
    const baseQuestions = currentLanguage === primaryLanguage 
      ? questions 
      : initialTranslations[currentLanguage] || questions
    
    // Filter by topic if selected
    if (selectedTopicFilter) {
      return baseQuestions.filter(q => 
        q.topics && q.topics.some(t => t.trim() === selectedTopicFilter)
      )
    }
    
    return baseQuestions
  }, [currentLanguage, primaryLanguage, questions, initialTranslations, selectedTopicFilter])

  const totalPages = Math.ceil(displayQuestions.length / QUESTIONS_PER_PAGE)
  const paginatedQuestions = displayQuestions.slice(
    (currentPage - 1) * QUESTIONS_PER_PAGE,
    currentPage * QUESTIONS_PER_PAGE
  )

  // Get available languages (primary + translations)
  const availableLanguages = [primaryLanguage, ...Object.keys(initialTranslations)]

  // Switch language (only between available ones)
  const handleLanguageSwitch = (langCode: string) => {
    if (availableLanguages.includes(langCode)) {
      setCurrentLanguage(langCode)
      setCurrentPage(1)
    }
  }

  // Handle topic filter change
  const handleTopicFilter = (topic: string | null) => {
    setSelectedTopicFilter(topic)
    setCurrentPage(1) // Reset to first page when filtering
  }

  // Count questions per topic
  const getTopicCount = (topic: string) => {
    const baseQuestions = currentLanguage === primaryLanguage 
      ? questions 
      : initialTranslations[currentLanguage] || questions
    return baseQuestions.filter(q => 
      q.topics && q.topics.some(t => t.trim() === topic)
    ).length
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header with Language Tabs */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">{t('questionsHeader')}</h2>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              {displayQuestions.length} {selectedTopicFilter ? t('filteredLabel') : t('totalLabel')}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Language Selector - Only show available languages */}
            {availableLanguages.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 mr-2">{t('languageLabel')}</span>
                <div className="flex items-center gap-1">
                  {availableLanguages.map((langCode) => {
                    const lang = LANGUAGES[langCode]
                    if (!lang) return null
                    
                    const isCurrent = currentLanguage === langCode
                    const isPrimary = langCode === primaryLanguage

                    return (
                      <button
                        key={langCode}
                        onClick={() => handleLanguageSwitch(langCode)}
                        className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
                          isCurrent
                            ? 'bg-blue-100 ring-2 ring-blue-500 shadow-sm'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                        title={`${lang.name}${isPrimary ? ` ${t('originalLabel')}` : ''}`}
                      >
                        <FlagIcon countryCode={lang.countryCode} size={24} />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Topic Filter */}
        {allTopics.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700">{t('filterByTopic')}</span>
              <button
                onClick={() => handleTopicFilter(null)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedTopicFilter === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {t('all')} ({questions.length})
              </button>
              {allTopics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => handleTopicFilter(topic)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedTopicFilter === topic
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {topic} ({getTopicCount(topic)})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Questions List */}
      <div className="divide-y divide-gray-100">
        {paginatedQuestions.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">{t('noQuestionsInExam')}</p>
          </div>
        ) : (
          paginatedQuestions.map((question, idx) => {
            const globalIndex = (currentPage - 1) * QUESTIONS_PER_PAGE + idx
            return (
              <div key={question.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                {/* Question Header */}
                <div className="flex items-center gap-2 sm:gap-3 mb-3 flex-wrap">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                    {globalIndex + 1}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${questionTypeColors[question.type] || 'bg-gray-100 text-gray-700'}`}>
                    {questionTypeLabels[question.type] || question.type}
                  </span>
                  {question.difficulty && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${difficultyColors[question.difficulty]}`}>
                      {difficultyLabels[question.difficulty]}
                    </span>
                  )}
                  {question.topics && question.topics.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {question.topics.map((topic, topicIdx) => (
                        <span
                          key={topicIdx}
                          className="rounded-full px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200"
                          title={`${t('topicLabel')} ${topic}`}
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Question Text */}
                <p className="text-gray-900 font-medium mb-4">{question.text}</p>

                {/* Multiple Choice Options */}
                {question.type === 'multiple_choice' && question.options && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {question.options.map((option, optIndex) => (
                      <div
                        key={optIndex}
                        className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm ${
                          option === question.correctAnswer
                            ? 'bg-green-50 border border-green-200 text-green-800'
                            : 'bg-gray-50 border border-gray-100 text-gray-600'
                        }`}
                      >
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          option === question.correctAnswer ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {String.fromCharCode(65 + optIndex)}
                        </span>
                        <span className="flex-1">
                          <RichTextWithMath content={option} asHtml={false} />
                        </span>
                        {option === question.correctAnswer && (
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* True/False — display translated labels; correctAnswer may be "True"/"False" or translated */}
                {question.type === 'true_false' && (() => {
                  const canonical: ['True', 'False'] = ['True', 'False']
                  const labels = [t('optionTrue'), t('optionFalse')]
                  return (
                    <div className="flex gap-3">
                      {canonical.map((canon, idx) => {
                        const label = labels[idx]
                        const isCorrect = question.correctAnswer === canon || question.correctAnswer === label
                        return (
                          <div
                            key={canon}
                            className={`flex-1 rounded-lg px-4 py-3 text-sm text-center font-medium ${
                              isCorrect
                                ? 'bg-green-50 border border-green-200 text-green-800'
                                : 'bg-gray-50 border border-gray-100 text-gray-500'
                            }`}
                          >
                            {label}
                            {isCorrect && (
                              <CheckCircle className="inline-block ml-2 h-4 w-4 text-green-600" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}

                {/* Multiple Select Options */}
                {question.type === 'multiple_select' && question.options && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {question.options.map((option, optIndex) => {
                      const correctAnswers = Array.isArray(question.correctAnswer) ? question.correctAnswer : []
                      const isCorrect = correctAnswers.includes(option)
                      return (
                        <div
                          key={optIndex}
                          className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm ${
                            isCorrect
                              ? 'bg-green-50 border border-green-200 text-green-800'
                              : 'bg-gray-50 border border-gray-100 text-gray-600'
                          }`}
                        >
                          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                            isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {String.fromCharCode(65 + optIndex)}
                          </span>
                          <span className="flex-1">
                            <RichTextWithMath content={option} asHtml={false} />
                          </span>
                          {isCorrect && (
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Fill Blank */}
                {question.type === 'fill_blank' && (
                  <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                    <span className="text-sm text-green-600 font-medium">{t('correctAnswerLabel')} </span>
                    <span className="text-sm text-green-800 font-semibold">
                      <RichTextWithMath content={String(question.correctAnswer)} asHtml={false} />
                    </span>
                  </div>
                )}

                {/* Explanation */}
                {question.explanation && (
                  <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
                    <p className="text-sm text-blue-700">
                      <strong className="font-medium">{t('explanationLabel')}</strong>{' '}
                      <RichTextWithMath content={question.explanation} asHtml={false} />
                    </p>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              {t('previous')}
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {t('next')}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
