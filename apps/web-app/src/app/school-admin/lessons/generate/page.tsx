'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { CONTENT_LANGUAGES } from '@eduator/config/constants'
import {
  ArrowLeft,
  FileText,
  Brain,
  Image as ImageIcon,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  Languages,
  Settings,
  BookOpen,
  Table2,
  Layers,
  BarChart2,
  GraduationCap,
  Target,
  ChevronDown,
} from 'lucide-react'
import { getStepProgress } from '@eduator/core/hooks/useGenerateLesson'

// Generation steps type
type GenerationStep = 
  | 'idle'
  | 'analyzing'
  | 'generating'
  | 'images'
  | 'saving'
  | 'audio'
  | 'complete'
  | 'error'

interface Document {
  id: string
  title: string
  file_type: string
  file_name: string
}

type DocumentsApiResponse = {
  items?: Array<Partial<Document> & Record<string, unknown>>
  documents?: Array<Partial<Document> & Record<string, unknown>>
}

interface GeneratedLesson {
  id: string
  title: string
  topic: string
  content: string
  images?: Array<{
    url: string
    alt: string
    description: string
    position?: string
  }>
  mini_test?: Array<{
    question: string
    options: string[]
    correct_answer: number
    explanation: string
  }>
}

const LANGUAGES = CONTENT_LANGUAGES

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

