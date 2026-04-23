'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import {
  ArrowLeft,
  FileText,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  Languages,
  Settings,
  BookOpen,
  Upload,
  Sliders,
  Zap,
  Edit,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  HelpCircle,
  FileQuestion,
  BarChart3,
  Circle,
  Table2,
  Layers,
} from 'lucide-react'
import type { CourseDifficultyLevel, CourseStyle, CourseGenerationResponse } from '@eduator/core/types/course'
import { CONTENT_LANGUAGES } from '@eduator/config/constants'

interface Document {
  id: string
  title: string
  file_type: string
  file_name: string
}

interface CourseGenerationProgress {
  step: 'analyzing' | 'structure' | 'lessons' | 'saving' | 'complete' | 'error'
  currentLesson?: number
  totalLessons?: number
  message?: string
}

const LANGUAGES = CONTENT_LANGUAGES

// Flag component
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

function rebalanceThreeWay(
  current: { easy: number; medium: number; hard: number },
  changed: 'easy' | 'medium' | 'hard',
  rawValue: number
): { easy: number; medium: number; hard: number } {
  const value = Math.max(0, Math.min(100, Math.floor(rawValue || 0)))
  const remaining = 100 - value
  if (changed === 'easy') {
    const medium = Math.min(current.medium, remaining)
    return { easy: value, medium, hard: remaining - medium }
  }
  if (changed === 'medium') {
    const easy = Math.min(current.easy, remaining)
    return { easy, medium: value, hard: remaining - easy }
  }
  const easy = Math.min(current.easy, remaining)
  return { easy, medium: remaining - easy, hard: value }
}

type ExamQuestionType = 'multiple_choice' | 'multiple_select' | 'fill_blank' | 'true_false'

const EXAM_QUESTION_TYPE_KEYS: ExamQuestionType[] = [
  'multiple_choice',
  'multiple_select',
  'true_false',
  'fill_blank',
]

function rebalanceQuestionTypePercentages(
  current: Record<ExamQuestionType, number>,
  changed: ExamQuestionType,
  rawValue: number
): Record<ExamQuestionType, number> {
  const value = Math.max(0, Math.min(100, Math.floor(rawValue || 0)))
  const remaining = 100 - value
  const otherKeys = EXAM_QUESTION_TYPE_KEYS.filter((k) => k !== changed)
  const totalOther = otherKeys.reduce((sum, key) => sum + current[key], 0)

  const next = { ...current, [changed]: value }

  if (totalOther <= 0) {
    const base = Math.floor(remaining / otherKeys.length)
    let leftover = remaining - base * otherKeys.length
    otherKeys.forEach((key, idx) => {
      next[key] = base + (idx < leftover ? 1 : 0)
    })
    return next
  }

  const scaled = otherKeys.map((key) => ({
    key,
    exact: (current[key] / totalOther) * remaining,
  }))

  let assigned = 0
  scaled.forEach(({ key, exact }) => {
    const floored = Math.floor(exact)
    next[key] = floored
    assigned += floored
  })

  let leftover = remaining - assigned
  scaled
    .sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)))
    .forEach(({ key }) => {
      if (leftover > 0) {
        next[key] += 1
        leftover -= 1
      }
    })

  return next
}

function distributePercentToCounts(
  percentages: Record<ExamQuestionType, number>,
  total: number
): Record<ExamQuestionType, number> {
  const safeTotal = Math.max(0, Math.floor(total || 0))
  const exact = EXAM_QUESTION_TYPE_KEYS.map((key) => ({
    key,
    value: (percentages[key] / 100) * safeTotal,
  }))

  const counts: Record<ExamQuestionType, number> = {
    multiple_choice: 0,
    multiple_select: 0,
    true_false: 0,
    fill_blank: 0,
  }

  let assigned = 0
  exact.forEach(({ key, value }) => {
    counts[key] = Math.floor(value)
    assigned += counts[key]
  })

  let leftover = safeTotal - assigned
  exact
    .sort((a, b) => (b.value - Math.floor(b.value)) - (a.value - Math.floor(a.value)))
    .forEach(({ key }) => {
      if (leftover > 0) {
        counts[key] += 1
        leftover -= 1
      }
    })

  return counts
}

