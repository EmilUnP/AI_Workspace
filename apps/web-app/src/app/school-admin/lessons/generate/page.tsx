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

  const GRADE_LEVELS = [
    { value: 'grade_1', label: t('grade1') },
    { value: 'grade_2', label: t('grade2') },
    { value: 'grade_3', label: t('grade3') },
    { value: 'grade_4', label: t('grade4') },
    { value: 'grade_5', label: t('grade5') },
    { value: 'grade_6', label: t('grade6') },
    { value: 'grade_7', label: t('grade7') },
    { value: 'grade_8', label: t('grade8') },
    { value: 'grade_9', label: t('grade9') },
    { value: 'grade_10', label: t('grade10') },
    { value: 'grade_11', label: t('grade11') },
    { value: 'grade_12', label: t('grade12') },
    { value: 'undergraduate', label: t('undergraduate') },
    { value: 'graduate', label: t('graduate') },
    { value: 'phd', label: t('phd') },
  ]
  
  // Form state
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])
  const [topic, setTopic] = useState('')
  const [objectives, setObjectives] = useState('')
  const [corePrompt, setCorePrompt] = useState('')
  const [gradeLevel, setGradeLevel] = useState('grade_9')
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
          const data = await response.json()
          setDocuments(data.documents || [])
        }
      } catch (err) {
        console.error('Failed to load documents:', err)
      }
    }
    loadDocuments()
  }, [])
  
  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a lesson topic.')
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
        corePrompt: corePrompt.trim() || undefined,
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
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to generate lesson (${response.status})`)
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate lesson'
      setError(errorMessage)
      setCurrentStep('error')
      console.error('Error generating lesson:', err)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/school-admin/lessons"
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
              {t('title')}
            </h1>
            <p className="text-gray-500 mt-1">
              {t('subtitle')}
            </p>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="space-y-6">
          {/* Document Selection (multi-select for RAG from multiple sources) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-2" />
              {t('sourceDocuments')} (optional)
            </label>
            <p className="text-xs text-gray-500 mb-3">
              {t('sourceDocumentsHint')}
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
              {documents.map((doc) => (
                <label
                  key={doc.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all ${
                    selectedDocumentIds.includes(doc.id)
                      ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-400'
                      : 'border-transparent hover:bg-white'
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
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900 truncate flex-1">
                    {doc.title}
                  </span>
                  <span className="text-xs text-gray-500">({doc.file_type.toUpperCase()})</span>
                </label>
              ))}
            </div>
            {selectedDocumentIds.length > 0 && (
              <p className="mt-2 text-sm text-blue-600">
                {t('documentsSelected', { count: selectedDocumentIds.length })}
              </p>
            )}
            {documents.length === 0 && (
              <p className="mt-2 text-sm text-gray-500">
                {t('noDocumentsText')} <Link href="/school-admin/documents" className="text-blue-600 hover:underline">{t('uploadDocument')}</Link>
              </p>
            )}
            <div className={`mt-3 rounded-lg border px-3 py-2 text-xs font-medium ${
              selectedDocumentIds.length > 0
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}>
              {selectedDocumentIds.length > 0
                ? `RAG mode active: ${selectedDocumentIds.length} document(s) selected.`
                : 'AI-only mode active: no document selected. Lesson will be generated from your topic and prompt.'}
            </div>
          </div>
          
          {/* Topic Input */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <BookOpen className="w-4 h-4 inline mr-2" />
              {t('lessonTopic')}
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t('topicPlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              disabled={loading}
            />
            <p className="mt-2 text-sm text-gray-500">
              {t('topicHint')}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Sparkles className="w-4 h-4 inline mr-2" />
              Core Prompt <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={corePrompt}
              onChange={(e) => setCorePrompt(e.target.value)}
              placeholder="Describe the lesson direction: what to focus on, style, depth, constraints, or target outcome."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              disabled={loading}
            />
            <p className="mt-2 text-sm text-gray-500">
              Use this to guide AI behavior, especially in AI-only mode.
            </p>
          </div>
          
          {/* Learning Objectives (optional) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              disabled={loading}
            />
            <p className="mt-2 text-sm text-gray-500">
              {t('objectivesHint')}
            </p>
          </div>

          {/* Grade Level */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <GraduationCap className="w-4 h-4 inline mr-2" />
              {t('gradeLevel')}
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max={GRADE_LEVELS.length - 1}
                value={GRADE_LEVELS.findIndex(l => l.value === gradeLevel)}
                onChange={(e) => {
                  const index = parseInt(e.target.value)
                  setGradeLevel(GRADE_LEVELS[index].value)
                }}
                disabled={loading}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{t('grade1')}</span>
                <span className="font-semibold text-blue-600">
                  {GRADE_LEVELS.find(l => l.value === gradeLevel)?.label}
                </span>
                <span>{t('phd')}</span>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {t('gradeLevelHint')}
            </p>
          </div>

          {/* Language Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Languages className="w-4 h-4" />
                {t('language')}
                {(() => {
                  const current = LANGUAGES.find((l) => l.code === language)
                  return current ? (
                    <span className="text-blue-600 font-semibold" title={`Stored as: ${language}`}>
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
                          ? 'bg-blue-100 ring-2 ring-blue-500 ring-offset-1'
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Settings className="w-4 h-4" />
                  {t('generationOptions')}
                </span>
              </div>
              <div className="px-6 pb-6 pt-4 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={includeImages}
                    onChange={(e) => setIncludeImages(e.target.checked)}
                    disabled={loading}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      {t('includeAiImages')}
                    </span>
                    <p className="text-xs text-gray-500">{t('includeAiImagesDesc')}</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={includeAudio}
                    onChange={(e) => setIncludeAudio(e.target.checked)}
                    disabled={loading}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      {t('generateAudio')}
                    </span>
                    <p className="text-xs text-gray-500">{t('generateAudioDesc')}</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={centerText}
                    onChange={(e) => setCenterText(e.target.checked)}
                    disabled={loading}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      {t('centerAlign')}
                    </span>
                    <p className="text-xs text-gray-500">{t('centerAlignDesc')}</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={includeTables}
                    onChange={(e) => setIncludeTables(e.target.checked)}
                    disabled={loading}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 flex items-center gap-1.5">
                      <Table2 className="w-4 h-4" /> {t('comparisonTables')}
                    </span>
                    <p className="text-xs text-gray-500">{t('comparisonTablesDesc')}</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={includeFigures}
                    onChange={(e) => setIncludeFigures(e.target.checked)}
                    disabled={loading}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 flex items-center gap-1.5">
                      <Layers className="w-4 h-4" /> {t('keyFigures')}
                    </span>
                    <p className="text-xs text-gray-500">{t('keyFiguresDesc')}</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={includeCharts}
                    onChange={(e) => setIncludeCharts(e.target.checked)}
                    disabled={loading}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 flex items-center gap-1.5">
                      <BarChart2 className="w-4 h-4" /> {t('chartsData')}
                    </span>
                    <p className="text-xs text-gray-500">{t('chartsDataDesc')}</p>
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
                            ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {len === 'short' ? t('lengthShort') : len === 'medium' ? t('lengthMedium') : t('lengthFull')}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{t('lengthHint')}</p>
                </div>
              </div>
          </div>
          
          {/* Progress Display */}
          {(loading || currentStep !== 'idle') && currentStep !== 'complete' && currentStep !== 'error' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {(() => {
                const percent = getStepProgress(currentStep, includeImages, includeAudio)
                return (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      <span className="font-medium text-gray-900">
                        {stepLabels[currentStep] || t('working')}
                      </span>
                      <span className="ml-auto text-sm text-gray-500">{percent}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-red-800">
                  {error.includes('Not enough tokens') || error.includes('Your balance:') ? t('notEnoughTokens') : t('generationFailed')}
                </h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                {(error.includes('Not enough tokens') || error.includes('Your balance:')) && (
                  <Link
                    href="/school-admin/tokens"
                    className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-red-700 hover:text-red-800 underline"
                  >
                    {t('viewTokens')}
                  </Link>
                )}
              </div>
            </div>
          )}
          
          {/* Success Display */}
          {currentStep === 'complete' && generatedLesson && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-8 text-center">
              <div className="relative">
                {/* Animated checkmark */}
                <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6 animate-bounce">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                
                <h3 className="text-2xl font-bold text-green-800">{t('lessonGenerated')}</h3>
                <p className="text-base text-green-700 mt-2">
                  &quot;{generatedLesson.title}&quot;
                </p>
                
                <div className="flex items-center justify-center gap-4 mt-4 text-sm text-green-600">
                  <span className="flex items-center gap-1.5 bg-green-100 rounded-full px-3 py-1">
                    <ImageIcon className="w-4 h-4" />
                    {t('imagesCount', { count: generatedLesson.images?.length || 0 })}
                  </span>
                  <span className="flex items-center gap-1.5 bg-green-100 rounded-full px-3 py-1">
                    <Brain className="w-4 h-4" />
                    {t('quizQuestionsCount', { count: generatedLesson.mini_test?.length || 0 })}
                  </span>
                </div>
                
                {/* Redirect message */}
                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-green-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('redirecting')}</span>
                </div>
                
                {/* Manual navigation */}
                <div className="mt-4 flex justify-center gap-3">
                  <Link
                    href={`/school-admin/lessons/${generatedLesson.id}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors shadow-lg shadow-green-200"
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
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
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