export default function GenerateLessonPage() {
  const router = useRouter()
  const t = useTranslations('teacherLessonGenerate')

  const stepLabels: Record<GenerationStep, string> = {
    idle: t('stepIdle'),
    analyzing: t('stepAnalyzing'),
    generating: t('stepGenerating'),
    images: t('stepImages'),
    saving: t('stepSaving'),
    audio: t('stepAudio'),
    complete: t('stepComplete'),
    error: t('stepError'),
  }

  // Form state
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])
  const [topic, setTopic] = useState('')
  const [objectives, setObjectives] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [language, setLanguage] = useState('en')
  // Ref so the selected language is always sent even if user clicks Generate before state re-renders
  const languageRef = useRef('en')

  // Options state
  const [includeImages, setIncludeImages] = useState(true)
  const [includeAudio, setIncludeAudio] = useState(true)
  const [centerText, setCenterText] = useState(true)
  const [includeTables, setIncludeTables] = useState(true)
  const [includeFigures, setIncludeFigures] = useState(false)
  const [includeCharts, setIncludeCharts] = useState(false)
  const [contentLength, setContentLength] = useState<'short' | 'medium' | 'full'>('medium')
  
  // Generation state
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState<GenerationStep>('idle')
  const [error, setError] = useState<string | null>(null)
  const [generatedLesson, setGeneratedLesson] = useState<GeneratedLesson | null>(null)
  
  // Load documents on mount
  useEffect(() => {
    async function loadDocuments() {
      try {
        const response = await fetch('/api/school-admin/documents')
        if (response.ok) {
          const data = (await response.json()) as DocumentsApiResponse
          const list = (data.items || data.documents || []).map((doc) => {
            const title =
              (typeof doc.title === 'string' && doc.title.trim()) ||
              (typeof doc.file_name === 'string' && doc.file_name.trim()) ||
              t('untitledDocument')
            const fileType = typeof doc.file_type === 'string' ? doc.file_type : 'file'
            const fileName = typeof doc.file_name === 'string' ? doc.file_name : title

            return {
              id: String(doc.id || ''),
              title,
              file_type: fileType,
              file_name: fileName,
            }
          }).filter((doc) => doc.id)

          setDocuments(list)
        }
      } catch (err) {
        console.error('Failed to load documents:', err)
      }
    }
    loadDocuments()
  }, [])
  
  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError(t('missingTopicError'))
      return
    }

    setLoading(true)
    setError(null)
    setCurrentStep('analyzing')
    setGeneratedLesson(null)

    try {
      const stepTimer = setTimeout(() => setCurrentStep('generating'), 2000)
      const stepTimer2 = includeImages ? setTimeout(() => setCurrentStep('images'), 8000) : null
      const stepTimer3 = setTimeout(() => setCurrentStep('saving'), includeImages ? 15000 : 10000)

      const langToSend = languageRef.current || language || 'en'
      const payload = {
        documentIds: selectedDocumentIds,
        topic: topic.trim(),
        objectives: objectives.trim() || undefined,
        gradeLevel,
        language: langToSend,
        options: {
          includeImages,
          includeAudio,
          centerText,
          includeTables,
          includeFigures,
          includeCharts,
          contentLength,
        },
      }
      const response = await fetch('/api/school-admin/lessons/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      // Clear timers
      clearTimeout(stepTimer)
      if (stepTimer2) clearTimeout(stepTimer2)
      clearTimeout(stepTimer3)
      
      if (!response.ok) {
        if (response.status === 504) {
          throw new Error(t('generateTimeoutHint'))
        }
        const errorData = await response.json().catch(() => ({})) as {
          error?: string
          message?: string
          issues?: Array<{ message?: string }>
        }
        const issueText =
          Array.isArray(errorData.issues) && errorData.issues.length > 0
            ? errorData.issues.map((i) => i?.message).filter(Boolean).join(', ')
            : ''
        const message =
          errorData.error ||
          errorData.message ||
          issueText ||
          t('generateFailedWithStatus', { status: response.status })
        throw new Error(message)
      }
      
      const data = await response.json()
      
      if (includeAudio) {
        setCurrentStep('audio')
      }
      
      // Show complete briefly then redirect to the lesson
      setTimeout(() => {
        setCurrentStep('complete')
        setGeneratedLesson(data.lesson)
        
        // Auto redirect to the created lesson after 2 seconds
        if (data.lesson?.id) {
          setTimeout(() => {
            router.push(`/school-admin/lessons/${data.lesson.id}`)
          }, 2000)
        }
      }, 1500)
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('generateFailedGeneric')
      setError(errorMessage)
      setCurrentStep('error')
      console.error('Error generating lesson:', err)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl xl:max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/school-admin/lessons"
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {t('title')}
            </h1>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* Document Selection (multi-select for RAG from multiple sources) */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 xl:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-2" />
              {t('sourceDocuments')} (optional)
            </label>
            <details className="group rounded-lg border border-gray-200 bg-gray-50">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm text-gray-700">
                <span className="truncate">
                  {selectedDocumentIds.length > 0
                    ? t('selectedDocumentsSummary', { selected: selectedDocumentIds.length })
                    : documents.length > 0
                      ? t('selectDocumentsSummary', { count: documents.length })
                      : t('noDocumentsText')}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-180" />
              </summary>
              {documents.length > 0 && (
                <div className="space-y-2 border-t border-gray-200 p-3 max-h-56 overflow-y-auto">
                  {documents.map((doc) => (
                    <label
                      key={doc.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border transition-all ${
                        selectedDocumentIds.includes(doc.id)
                          ? 'border-gray-400 bg-gray-100 ring-1 ring-gray-400'
                          : 'border-transparent bg-white hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocumentIds.includes(doc.id)}
                        onChange={() => {
                          setSelectedDocumentIds((prev) =>
                            prev.includes(doc.id)
                              ? prev.filter((id) => id !== doc.id)
                              : [...prev, doc.id]
                          )
                        }}
                        disabled={loading}
                        className="w-4 h-4 rounded border-gray-300 text-gray-700 focus:ring-gray-400"
                      />
                      <span className="text-sm font-medium text-gray-900 truncate flex-1">
                        {doc.title}
                      </span>
                      <span className="text-xs text-gray-500">({doc.file_type.toUpperCase()})</span>
                    </label>
                  ))}
                </div>
              )}
            </details>
            {selectedDocumentIds.length > 0 && (
              <p className="mt-2 text-sm text-gray-700">
                {t('documentsSelected', { count: selectedDocumentIds.length })}
              </p>
            )}
            {documents.length === 0 && (
              <p className="mt-2 text-sm text-gray-500">
                {t('noDocumentsText')} <Link href="/school-admin/documents" className="text-gray-700 hover:underline">{t('uploadDocument')}</Link>
              </p>
            )}
          </div>
          
          {/* Topic Input */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <BookOpen className="w-4 h-4 inline mr-2" />
              {t('lessonTopic')}
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t('topicPlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-all"
              disabled={loading}
            />
          </div>

          {/* Learning Objectives (optional) */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Target className="w-4 h-4 inline mr-2" />
              {t('learningObjectives')}
              <span className="text-gray-400 font-normal ml-1">{t('optional')}</span>
            </label>
            <textarea
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              placeholder={t('objectivesPlaceholder')}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-all resize-none"
              disabled={loading}
            />
          </div>

          {/* Grade Level */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <GraduationCap className="w-4 h-4 inline mr-2" />
              {t('gradeLevel')}
            </label>
            <input
              type="text"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              placeholder={t('gradeLevelPlaceholder')}
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
            />
          </div>

          {/* Language Selection */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Languages className="w-4 h-4" />
                {t('language')}
                {(() => {
                  const current = LANGUAGES.find((l) => l.code === language)
                  return current ? (
                    <span className="text-gray-700 font-semibold" title={`Stored as: ${language}`}>
                      — {current.name} ({language})
                    </span>
                  ) : null
                })()}
              </span>
              <div className="flex items-center gap-1">
                {LANGUAGES.map((lang) => {
                  const isSelected = language === lang.code
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        languageRef.current = lang.code
                        setLanguage(lang.code)
                      }}
                      disabled={loading}
                      title={`${lang.name} (${lang.code})`}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-gray-200 ring-2 ring-gray-500 ring-offset-1'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <FlagIcon countryCode={lang.countryCode} size={24} />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          
          {/* Options */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Settings className="w-4 h-4" />
                  {t('generationOptions')}
                </span>
              </div>
              <div className="px-4 py-3 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={includeImages}
                    onChange={(e) => setIncludeImages(e.target.checked)}
                    disabled={loading}
                    className="w-5 h-5 rounded border-gray-300 text-gray-700 focus:ring-gray-400"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      {t('includeAiImages')}
                    </span>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={includeAudio}
                    onChange={(e) => setIncludeAudio(e.target.checked)}
                    disabled={loading}
                    className="w-5 h-5 rounded border-gray-300 text-gray-700 focus:ring-gray-400"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      {t('generateAudio')}
                    </span>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={centerText}
                    onChange={(e) => setCenterText(e.target.checked)}
                    disabled={loading}
                    className="w-5 h-5 rounded border-gray-300 text-gray-700 focus:ring-gray-400"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      {t('centerAlign')}
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={includeTables}
                    onChange={(e) => setIncludeTables(e.target.checked)}
                    disabled={loading}
                    className="w-5 h-5 rounded border-gray-300 text-gray-700 focus:ring-gray-400"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 flex items-center gap-1.5">
                      <Table2 className="w-4 h-4" /> {t('comparisonTables')}
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={includeFigures}
                    onChange={(e) => setIncludeFigures(e.target.checked)}
                    disabled={loading}
                    className="w-5 h-5 rounded border-gray-300 text-gray-700 focus:ring-gray-400"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 flex items-center gap-1.5">
                      <Layers className="w-4 h-4" /> {t('keyFigures')}
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={includeCharts}
                    onChange={(e) => setIncludeCharts(e.target.checked)}
                    disabled={loading}
                    className="w-5 h-5 rounded border-gray-300 text-gray-700 focus:ring-gray-400"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 flex items-center gap-1.5">
                      <BarChart2 className="w-4 h-4" /> {t('chartsData')}
                    </span>
                  </div>
                </label>

                <div>
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
                    <FileText className="w-4 h-4" /> {t('lessonLength')}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(['short', 'medium', 'full'] as const).map((len) => (
                      <button
                        key={len}
                        type="button"
                        onClick={() => setContentLength(len)}
                        disabled={loading}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          contentLength === len
                            ? 'bg-gray-200 text-gray-900 ring-1 ring-gray-400'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {len === 'short' ? t('lengthShort') : len === 'medium' ? t('lengthMedium') : t('lengthFull')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
          </div>
          
          {/* Progress Display */}
          {(loading || currentStep !== 'idle') && currentStep !== 'complete' && currentStep !== 'error' && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 xl:col-span-2">
              {(() => {
                const percent = getStepProgress(currentStep, includeImages, includeAudio)
                return (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-700" />
                      <span className="font-medium text-gray-900">
                        {stepLabels[currentStep] || t('working')}
                      </span>
                      <span className="ml-auto text-sm text-gray-500">{percent}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gray-700 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      {t('progressTip')}
                    </p>
                  </>
                )
              })()}
            </div>
          )}
          
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 xl:col-span-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-red-800">{t('generationFailed')}</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}
          
          {/* Success Display */}
          {currentStep === 'complete' && generatedLesson && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center xl:col-span-2">
              <div className="relative">
                {/* Animated checkmark */}
                <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-5 animate-bounce">
                  <CheckCircle className="w-8 h-8 text-gray-700" />
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900">{t('lessonGenerated')}</h3>
                <p className="text-base text-gray-700 mt-2">
                  &quot;{generatedLesson.title}&quot;
                </p>
                
                <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-700">
                  <span className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1">
                    <ImageIcon className="w-4 h-4" />
                    {t('imagesCount', { count: generatedLesson.images?.length || 0 })}
                  </span>
                  <span className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1">
                    <Brain className="w-4 h-4" />
                    {t('quizQuestionsCount', { count: generatedLesson.mini_test?.length || 0 })}
                  </span>
                </div>
                
                {/* Redirect message */}
                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-700">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('redirecting')}</span>
                </div>
                
                {/* Manual navigation */}
                <div className="mt-4 flex justify-center gap-3">
                  <Link
                    href={`/school-admin/lessons/${generatedLesson.id}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-black transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    {t('viewLessonNow')}
                  </Link>
                  <button
                    onClick={() => {
                      setCurrentStep('idle')
                      setGeneratedLesson(null)
                      setTopic('')
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    {t('createAnother')}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Generate Button */}
          {currentStep !== 'complete' && (
            <button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="w-full py-4 px-6 bg-gray-900 text-white rounded-xl font-medium hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 xl:col-span-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('generatingLesson')}
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  {t('generateLesson')}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