const buildRangeTrackStyle = (value: number, color: string) => ({
  background: `linear-gradient(to right, ${color} 0%, ${color} ${value}%, #e2e8f0 ${value}%, #e2e8f0 100%)`,
})

type WizardStep = 1 | 2 | 3 | 4 | 5

export default function CreateCoursePage() {
  const router = useRouter()
  const t = useTranslations('teacherCourseCreate')

  const DIFFICULTY_LEVELS: Array<{ value: CourseDifficultyLevel; label: string }> = [
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
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  
  // Step 1: Document selection
  const [documents, setDocuments] = useState<Document[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])
  const [documentSummary, setDocumentSummary] = useState<string | null>(null)
  
  // Step 2: Configuration
  const [difficultyLevel, setDifficultyLevel] = useState<CourseDifficultyLevel>('grade_9')
  const [numLessons, setNumLessons] = useState(5)
  const [language, setLanguage] = useState('en')
  const [courseStyle, setCourseStyle] = useState<CourseStyle>('serious_academic')
  const [courseTopic, setCourseTopic] = useState<string>('')
  const [lessonTopics, setLessonTopics] = useState<string[]>([])
  const [showLessonOptions, setShowLessonOptions] = useState(false)
  // Step 3: Lesson generation options (optional)
  const [includeImages, setIncludeImages] = useState(true)
  const [includeAudio, setIncludeAudio] = useState(true)
  const [centerText, setCenterText] = useState(true)
  const [includeTables, setIncludeTables] = useState(true)
  const [includeFigures, setIncludeFigures] = useState(false)
  const [includeCharts, setIncludeCharts] = useState(false)
  const [contentLength, setContentLength] = useState<'short' | 'medium' | 'full'>('medium')
  
  // Exam settings (optional)
  const [examQuestionCount, setExamQuestionCount] = useState<number | null>(null)
  const [examDurationMinutes, setExamDurationMinutes] = useState<number | null>(null)
  const [examQuestionTypePercentages, setExamQuestionTypePercentages] = useState<Record<ExamQuestionType, number>>({
    multiple_choice: 50,
    true_false: 20,
    multiple_select: 20,
    fill_blank: 10,
  })
  const [examDifficultyDistribution, setExamDifficultyDistribution] = useState({ easy: 30, medium: 50, hard: 20 })
  
  // Step 4: Generation
  const [, setGenerating] = useState(false)
  const [progress, setProgress] = useState<CourseGenerationProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Step 5: Results
  const [generatedCourse, setGeneratedCourse] = useState<CourseGenerationResponse | null>(null)
  
  const defaultExamQuestionCount = Math.min(15, Math.max(5, Math.ceil(numLessons * 1.5)))
  const effectiveExamQuestionCount = examQuestionCount || defaultExamQuestionCount
  const effectiveExamDurationMinutes = examDurationMinutes ?? Math.ceil(effectiveExamQuestionCount * 2)
  const difficultyTotal = examDifficultyDistribution.easy + examDifficultyDistribution.medium + examDifficultyDistribution.hard
  const totalQuestionTypePercent = EXAM_QUESTION_TYPE_KEYS.reduce((sum, key) => sum + examQuestionTypePercentages[key], 0)
  const plannedQuestionTypeCounts = distributePercentToCounts(examQuestionTypePercentages, effectiveExamQuestionCount)
  const selectedExamQuestionTypes = EXAM_QUESTION_TYPE_KEYS.filter((key) => examQuestionTypePercentages[key] > 0)
  const enabledLessonOptionCount = [includeImages, includeAudio, centerText, includeTables, includeFigures, includeCharts].filter(Boolean).length
  const contentLengthLabel = contentLength === 'short' ? t('lengthShort') : contentLength === 'medium' ? t('lengthMedium') : t('lengthFull')
  const selectedQuestionTypeLabels = [
    { value: 'multiple_choice' as const, label: t('multipleChoice') },
    { value: 'multiple_select' as const, label: t('multipleSelect') },
    { value: 'true_false' as const, label: t('trueFalse') },
    { value: 'fill_blank' as const, label: t('fillInBlank') },
  ]
    .filter((type) => selectedExamQuestionTypes.includes(type.value))
    .map((type) => type.label)
  
  const handleExamDifficultyChange = (key: 'easy' | 'medium' | 'hard', value: number) => {
    setExamDifficultyDistribution((prev) => rebalanceThreeWay(prev, key, value))
  }

  const handleExamQuestionTypePercentChange = (key: ExamQuestionType, value: number) => {
    setExamQuestionTypePercentages((prev) => rebalanceQuestionTypePercentages(prev, key, value))
  }
  
  // Load documents
  useEffect(() => {
    async function loadDocuments() {
      setDocumentsLoading(true)
      try {
        const response = await fetch('/api/teacher/documents')
        if (response.ok) {
          const data = await response.json()
          setDocuments(data.documents || [])
        }
      } catch (err) {
        console.error('Failed to load documents:', err)
      } finally {
        setDocumentsLoading(false)
      }
    }
    loadDocuments()
  }, [])
  
  // Analyze documents when selected (Step 1 -> Step 2)
  const handleAnalyzeDocuments = async () => {
    if (selectedDocumentIds.length === 0) {
      setError(t('selectAtLeastOneDocument'))
      return
    }
    
    setError(null)
    setDocumentSummary(t('documentsReady', { count: selectedDocumentIds.length }))
    setCurrentStep(2)
  }
  
  // Generate course (Step 3 -> Step 4)
  const handleGenerateCourse = async () => {
    setGenerating(true)
    setError(null)
    setProgress({ step: 'analyzing', message: t('analyzingDocuments') })
    setCurrentStep(4)
    
    // Track progress simulation timeouts to clear them if needed
    const progressTimeouts: NodeJS.Timeout[] = []
    
    try {
      // Simulate progress updates
      progressTimeouts.push(
        setTimeout(() => setProgress({ step: 'structure', message: t('creatingStructure') }), 2000)
      )
      
      // Start lesson generation progress after structure is created
      progressTimeouts.push(
        setTimeout(() => {
          setProgress({ step: 'lessons', currentLesson: 1, totalLessons: numLessons, message: t('generatingLessons') })
          
          const lessonInterval = Math.max(3000, (20000 / numLessons))
          
          for (let i = 2; i <= numLessons; i++) {
            progressTimeouts.push(
              setTimeout(() => {
                setProgress({ 
                  step: 'lessons', 
                  currentLesson: i, 
                  totalLessons: numLessons, 
                  message: t('generatingLessonOf', { current: i, total: numLessons }) 
                })
              }, 4000 + (i - 1) * lessonInterval)
            )
          }
        }, 4000)
      )
      
      const requestBody: Record<string, unknown> = {
        document_ids: selectedDocumentIds,
        difficulty_level: difficultyLevel,
        num_lessons: numLessons,
        language: language ?? 'en',
        course_style: courseStyle,
        lesson_generation_options: {
          includeImages,
          includeAudio,
          centerText,
          includeTables,
          includeFigures,
          includeCharts,
          contentLength,
        },
      }
      
      if (courseTopic.trim()) {
        requestBody.topic = courseTopic.trim()
      }
      
      if (lessonTopics.length > 0 && lessonTopics.some(lt => lt.trim())) {
        requestBody.lesson_topics = lessonTopics.filter(lt => lt.trim())
      }
      
      if (examQuestionCount != null || examDurationMinutes != null || selectedExamQuestionTypes.length > 0) {
        const examSettings: {
          question_count?: number
          duration_minutes?: number
          question_types?: ExamQuestionType[]
          difficulty_distribution?: { easy: number; medium: number; hard: number }
        } = {}
        if (examQuestionCount) examSettings.question_count = examQuestionCount
        if (examDurationMinutes != null && examDurationMinutes > 0) examSettings.duration_minutes = examDurationMinutes
        if (selectedExamQuestionTypes.length > 0) examSettings.question_types = selectedExamQuestionTypes
        examSettings.difficulty_distribution = examDifficultyDistribution
        requestBody.exam_settings = examSettings
      }
      
      const response = await fetch('/api/teacher/courses/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      
      if (!response.ok) {
        progressTimeouts.forEach(timeout => clearTimeout(timeout))
        const errorData = await response.json().catch(() => ({ error: t('failedToGenerateCourse') }))
        throw new Error(errorData.error || t('failedToGenerateCourse'))
      }
      
      const data = await response.json()
      
      progressTimeouts.forEach(timeout => clearTimeout(timeout))
      setProgress({ step: 'complete', message: t('courseGeneratedSuccess') })
      setGeneratedCourse(data)
      
      setTimeout(() => {
        setCurrentStep(5)
      }, 1000)
    } catch (err) {
      progressTimeouts.forEach(timeout => clearTimeout(timeout))
      const errorMessage = err instanceof Error ? err.message : t('failedToGenerateCourse')
      setError(errorMessage)
      setProgress({ step: 'error', message: errorMessage })
    } finally {
      setGenerating(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/teacher/courses"
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
        
        {/* Progress Steps Indicator */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-sm font-semibold text-slate-900">
              {t('progressStep', { current: currentStep, total: 5 })}
            </div>
            <div className="text-xs text-slate-500">
              {t('progressComplete', { percent: Math.round((currentStep / 5) * 100) })}
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {[
              { step: 1, label: t('stepDocuments') },
              { step: 2, label: t('stepBlueprint') },
              { step: 3, label: t('stepOptions') },
              { step: 4, label: t('stepGeneration') },
              { step: 5, label: t('stepSummary') },
            ].map(({ step, label }) => {
              const isDone = currentStep > step
              const isActive = currentStep === step
              return (
                <div
                  key={step}
                  aria-current={isActive ? 'step' : undefined}
                  className={`rounded-xl border px-2 py-2 text-center transition-all ${
                    isDone
                      ? 'border-emerald-200 bg-emerald-50'
                      : isActive
                      ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div
                    className={`mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isDone ? <CheckCircle className="w-4 h-4" /> : step}
                  </div>
                  <div
                    className={`text-[11px] font-medium leading-tight ${
                      isActive ? 'text-blue-700' : isDone ? 'text-emerald-700' : 'text-slate-600'
                    }`}
                  >
                    {label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* Step 1: Document Upload/Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  {t('step1Title')}
                </h2>
                <p className="text-gray-500 mt-1">
                  {t('step1Subtitle')}
                </p>
              </div>
              
              {documentsLoading ? (
                <div className="flex items-center gap-2 text-gray-500 py-8">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('loadingDocuments')}</span>
                </div>
              ) : documents.length === 0 ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">{t('noDocumentsFound')}</p>
                  <Link
                    href="/teacher/documents"
                    className="text-blue-600 hover:underline"
                  >
                    {t('uploadDocumentsFirst')}
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => {
                    const isSelected = selectedDocumentIds.includes(doc.id)
                    return (
                      <label
                        key={doc.id}
                        className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDocumentIds([...selectedDocumentIds, doc.id])
                            } else {
                              setSelectedDocumentIds(selectedDocumentIds.filter(id => id !== doc.id))
                            }
                          }}
                          className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <FileText className="w-5 h-5 text-gray-600" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{doc.title}</p>
                          <p className="text-sm text-gray-500">{doc.file_type?.toUpperCase() || 'PDF'}</p>
                        </div>
                        {isSelected && <CheckCircle className="w-5 h-5 text-blue-600" />}
                      </label>
                    )
                  })}
                </div>
              )}
              
              {documentSummary && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800">{documentSummary}</p>
                </div>
              )}
              
              <div className="flex justify-end">
                <button
                  onClick={handleAnalyzeDocuments}
                  disabled={selectedDocumentIds.length === 0}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {t('continue')}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
          
          {/* Step 2: Configuration */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-blue-600" />
                  {t('step2Title')}
                </h2>
                <p className="text-gray-500 mt-1">
                  {t('step2Subtitle')}
                </p>
              </div>
              
              {/* Difficulty Level Slider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('difficultyLevel')}
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max={DIFFICULTY_LEVELS.length - 1}
                    value={DIFFICULTY_LEVELS.findIndex(l => l.value === difficultyLevel)}
                    onChange={(e) => {
                      const index = parseInt(e.target.value)
                      setDifficultyLevel(DIFFICULTY_LEVELS[index].value)
                    }}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-blue-600"
                    style={buildRangeTrackStyle(DIFFICULTY_LEVELS.findIndex(l => l.value === difficultyLevel), '#2563eb')}
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{t('grade1')}</span>
                    <span className="font-semibold text-blue-600">
                      {DIFFICULTY_LEVELS.find(l => l.value === difficultyLevel)?.label}
                    </span>
                    <span>{t('phd')}</span>
                  </div>
                </div>
              </div>
              
              {/* Lesson Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('numberOfLessons')}
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="3"
                    max="20"
                    value={numLessons}
                    onChange={(e) => {
                      const newCount = parseInt(e.target.value)
                      setNumLessons(newCount)
                      if (lessonTopics.length > newCount) {
                        setLessonTopics(lessonTopics.slice(0, newCount))
                      } else if (lessonTopics.length < newCount) {
                        setLessonTopics([...lessonTopics, ...Array(newCount - lessonTopics.length).fill('')])
                      }
                    }}
                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-blue-600"
                    style={buildRangeTrackStyle(((numLessons - 3) / (20 - 3)) * 100, '#2563eb')}
                  />
                  <div className="w-20 text-center">
                    <span className="text-2xl font-bold text-blue-600">{numLessons}</span>
                    <span className="text-sm text-gray-500 block">{t('lessonsUnit')}</span>
                  </div>
                </div>
              </div>
              
              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('language')}
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {LANGUAGES.map((lang) => {
                    const isSelected = language === lang.code
                    return (
                      <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        title={lang.name}
                        className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
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
              
              {/* Course Style */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('courseStyle')}
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setCourseStyle('serious_academic')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      courseStyle === 'serious_academic'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{t('seriousAcademic')}</div>
                    <div className="text-sm text-gray-500 mt-1">{t('seriousAcademicDesc')}</div>
                  </button>
                  <button
                    onClick={() => setCourseStyle('fun_gamified')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      courseStyle === 'fun_gamified'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{t('funGamified')}</div>
                    <div className="text-sm text-gray-500 mt-1">{t('funGamifiedDesc')}</div>
                  </button>
                </div>
              </div>
              
              <div className="flex justify-between pt-4 border-t">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  {t('back')}
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  {t('nextOptions')}
                </button>
              </div>
            </div>
          )}
          
          {/* Step 3: Optional Generation Options */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  {t('step3Title')}
                </h2>
                <p className="text-gray-500 mt-1">
                  {t('step3Subtitle')}
                </p>
              </div>

              {/* Course Topic (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('courseTopic')} <span className="text-gray-400 font-normal">{t('optionalLabel')}</span>
                </label>
                <input
                  type="text"
                  value={courseTopic}
                  onChange={(e) => setCourseTopic(e.target.value)}
                  placeholder={t('courseTopicPlaceholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
                <p className="mt-2 text-sm text-gray-500">
                  {t('courseTopicHint')}
                </p>
              </div>

              {/* Lesson Topics (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('lessonTopics')} <span className="text-gray-400 font-normal">{t('optionalLabel')}</span>
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  {t('lessonTopicsHint')}
                </p>
                <div className="space-y-2">
                  {Array.from({ length: numLessons }).map((_, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600 w-20 flex-shrink-0">
                        {t('lessonN', { n: index + 1 })}
                      </span>
                      <input
                        type="text"
                        value={lessonTopics[index] || ''}
                        onChange={(e) => {
                          const newTopics = [...lessonTopics]
                          newTopics[index] = e.target.value
                          setLessonTopics(newTopics)
                        }}
                        placeholder={t('lessonTopicPlaceholder', { topic: courseTopic || 'Topic' })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Lesson Generation Options */}
              <div>
                <button
                  onClick={() => setShowLessonOptions(!showLessonOptions)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border-2 transition-all ${showLessonOptions ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${showLessonOptions ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <Sparkles className={`w-5 h-5 ${showLessonOptions ? 'text-blue-600' : 'text-gray-600'}`} />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-gray-900">{t('lessonGenOptions')}</div>
                      <div className="mt-1 flex items-center gap-2 text-[11px]">
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-700">
                          {enabledLessonOptionCount}/6 enabled
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                          {contentLengthLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showLessonOptions ? 'rotate-180 text-blue-600' : ''}`} />
                </button>

                {showLessonOptions && (
                  <div className="mt-3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-6 pb-6 pt-4 space-y-4">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={includeImages} onChange={(e) => setIncludeImages(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{t('includeAiImages')}</span>
                          <p className="text-xs text-gray-500">{t('includeAiImagesDesc')}</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={includeAudio} onChange={(e) => setIncludeAudio(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{t('generateAudio')}</span>
                          <p className="text-xs text-gray-500">{t('generateAudioDesc')}</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={centerText} onChange={(e) => setCenterText(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{t('centerAlign')}</span>
                          <p className="text-xs text-gray-500">{t('centerAlignDesc')}</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={includeTables} onChange={(e) => setIncludeTables(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 flex items-center gap-1.5"><Table2 className="w-4 h-4" /> {t('comparisonTables')}</span>
                          <p className="text-xs text-gray-500">{t('comparisonTablesDesc')}</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={includeFigures} onChange={(e) => setIncludeFigures(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 flex items-center gap-1.5"><Layers className="w-4 h-4" /> {t('keyFigures')}</span>
                          <p className="text-xs text-gray-500">{t('keyFiguresDesc')}</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={includeCharts} onChange={(e) => setIncludeCharts(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 flex items-center gap-1.5"><BarChart3 className="w-4 h-4" /> {t('chartsData')}</span>
                          <p className="text-xs text-gray-500">{t('chartsDataDesc')}</p>
                        </div>
                      </label>
                      <div>
                        <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2"><FileText className="w-4 h-4" /> {t('lessonLength')}</span>
                        <div className="flex flex-wrap gap-2">
                          {(['short', 'medium', 'full'] as const).map((len) => (
                            <button key={len} type="button" onClick={() => setContentLength(len)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${contentLength === len ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                              {len === 'short' ? t('lengthShort') : len === 'medium' ? t('lengthMedium') : t('lengthFull')}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{t('lengthHint')}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Advanced Options: Exam Settings */}
              <div className="pt-2 mt-4 space-y-3 border-t border-gray-200">
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-blue-500 bg-blue-50 shadow-sm">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <FileQuestion className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-gray-900">{t('finalExamSettings')}</div>
                    <div className="mt-1 flex items-center gap-2 text-[11px]">
                      <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700">
                        {examQuestionCount || defaultExamQuestionCount} questions
                      </span>
                      <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-700">
                        {selectedQuestionTypeLabels.length || 3} {t('questionTypes')}
                      </span>
                    </div>
                  </div>
                </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <FileQuestion className="w-4 h-4 text-blue-600" />
                        <label className="text-xs font-medium text-slate-700 whitespace-nowrap">{t('numberOfQuestions')}</label>
                        <input type="number" min="5" max="50" value={examQuestionCount || ''} onChange={(e) => setExamQuestionCount(e.target.value ? parseInt(e.target.value) : null)} placeholder={t('defaultQuestions', { count: defaultExamQuestionCount })} className="ml-auto w-24 px-2 py-1.5 bg-white border border-slate-300 rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                        <span className="text-xs text-slate-500 whitespace-nowrap">{t('finalValueLabel')}: <span className="font-semibold text-blue-700">{effectiveExamQuestionCount}</span></span>
                      </div>

                      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <BarChart3 className="w-4 h-4 text-amber-600" />
                        <label className="text-xs font-medium text-slate-700 whitespace-nowrap">{t('examTimeLimit')}</label>
                        <input type="number" min={1} max={480} value={examDurationMinutes ?? ''} onChange={(e) => { const v = e.target.value; setExamDurationMinutes(v === '' ? null : Math.max(1, Math.min(480, parseInt(v, 10) || 1))) }} placeholder={t('autoTimePlaceholder')} className="ml-auto w-24 px-2 py-1.5 bg-white border border-slate-300 rounded-md text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
                        <span className="text-xs text-slate-500 whitespace-nowrap">{t('finalValueLabel')}: <span className="font-semibold text-amber-700">{effectiveExamDurationMinutes} {t('minutesShort')}</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-violet-50 border border-violet-100 rounded-lg"><Circle className="w-5 h-5 text-purple-600" /></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">{t('questionTypes')}</label>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${totalQuestionTypePercent === 100 ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>{totalQuestionTypePercent}%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {t('difficultyAutoBalanceHint', {
                            count: effectiveExamQuestionCount,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'multiple_choice' as const, label: t('multipleChoice'), rowClass: 'bg-blue-50 border-blue-200', textClass: 'text-blue-700', inputClass: 'border-blue-300 text-blue-700', sliderClass: 'w-20 h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-blue-600', sliderColor: '#2563eb' },
                        { key: 'true_false' as const, label: t('trueFalse'), rowClass: 'bg-green-50 border-green-200', textClass: 'text-green-700', inputClass: 'border-green-300 text-green-700', sliderClass: 'w-20 h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-600 [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-green-600', sliderColor: '#16a34a' },
                        { key: 'multiple_select' as const, label: t('multipleSelect'), rowClass: 'bg-purple-50 border-purple-200', textClass: 'text-purple-700', inputClass: 'border-purple-300 text-purple-700', sliderClass: 'w-20 h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-600 [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-purple-600', sliderColor: '#9333ea' },
                        { key: 'fill_blank' as const, label: t('fillInBlank'), rowClass: 'bg-orange-50 border-orange-200', textClass: 'text-orange-700', inputClass: 'border-orange-300 text-orange-700', sliderClass: 'w-20 h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-600 [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-orange-600', sliderColor: '#ea580c' },
                      ].map((type) => (
                        <div key={type.key} className={`p-2 rounded-lg border ${type.rowClass}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-xs font-medium ${type.textClass}`}>{type.label}</span>
                            <div className="flex items-center gap-2">
                              <input type="range" min={0} max={100} value={examQuestionTypePercentages[type.key]} onChange={(e) => handleExamQuestionTypePercentChange(type.key, parseInt(e.target.value, 10) || 0)} className={type.sliderClass} style={buildRangeTrackStyle(examQuestionTypePercentages[type.key], type.sliderColor)} />
                              <input type="number" min={0} max={100} value={examQuestionTypePercentages[type.key]} onChange={(e) => handleExamQuestionTypePercentChange(type.key, parseInt(e.target.value, 10) || 0)} className={`w-12 text-center rounded border text-sm font-bold bg-white ${type.inputClass}`} />
                              <span className={`text-[11px] font-semibold ${type.textClass}`}>{plannedQuestionTypeCounts[type.key]}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg"><BarChart3 className="w-5 h-5 text-emerald-600" /></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">{t('difficultyDistribution')}</label>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${difficultyTotal === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{difficultyTotal}%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {t('difficultyAutoBalanceHint', {
                            count: effectiveExamQuestionCount,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'easy' as const, label: t('easy'), text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', border: 'border-emerald-300', accent: 'w-full mb-1 h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-600 [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-emerald-600', sliderColor: '#059669' },
                        { key: 'medium' as const, label: t('medium'), text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', border: 'border-amber-300', accent: 'w-full mb-1 h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-600 [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-amber-600', sliderColor: '#d97706' },
                        { key: 'hard' as const, label: t('hard'), text: 'text-red-700', bg: 'bg-red-50 border-red-200', border: 'border-red-300', accent: 'w-full mb-1 h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-red-600', sliderColor: '#dc2626' },
                      ].map(({ key, label, text, bg, border, accent, sliderColor }) => (
                        <div key={key} className={`flex flex-col items-center p-2 rounded-lg border ${bg}`}>
                          <span className={`text-xs font-bold mb-1 ${text}`}>{label}</span>
                          <input type="range" min={0} max={100} value={examDifficultyDistribution[key]} onChange={(e) => handleExamDifficultyChange(key, parseInt(e.target.value, 10) || 0)} className={accent} style={buildRangeTrackStyle(examDifficultyDistribution[key], sliderColor)} />
                          <input type="number" min={0} max={100} value={examDifficultyDistribution[key]} onChange={(e) => handleExamDifficultyChange(key, parseInt(e.target.value, 10) || 0)} className={`w-14 text-center rounded border text-sm font-bold bg-white ${text} ${border}`} />
                          <span className={`mt-1 text-[11px] font-semibold ${text}`}>{Math.round((examDifficultyDistribution[key] / 100) * effectiveExamQuestionCount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              <div className="flex justify-between pt-4 border-t">
                <button onClick={() => setCurrentStep(2)} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
                  <ChevronLeft className="w-5 h-5" />
                  {t('back')}
                </button>
                <button onClick={handleGenerateCourse} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  {t('generateCourse')}
                </button>
              </div>
            </div>
          )}
          
          {/* Step 4: Generation Progress */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  {t('step4Title')}
                </h2>
                <p className="text-gray-500 mt-1">
                  {t('step4Subtitle')}
                </p>
              </div>
              
              {progress && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="font-medium text-gray-900">{progress.message}</span>
                    </div>
                    
                    {progress.step === 'lessons' && progress.currentLesson && progress.totalLessons && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{t('generatingLessonOf', { current: progress.currentLesson, total: progress.totalLessons })}</span>
                          <span>{Math.round((progress.currentLesson / progress.totalLessons) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${(progress.currentLesson / progress.totalLessons) * 100}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-red-800">
                          {error.includes('Not enough tokens') || error.includes('Your balance:') ? t('notEnoughTokens') : t('generationFailed')}
                        </h3>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                        {(error.includes('Not enough tokens') || error.includes('Your balance:')) && (
                          <Link href="/teacher/tokens" className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-red-700 hover:text-red-800 underline">
                            {t('viewTokens')}
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Step 5: Summary */}
          {currentStep === 5 && generatedCourse && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-blue-600" />
                  {t('step5Title')}
                </h2>
                <p className="text-gray-500 mt-1">
                  {t('step5Subtitle')} <span className="font-mono font-bold text-blue-600">{generatedCourse.course?.access_code}</span>
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-8">
                <div className="text-center mb-6">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-green-800">{t('courseGeneratedSuccess')}</h3>
                  <p className="text-green-700 mt-2">{generatedCourse.course?.title}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-sm text-gray-500">{t('lessonsLabel')}</div>
                    <div className="text-2xl font-bold text-gray-900">{generatedCourse.lessons?.length || 0}</div>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-sm text-gray-500">{t('accessCodeLabel')}</div>
                    <div className="text-2xl font-bold text-blue-600 font-mono">{generatedCourse.course?.access_code}</div>
                  </div>
                </div>
                
                <div className="flex justify-center gap-3">
                  <button onClick={() => router.push(`/teacher/courses/${generatedCourse.course_id}`)} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    {t('viewCourse')}
                  </button>
                  <button onClick={() => router.push('/teacher/courses')} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                    {t('backToCourses')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
