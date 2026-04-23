'use client'

import { createContext, useContext, useState, useTransition, useMemo, useCallback, useEffect, useRef, type ReactNode, type Context } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Sparkles, 
  Save,
  FileText,
  CheckCircle,
  Loader2,
  ChevronDown,
  Pencil,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Settings,
  RefreshCw,
  Target,
  BarChart3
} from 'lucide-react'
import { CONTENT_LANGUAGES } from '@eduator/config/constants'
import { QuestionPreview } from './question-preview'
import { QuestionEditor } from './question-editor'
import { exportQuestionsToCsv } from './export-questions-csv'

export interface ExamData {
  id: string
  title: string
  description?: string | null
  subject?: string | null
  grade_level?: string | null
  duration_minutes: number
  questions: Question[]
  language?: string
  translations?: Record<string, Question[]>
  is_published: boolean
  /** Teacher-controlled: what students see after submitting the exam */
  settings?: {
    show_correct_answers?: boolean
    show_explanations?: boolean
  }
}

export interface ExamActions {
  createExam: (data: any) => Promise<{ error?: string; success?: boolean; data?: any }>
  updateExam: (examId: string, data: any) => Promise<{ error?: string; success?: boolean; data?: any }>
  generateExamFromDocuments: (input: {
    documentIds: string[]
    organizationId: string
    questionCount: number
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
    language: string
    topics?: string[]
    customPrompt?: string
    /** Per-topic question counts (same order as topics). If all set, total = sum of these. */
    topicQuestionCounts?: (number | undefined)[]
    questionTypes?: {
      multiple_choice: number
      true_false: number
      multiple_select: number
      fill_blank: number
    }
    difficultyLevels?: {
      easy: number
      medium: number
      hard: number
    }
  }) => Promise<{ error?: string; questions?: Question[] }>
  translateExam: (input: {
    questions: Question[]
    targetLanguage: string
  }) => Promise<{ error?: string; questions?: Question[] }>
}

/** Translations for ExamCreator UI. Pass from app via getTranslations('teacherExamCreator'). */
export interface ExamCreatorTranslations {
  aiGenerateTitle: string
  aiGenerateSubtitle: string
  noDocumentsFound: string
  uploadDocuments: string
  selectDocuments: string
  topicsOptional: string
  topicsOptionalHint: string
  addTopic: string
  topicsEmptyHint: string
  leaveEmptyHint: string
  topicsTotalHint: string
  questionsPerTopicLabel: string
  removeTopic: string
  language: string
  advancedSettings: string
  questionTypes: string
  totalLabel: string
  typeMultipleChoice: string
  typeTrueFalse: string
  typeMultipleSelect: string
  typeFillBlank: string
  difficultyLevels: string
  difficultyHint: string
  difficultyEasy: string
  difficultyMedium: string
  difficultyHard: string
  generateQuestions: string
  generating: string
  generateWaitHint: string
  afterExamTitle: string
  afterExamHint: string
  showCorrectAnswers: string
  showExplanations: string
  examSummary: string
  examTitleLabel: string
  examTitlePlaceholder: string
  examTitleSaveHint: string
  questionsLabel: string
  minutesLabel: string
  editableLabel: string
  languagesLabel: string
  questionTypesLabel: string
  difficultyDistribution: string
  noDifficultyData: string
  questionsPreview: string
  retranslate: string
  addLabel: string
  filterByTopic: string
  allLabel: string
  editQuestion: string
  doneEditing: string
  deleteQuestion: string
  previous: string
  next: string
  cancel: string
  exportToExcel: string
  saveExam: string
  errorSelectDocument: string
  errorNoQuestionsExport: string
  errorNoQuestionsSave: string
  successExportCsv: string
  errorGeneratedSaveFailed: string
  successGeneratedSaved: string
  translatedTo: string
  retranslatedTo: string
  notEnoughTokens: string
  somethingWentWrong: string
  dismiss: string
  optionTrue: string
  optionFalse: string
  topicLabel: string
  totalQuestionsAcross: string
  // Question editor (manual add/edit)
  questionEditorQuestionLabel: string
  questionEditorQuestionPlaceholder: string
  questionEditorOptionsSelectOne: string
  questionEditorOptionsSelectAll: string
  questionEditorOptionLetter: string
  questionEditorCorrectAnswerLabel: string
  questionEditorCorrectAnswerPlaceholder: string
  questionEditorExplanationLabel: string
  questionEditorExplanationPlaceholder: string
  questionEditorTopicsLabel: string
  questionEditorTopicPlaceholder: string
  questionEditorRemoveTopic: string
  questionEditorAddTopic: string
  questionEditorDifficultyLabel: string
  questionEditorDone: string
}

/** Keys for building translations object from getTranslations('teacherExamCreator') */
export const EXAM_CREATOR_TRANSLATION_KEYS: (keyof ExamCreatorTranslations)[] = [
  'aiGenerateTitle', 'aiGenerateSubtitle', 'noDocumentsFound', 'uploadDocuments', 'selectDocuments',
  'topicsOptional', 'topicsOptionalHint', 'addTopic', 'topicsEmptyHint', 'leaveEmptyHint', 'topicsTotalHint',
  'questionsPerTopicLabel', 'removeTopic', 'language', 'advancedSettings', 'questionTypes', 'totalLabel',
  'typeMultipleChoice', 'typeTrueFalse', 'typeMultipleSelect', 'typeFillBlank',
  'difficultyLevels', 'difficultyHint', 'difficultyEasy', 'difficultyMedium', 'difficultyHard',
  'generateQuestions', 'generating', 'generateWaitHint', 'afterExamTitle', 'afterExamHint',
  'showCorrectAnswers', 'showExplanations', 'examSummary', 'examTitleLabel', 'examTitlePlaceholder', 'examTitleSaveHint', 'questionsLabel', 'minutesLabel', 'editableLabel', 'languagesLabel',
  'questionTypesLabel', 'difficultyDistribution', 'noDifficultyData', 'questionsPreview', 'retranslate',
  'addLabel', 'filterByTopic', 'allLabel',
  'editQuestion', 'doneEditing', 'deleteQuestion', 'previous', 'next', 'cancel', 'exportToExcel', 'saveExam',
  'errorSelectDocument', 'errorNoQuestionsExport', 'errorNoQuestionsSave', 'successExportCsv',
  'errorGeneratedSaveFailed', 'successGeneratedSaved', 'translatedTo', 'retranslatedTo',
  'notEnoughTokens', 'somethingWentWrong', 'dismiss', 'optionTrue', 'optionFalse', 'topicLabel', 'totalQuestionsAcross',
  'questionEditorQuestionLabel', 'questionEditorQuestionPlaceholder', 'questionEditorOptionsSelectOne', 'questionEditorOptionsSelectAll',
  'questionEditorOptionLetter', 'questionEditorCorrectAnswerLabel', 'questionEditorCorrectAnswerPlaceholder',
  'questionEditorExplanationLabel', 'questionEditorExplanationPlaceholder', 'questionEditorTopicsLabel', 'questionEditorTopicPlaceholder',
  'questionEditorRemoveTopic', 'questionEditorAddTopic', 'questionEditorDifficultyLabel', 'questionEditorDone',
]

/** Context for passing translations into ExamCreator so they are available after dynamic load (ssr: false). */
const ExamCreatorTranslationsContext = createContext<Partial<ExamCreatorTranslations> | null>(null)

export function ExamCreatorTranslationsProvider({
  value,
  children,
}: {
  value: Partial<ExamCreatorTranslations>
  children: ReactNode
}) {
  return (
    <ExamCreatorTranslationsContext.Provider value={value}>
      {children}
    </ExamCreatorTranslationsContext.Provider>
  )
}

function useExamCreatorTranslations(): Partial<ExamCreatorTranslations> | null {
  return useContext(ExamCreatorTranslationsContext)
}

export const DEFAULT_EXAM_CREATOR_TRANSLATIONS: ExamCreatorTranslations = {
  aiGenerateTitle: 'AI Generate',
  aiGenerateSubtitle: 'Create questions from documents',
  noDocumentsFound: 'No documents found',
  uploadDocuments: 'Upload Documents →',
  selectDocuments: 'Select Documents',
  topicsOptional: 'Topics (Optional)',
  topicsOptionalHint: '- Focus exam on specific subjects',
  addTopic: 'Add Topic',
  topicsEmptyHint: 'Click "Add Topic" to focus on specific subjects. Optionally set how many questions per topic (e.g. 10 from Intro, 80 from Chapter 2).',
  leaveEmptyHint: 'Leave empty to generate from all document content',
  topicsTotalHint: 'topics. Set "Questions" per topic to lock total count.',
  questionsPerTopicLabel: 'Questions:',
  removeTopic: 'Remove topic',
  language: 'Language',
  advancedSettings: 'Advanced Settings',
  questionTypes: 'Question Types',
  totalLabel: 'total',
  typeMultipleChoice: 'Multiple Choice',
  typeTrueFalse: 'True/False',
  typeMultipleSelect: 'Multiple Select',
  typeFillBlank: 'Fill in the Blank',
  difficultyLevels: 'Difficulty Levels',
  difficultyHint: 'Easy + Medium + Hard = total. Change one and the others update.',
  difficultyEasy: 'Easy',
  difficultyMedium: 'Medium',
  difficultyHard: 'Hard',
  generateQuestions: 'Generate Questions',
  generating: 'Generating...',
  generateWaitHint: 'This may take 1–2 minutes for large exams. Do not close the page. If something fails, the error will appear at the top.',
  afterExamTitle: 'After exam (student results)',
  afterExamHint: 'Control what students see when they view their results.',
  showCorrectAnswers: 'Show correct answers',
  showExplanations: 'Show explanations',
  examSummary: 'Exam Summary',
  examTitleLabel: 'Exam Title',
  examTitlePlaceholder: 'e.g. Network Operating Systems - Midterm',
  examTitleSaveHint: 'This title will be used when you save the exam.',
  questionsLabel: 'Questions',
  minutesLabel: 'Minutes',
  editableLabel: 'editable',
  languagesLabel: 'Languages',
  questionTypesLabel: 'Question Types',
  difficultyDistribution: 'Difficulty Distribution',
  noDifficultyData: 'No difficulty data',
  questionsPreview: 'Questions Preview',
  retranslate: 'Retranslate',
  addLabel: 'Add:',
  filterByTopic: 'Filter by Topic:',
  allLabel: 'All',
  editQuestion: 'Edit question',
  doneEditing: 'Done editing',
  deleteQuestion: 'Delete question',
  previous: 'Previous',
  next: 'Next',
  cancel: 'Cancel',
  exportToExcel: 'Export to Excel',
  saveExam: 'Save Exam',
  errorSelectDocument: 'Please select at least one document',
  errorNoQuestionsExport: 'There are no questions to export.',
  errorNoQuestionsSave: 'Please add at least one question',
  successExportCsv: 'Questions exported as CSV. You can open it in Excel.',
  errorGeneratedSaveFailed: 'Generated questions but failed to save:',
  successGeneratedSaved: 'Generated and saved',
  translatedTo: 'Translated to',
  retranslatedTo: 'Retranslated to',
  notEnoughTokens: 'Not enough tokens',
  somethingWentWrong: 'Something went wrong',
  dismiss: 'Dismiss',
  optionTrue: 'True',
  optionFalse: 'False',
  topicLabel: 'Topic:',
  totalQuestionsAcross: 'Total:',
  questionEditorQuestionLabel: 'Question',
  questionEditorQuestionPlaceholder: 'Enter your question...',
  questionEditorOptionsSelectOne: 'Options (select correct answer)',
  questionEditorOptionsSelectAll: 'Options (select all correct answers)',
  questionEditorOptionLetter: 'Option',
  questionEditorCorrectAnswerLabel: 'Correct Answer',
  questionEditorCorrectAnswerPlaceholder: 'Enter the correct answer...',
  questionEditorExplanationLabel: 'Explanation (Optional)',
  questionEditorExplanationPlaceholder: 'Explain why this answer is correct...',
  questionEditorTopicsLabel: 'Topics (Optional - up to 5)',
  questionEditorTopicPlaceholder: 'Topic',
  questionEditorRemoveTopic: 'Remove topic',
  questionEditorAddTopic: '+ Add Topic',
  questionEditorDifficultyLabel: 'Difficulty',
  questionEditorDone: 'Done',
}

export interface ExamCreatorProps {
  organizationId: string
  documents: Array<{ id: string; title: string; file_type: string; file_name: string }>
  // Edit mode props
  examId?: string
  initialData?: ExamData
  // Actions
  onCreateExam: ExamActions['createExam']
  onUpdateExam: ExamActions['updateExam']
  onGenerateExam: ExamActions['generateExamFromDocuments']
  onTranslateExam: ExamActions['translateExam']
  // Optional router path overrides
  examsListPath?: string
  examDetailPath?: (examId: string) => string
  documentsPath?: string
  /** Optional translations for all UI strings */
  translations?: Partial<ExamCreatorTranslations>
  /** Optional context from app so translations survive dynamic load (use same context as ExamCreatorTranslationsProvider in app) */
  translationsContext?: Context<Partial<ExamCreatorTranslations> | null>
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'multiple_select' | 'fill_blank'
export type DifficultyLevel = 'easy' | 'medium' | 'hard'

export interface Question {
  id: string
  type: QuestionType
  text: string
  options: string[]
  correctAnswer: string | string[]
  explanation?: string
  difficulty?: DifficultyLevel
  topics?: string[] // Topics associated with this question
}

interface QuestionTypeDistribution {
  multiple_choice: number
  true_false: number
  multiple_select: number
  fill_blank: number
}

interface DifficultyDistribution {
  easy: number
  medium: number
  hard: number
}

const questionTypeColors: Record<QuestionType, string> = {
  multiple_choice: 'bg-blue-100 text-blue-700 border-blue-200',
  true_false: 'bg-green-100 text-green-700 border-green-200',
  multiple_select: 'bg-purple-100 text-purple-700 border-purple-200',
  fill_blank: 'bg-orange-100 text-orange-700 border-orange-200',
}

const difficultyColors: Record<DifficultyLevel, string> = {
  easy: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  medium: 'bg-amber-100 text-amber-700 border-amber-300',
  hard: 'bg-red-100 text-red-700 border-red-300',
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

type LanguageOption = (typeof LANGUAGES)[number]

function LanguageSelectWithFlags({
  value,
  onChange,
  options,
  label,
}: {
  value: string
  onChange: (code: string) => void
  options: readonly LanguageOption[]
  label: string
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = options.find((l) => l.code === value) ?? options[0]

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm font-medium text-gray-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
      >
        <FlagIcon countryCode={selected.countryCode} size={20} />
        <span className="flex-1 text-left truncate">{selected.name}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
          role="listbox"
        >
          {options.map((lang) => (
            <li key={lang.code} role="option" aria-selected={value === lang.code}>
              <button
                type="button"
                onClick={() => {
                  onChange(lang.code)
                  setOpen(false)
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-sm font-medium transition-colors hover:bg-purple-50 ${
                  value === lang.code ? 'bg-purple-50 text-purple-700' : 'text-gray-900'
                }`}
              >
                <FlagIcon countryCode={lang.countryCode} size={20} />
                <span className="truncate">{lang.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const QUESTIONS_PER_PAGE = 10

function normalizeTopicKey(topic: string): string {
  return topic.trim().toLowerCase()
}

function sanitizeExamTitlePart(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/[+]+$/g, '')
    .replace(/[-\s,]+$/g, '')
    .trim()
}

function buildAutoExamTitle(
  currentTitle: string,
  selectedDocIds: string[],
  documents: Array<{ id: string; title: string }>
): string {
  const manual = currentTitle.trim()
  if (manual) return manual

  if (selectedDocIds.length > 0) {
    const selectedDocs = documents.filter((d) => selectedDocIds.includes(d.id))
    const primaryRaw = selectedDocs[0]?.title ?? ''
    const primary = sanitizeExamTitlePart(primaryRaw) || 'Selected document'
    if (selectedDocs.length === 1) return `Exam - ${primary}`
    if (selectedDocs.length > 1) return `Exam - ${primary} (+${selectedDocs.length - 1} more)`
  }

  const date = new Date()
  return `Exam - ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function distributePercentToCounts<T extends string>(
  percentages: Record<T, number>,
  total: number,
  keys: readonly T[]
): Record<T, number> {
  const clampedTotal = Math.max(1, Math.floor(Number(total) || 1))
  const normalized = keys.map((key) => ({
    key,
    pct: Math.max(0, Number(percentages[key]) || 0),
  }))
  const pctSum = normalized.reduce((sum, item) => sum + item.pct, 0) || 1

  const base = normalized.map((item) => {
    const raw = (item.pct / pctSum) * clampedTotal
    const floored = Math.floor(raw)
    return { key: item.key, raw, count: floored, remainder: raw - floored }
  })

  let assigned = base.reduce((sum, item) => sum + item.count, 0)
  let remaining = clampedTotal - assigned
  if (remaining > 0) {
    const byRemainder = [...base].sort((a, b) => b.remainder - a.remainder)
    let i = 0
    while (remaining > 0 && byRemainder.length > 0) {
      byRemainder[i % byRemainder.length].count += 1
      remaining--
      i++
    }
    assigned = base.reduce((sum, item) => sum + item.count, 0)
  }

  const out = {} as Record<T, number>
  for (const item of base) out[item.key] = item.count
  // Safety: ensure exact total after any edge-case rounding behavior.
  const outSum = keys.reduce((sum, key) => sum + out[key], 0)
  if (outSum !== clampedTotal) {
    const delta = clampedTotal - outSum
    out[keys[0]] = Math.max(0, out[keys[0]] + delta)
  }
  return out
}

function updatePercentagesForHundred<T extends string>(
  current: Record<T, number>,
  keys: readonly T[],
  changed: T,
  rawValue: number | string
): Record<T, number> {
  const target = Math.max(0, Math.min(100, Math.floor(Number(rawValue) || 0)))
  const others = keys.filter((key) => key !== changed)
  const remainder = 100 - target

  if (others.length === 0) return { ...current, [changed]: 100 } as Record<T, number>
  if (remainder <= 0) {
    const out = { ...current } as Record<T, number>
    out[changed] = 100
    for (const key of others) out[key] = 0
    return out
  }

  const otherSum = others.reduce((sum, key) => sum + Math.max(0, Number(current[key]) || 0), 0)
  const out = { ...current } as Record<T, number>
  out[changed] = target

  if (otherSum === 0) {
    const base = Math.floor(remainder / others.length)
    let left = remainder - base * others.length
    for (const key of others) {
      out[key] = base + (left > 0 ? 1 : 0)
      if (left > 0) left--
    }
    return out
  }

  const provisional = others.map((key) => {
    const raw = (Math.max(0, Number(current[key]) || 0) / otherSum) * remainder
    const floored = Math.floor(raw)
    return { key, value: floored, remainder: raw - floored }
  })

  let assigned = provisional.reduce((sum, item) => sum + item.value, 0)
  let left = remainder - assigned
  provisional.sort((a, b) => b.remainder - a.remainder)
  let i = 0
  while (left > 0 && provisional.length > 0) {
    provisional[i % provisional.length].value += 1
    left--
    i++
  }

  for (const item of provisional) out[item.key] = item.value
  return out
}

function buildTopicContractWarning(
  expectedEntries: Array<{ name: string; count?: number }>,
  generatedQuestions: Question[]
): string | null {
  const expected = expectedEntries
    .map((entry) => ({
      name: entry.name.trim(),
      count: Math.max(0, Math.floor(Number(entry.count) || 0)),
    }))
    .filter((entry) => entry.name.length > 0 && entry.count > 0)

  if (expected.length === 0) return null

  const expectedMap = new Map(expected.map((entry) => [normalizeTopicKey(entry.name), entry]))
  const actualByExpected = new Map<string, number>()
  const unexpectedTopics = new Map<string, number>()

  for (const question of generatedQuestions) {
    const topics = Array.isArray(question.topics) ? question.topics : []
    const firstExpectedTopic = topics.find((topic) => expectedMap.has(normalizeTopicKey(topic)))

    if (firstExpectedTopic) {
      const key = normalizeTopicKey(firstExpectedTopic)
      actualByExpected.set(key, (actualByExpected.get(key) ?? 0) + 1)
      continue
    }

    if (topics.length > 0) {
      const raw = topics[0].trim()
      if (raw) unexpectedTopics.set(raw, (unexpectedTopics.get(raw) ?? 0) + 1)
    }
  }

  const mismatches = expected
    .map((entry) => {
      const actual = actualByExpected.get(normalizeTopicKey(entry.name)) ?? 0
      return actual === entry.count ? null : `${entry.name}: expected ${entry.count}, got ${actual}`
    })
    .filter((value): value is string => value !== null)

  const expectedTotal = expected.reduce((sum, entry) => sum + entry.count, 0)
  const totalMismatch = generatedQuestions.length !== expectedTotal
    ? `total expected ${expectedTotal}, got ${generatedQuestions.length}`
    : null

  if (mismatches.length === 0 && unexpectedTopics.size === 0 && !totalMismatch) {
    return null
  }

  const parts: string[] = []
  if (mismatches.length > 0) parts.push(`per-topic mismatch (${mismatches.join('; ')})`)
  if (unexpectedTopics.size > 0) {
    const unexpectedText = Array.from(unexpectedTopics.entries())
      .map(([topic, count]) => `${topic}: ${count}`)
      .join(', ')
    parts.push(`unexpected topic tags (${unexpectedText})`)
  }
  if (totalMismatch) parts.push(totalMismatch)

  return `Topic distribution warning: ${parts.join(' | ')}`
}

export function ExamCreator({ 
  organizationId, 
  documents, 
  examId, 
  initialData,
  onCreateExam,
  onUpdateExam,
  onGenerateExam,
  onTranslateExam,
  examsListPath = '/teacher/exams',
  examDetailPath = (id: string) => `/teacher/exams/${id}`,
  translations: translationsProp,
  translationsContext: translationsContextProp,
}: ExamCreatorProps) {
  const fromInternalContext = useExamCreatorTranslations()
  const fromAppContext = translationsContextProp ? useContext(translationsContextProp) : null
  const t: ExamCreatorTranslations = {
    ...DEFAULT_EXAM_CREATOR_TRANSLATIONS,
    ...(fromAppContext ?? fromInternalContext ?? undefined),
    ...(translationsProp ?? undefined),
  }
  const questionTypeLabels: Record<QuestionType, string> = useMemo(() => ({
    multiple_choice: t.typeMultipleChoice,
    true_false: t.typeTrueFalse,
    multiple_select: t.typeMultipleSelect,
    fill_blank: t.typeFillBlank,
  }), [t.typeMultipleChoice, t.typeTrueFalse, t.typeMultipleSelect, t.typeFillBlank])
  const difficultyLabels: Record<DifficultyLevel, string> = useMemo(() => ({
    easy: t.difficultyEasy,
    medium: t.difficultyMedium,
    hard: t.difficultyHard,
  }), [t.difficultyEasy, t.difficultyMedium, t.difficultyHard])

  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Track current exam ID (can be updated after generation creates a new exam)
  const [currentExamId, setCurrentExamId] = useState<string | undefined>(examId)
  
  // Sync currentExamId when examId prop changes (e.g., when navigating to edit page)
  useEffect(() => {
    if (examId) {
      setCurrentExamId(examId)
    }
  }, [examId])
  
  // Edit mode flag - if we have a currentExamId, we're in edit mode (even if initialData is not set yet)
  // This allows us to update exams that were just created during generation
  const isEditMode = Boolean(currentExamId)
  
  // Exam state - initialize from initialData if editing
  const [questions, setQuestions] = useState<Question[]>(initialData?.questions || [])
  const [currentLanguage, setCurrentLanguage] = useState(initialData?.language || 'en')
  const [translations, setTranslations] = useState<Record<string, Question[]>>(initialData?.translations || {})
  
  // Exam settings - initialize from initialData if editing
  const [title, setTitle] = useState(initialData?.title || '')
  const [durationMinutes, setDurationMinutes] = useState(initialData?.duration_minutes ?? 60)
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(
    (initialData?.settings?.show_correct_answers ?? true) as boolean
  )
  const [showExplanations, setShowExplanations] = useState(
    (initialData?.settings?.show_explanations ?? true) as boolean
  )

  // Generation settings
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [generateLanguage, setGenerateLanguage] = useState(initialData?.language || 'en')
  const [totalQuestions, setTotalQuestions] = useState(10)
  const [topicEntries, setTopicEntries] = useState<{ name: string; count?: number }[]>([]) // name + optional question count per topic
  const [corePrompt, setCorePrompt] = useState('')
  
  // Filter by topic in preview/edit
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string | null>(null)
  
  // Question type distribution (percentages of totalQuestions)
  const [questionTypePercentages, setQuestionTypePercentages] = useState<QuestionTypeDistribution>({
    multiple_choice: 50,
    true_false: 20,
    multiple_select: 20,
    fill_blank: 10,
  })
  
  // Difficulty distribution (percentages of totalQuestions)
  const [difficultyPercentages, setDifficultyPercentages] = useState<DifficultyDistribution>({
    easy: 30,
    medium: 50,
    hard: 20,
  })

  // UI state
  const [currentPage, setCurrentPage] = useState(1)
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null)
  const [translatingLang, setTranslatingLang] = useState<string | null>(null)

  // Computed values
  const availableLanguages = useMemo(() => [generateLanguage, ...Object.keys(translations)], [generateLanguage, translations])
  
  const totalQuestionTypePercent = useMemo(
    () => questionTypePercentages.multiple_choice + questionTypePercentages.true_false + questionTypePercentages.multiple_select + questionTypePercentages.fill_blank,
    [questionTypePercentages]
  )
  const totalDifficultyPercent = useMemo(
    () => difficultyPercentages.easy + difficultyPercentages.medium + difficultyPercentages.hard,
    [difficultyPercentages]
  )

  const entriesWithNames = useMemo(() => topicEntries.filter((entry) => entry.name.trim()), [topicEntries])
  const topicNames = useMemo(() => entriesWithNames.map((entry) => entry.name.trim()), [entriesWithNames])
  const toInt = useCallback((n: number | undefined) => Math.max(0, Math.floor(Number(n) || 0)), [])
  const allTopicsHaveCount = useMemo(
    () => topicNames.length > 0 && entriesWithNames.every((entry) => toInt(entry.count) > 0),
    [topicNames.length, entriesWithNames, toInt]
  )
  const totalFromTopics = useMemo(
    () => (allTopicsHaveCount ? entriesWithNames.reduce((sum, entry) => sum + toInt(entry.count), 0) : 0),
    [allTopicsHaveCount, entriesWithNames, toInt]
  )
  const resolvedTotalQuestions = allTopicsHaveCount ? totalFromTopics : Math.max(1, Math.floor(Number(totalQuestions) || 10))

  // If per-topic counts are fully set, keep Total Questions synchronized to their sum.
  useEffect(() => {
    if (allTopicsHaveCount && totalFromTopics > 0 && totalFromTopics !== totalQuestions) {
      setTotalQuestions(totalFromTopics)
    }
  }, [allTopicsHaveCount, totalFromTopics, totalQuestions])

  const plannedQuestionTypeCounts = useMemo(
    () => distributePercentToCounts(questionTypePercentages, resolvedTotalQuestions, ['multiple_choice', 'true_false', 'multiple_select', 'fill_blank'] as const),
    [questionTypePercentages, resolvedTotalQuestions]
  )
  const plannedDifficultyCounts = useMemo(
    () => distributePercentToCounts(difficultyPercentages, resolvedTotalQuestions, ['easy', 'medium', 'hard'] as const),
    [difficultyPercentages, resolvedTotalQuestions]
  )
  const buildRangeTrackStyle = useCallback(
    (value: number, color: string) => ({
      background: `linear-gradient(to right, ${color} 0%, ${color} ${value}%, #e2e8f0 ${value}%, #e2e8f0 100%)`,
    }),
    []
  )

  const handleQuestionTypePercentChange = useCallback((key: keyof QuestionTypeDistribution, value: number | string) => {
    setQuestionTypePercentages((prev) =>
      updatePercentagesForHundred(prev, ['multiple_choice', 'true_false', 'multiple_select', 'fill_blank'] as const, key, value)
    )
  }, [])

  const handleDifficultyPercentChange = useCallback((key: keyof DifficultyDistribution, value: number | string) => {
    setDifficultyPercentages((prev) =>
      updatePercentagesForHundred(prev, ['easy', 'medium', 'hard'] as const, key, value)
    )
  }, [])
  
  // Difficulty distribution from actual questions
  const actualDifficultyDistribution = useMemo(() => {
    const dist: Record<DifficultyLevel, number> = { easy: 0, medium: 0, hard: 0 }
    questions.forEach(q => {
      if (q.difficulty) dist[q.difficulty]++
    })
    return dist
  }, [questions])

  // Question type distribution
  const questionTypeDistribution = useMemo(() => {
    const dist: Record<QuestionType, number> = {
      multiple_choice: 0,
      true_false: 0,
      multiple_select: 0,
      fill_blank: 0,
    }
    questions.forEach(q => {
      dist[q.type]++
    })
    return dist
  }, [questions])

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

  // Get questions for current language
  const displayQuestions = useMemo(() => {
    const baseQuestions = currentLanguage === generateLanguage 
      ? questions 
      : translations[currentLanguage] || questions
    
    // Filter by topic if selected
    if (selectedTopicFilter) {
      return baseQuestions.filter(q => 
        q.topics && q.topics.some(t => t.trim() === selectedTopicFilter)
      )
    }
    
    return baseQuestions
  }, [currentLanguage, generateLanguage, questions, translations, selectedTopicFilter])

  // Pagination should be based on the filtered list (displayQuestions), otherwise filters can create empty pages.
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(displayQuestions.length / QUESTIONS_PER_PAGE)),
    [displayQuestions.length]
  )

  // Reset to first page when changing topic filter
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedTopicFilter])

  // Clamp page if filtering reduces total pages
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const currentDisplayQuestions = useMemo(() => {
    return displayQuestions.slice(
      (currentPage - 1) * QUESTIONS_PER_PAGE,
      currentPage * QUESTIONS_PER_PAGE
    )
  }, [displayQuestions, currentPage])

  // Generate Questions
  const handleGenerate = useCallback(async () => {
    setError(null)
    setWarning(null)
    setSuccess(null)

    startTransition(async () => {
      const result = await onGenerateExam({
        documentIds: selectedDocIds,
        organizationId,
        questionCount: resolvedTotalQuestions,
        difficulty: 'mixed',
        language: generateLanguage,
        topics: topicNames.length > 0 ? topicNames : undefined,
        customPrompt: corePrompt.trim() || undefined,
        topicQuestionCounts: topicNames.length > 0 ? entriesWithNames.map(t => toInt(t.count)) : undefined,
        questionTypes: plannedQuestionTypeCounts,
        difficultyLevels: plannedDifficultyCounts,
      })

      if (result.error) {
        setError(result.error)
        setWarning(null)
      } else if (result.questions) {
        // Topics should already be assigned by AI based on question content
        // If AI didn't assign topics but we provided them, we'll keep questions without topics
        // (AI should have assigned them during generation)
        const questionsWithTopics = result.questions.map((q) => {
          // Use topics assigned by AI if present, otherwise leave undefined
          // This ensures topics are relevant to each question's content
          return {
            ...q,
            topics: q.topics && Array.isArray(q.topics) && q.topics.length > 0
              ? q.topics.filter((t: string) => t && t.trim()).map((t: string) => t.trim())
              : undefined
          }
        })
        
        const topicContractWarning = allTopicsHaveCount
          ? buildTopicContractWarning(entriesWithNames, questionsWithTopics)
          : null
        const autoTitle = buildAutoExamTitle(title, selectedDocIds, documents)
        setQuestions(questionsWithTopics)
        setTitle(autoTitle)
        setWarning(topicContractWarning)
        setCurrentLanguage(generateLanguage)
        setTranslations({})
        setCurrentPage(1)
        // Automatically save as draft
        const examData = {
          organizationId,
          title: autoTitle,
          description: null,
          classId: null,
          subject: null,
          gradeLevel: null,
          durationMinutes,
          questions: result.questions,
          isPublished: false, // Save as draft
          language: generateLanguage,
          translations: {},
          showCorrectAnswers,
          showExplanations,
        }

        const saveResult = isEditMode
          ? await onUpdateExam(currentExamId!, examData)
          : await onCreateExam(examData)

        if (saveResult.error) {
          setError(`${t.errorGeneratedSaveFailed} ${saveResult.error}`)
        } else {
          setSuccess(`✨ ${t.successGeneratedSaved} ${result.questions.length} questions as draft!`)
          
          // If it's a new exam, update to edit mode with the new exam ID
          if (!isEditMode && saveResult.data?.id) {
            // Update the current exam ID state so future saves will update instead of create
            setCurrentExamId(saveResult.data.id)
            // Update URL without navigation to keep user on the page
            window.history.replaceState({}, '', examDetailPath(saveResult.data.id))
          }
          
          setTimeout(() => setSuccess(null), 5000)
        }
      }
    })
  }, [selectedDocIds, organizationId, resolvedTotalQuestions, generateLanguage, topicNames, corePrompt, entriesWithNames, toInt, plannedQuestionTypeCounts, plannedDifficultyCounts, onGenerateExam, allTopicsHaveCount, durationMinutes, showCorrectAnswers, showExplanations, isEditMode, currentExamId, onCreateExam, onUpdateExam, title, documents, examDetailPath, t])

  // Translate to language
  const handleTranslate = useCallback(async (targetLang: string, forceRetranslate: boolean = false) => {
    if (questions.length === 0) return
    
    if (targetLang === generateLanguage) {
      setCurrentLanguage(targetLang)
      setCurrentPage(1)
      return
    }
    
    if (translations[targetLang] && !forceRetranslate) {
      setCurrentLanguage(targetLang)
      setCurrentPage(1)
      return
    }

    setError(null)
    setTranslatingLang(targetLang)

    startTransition(async () => {
      const result = await onTranslateExam({
        questions,
        targetLanguage: targetLang,
      })

      if (result.error) {
        setError(result.error)
        setTranslatingLang(null)
      } else if (result.questions) {
        // Preserve and translate topics for each question
        const translatedQuestions = result.questions.map((translatedQ) => {
          // Find the corresponding original question by ID
          const originalQ = questions.find(q => q.id === translatedQ.id)
          // If original question has topics, include them in translated question
          // Topics will be translated by the AI service, but we preserve the structure
          return {
            ...translatedQ,
            topics: originalQ?.topics || translatedQ.topics
          }
        })
        setTranslations(prev => ({ ...prev, [targetLang]: translatedQuestions }))
        setCurrentLanguage(targetLang)
        setCurrentPage(1)
        const langName = LANGUAGES.find(l => l.code === targetLang)?.name || targetLang
        setSuccess(forceRetranslate ? `🔄 ${t.retranslatedTo} ${langName}!` : `🌐 ${t.translatedTo} ${langName}!`)
        setTimeout(() => setSuccess(null), 3000)
        setTranslatingLang(null)
      }
    })
  }, [questions, generateLanguage, translations, onTranslateExam, t])

  // Update question
  const updateQuestion = useCallback((id: string, updates: Partial<Question>) => {
    if (currentLanguage === generateLanguage) {
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q))
    } else {
      // Update translation
      setTranslations(prev => ({
        ...prev,
        [currentLanguage]: prev[currentLanguage].map(q => q.id === id ? { ...q, ...updates } : q)
      }))
    }
  }, [currentLanguage, generateLanguage])

  // Remove question
  const removeQuestion = useCallback((id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id))
    // Also remove from translations
    setTranslations(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(lang => {
        updated[lang] = updated[lang].filter(q => q.id !== id)
      })
      return updated
    })
    if (currentDisplayQuestions.length === 1 && currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }, [currentDisplayQuestions.length, currentPage])

  // Add manual question
  const addQuestion = useCallback((type: QuestionType, difficulty: DifficultyLevel = 'medium') => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      type,
      text: '',
      options: type === 'multiple_choice' || type === 'multiple_select' ? ['', '', '', ''] : type === 'true_false' ? [t.optionTrue, t.optionFalse] : [],
      correctAnswer: type === 'true_false' ? t.optionTrue : type === 'multiple_select' ? [] : '',
      difficulty,
    }
    setQuestions(prev => [...prev, newQuestion])
    setCurrentPage(Math.ceil((questions.length + 1) / QUESTIONS_PER_PAGE))
    setEditingQuestion(newQuestion.id)
  }, [questions.length, t.optionTrue, t.optionFalse])

  // Auto-generate title based on documents or date
  const generateTitle = useCallback(
    () => buildAutoExamTitle(title, selectedDocIds, documents),
    [title, selectedDocIds, documents]
  )

  // Export questions (current language + filters) as CSV (Excel-friendly): variants in separate columns, correct answer as letter(s) A/B/C/D
  const handleExportQuestions = useCallback(() => {
    if (displayQuestions.length === 0) {
      setError(t.errorNoQuestionsExport)
      return
    }
    const ok = exportQuestionsToCsv({
      questions: displayQuestions,
      languageCode: currentLanguage,
      filenameBase: generateTitle(),
      questionTypeLabels,
      difficultyLabels,
    })
    if (ok) {
      setSuccess(t.successExportCsv)
      setTimeout(() => setSuccess(null), 4000)
    }
  }, [displayQuestions, currentLanguage, generateTitle, t.successExportCsv])

  // Save exam (always as draft - publishing happens when exam is assigned to a class)
  const handleSave = useCallback(async (_publish: boolean = false) => {
    if (questions.length === 0) {
      setError(t.errorNoQuestionsSave)
      return
    }

    setError(null)
    const autoTitle = generateTitle()

    startTransition(async () => {
      const examData = {
        organizationId,
        title: autoTitle,
        description: null,
        classId: null,
        subject: null,
        gradeLevel: null,
        durationMinutes,
        questions,
        // Exams created here are always drafts.
        // They become "published" when attached to a class in the class flow.
        isPublished: false,
        language: generateLanguage,
        translations,
        showCorrectAnswers,
        showExplanations,
      }

      const result = isEditMode
        ? await onUpdateExam(currentExamId!, examData)
        : await onCreateExam(examData)

      if (result.error) {
        setError(result.error)
      } else {
        // If we created a new exam, update the current exam ID
        if (!isEditMode && result.data?.id) {
          setCurrentExamId(result.data.id)
        }
        
        if (isEditMode) {
          router.push(examDetailPath(currentExamId!))
        } else if (result.data?.id) {
          router.push(examDetailPath(result.data.id))
        } else {
          router.push(examsListPath)
        }
        router.refresh()
      }
    })
  }, [questions, organizationId, durationMinutes, generateLanguage, translations, showCorrectAnswers, showExplanations, router, isEditMode, currentExamId, generateTitle, onCreateExam, onUpdateExam, examsListPath, examDetailPath])

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 border-2 border-red-200 p-4 text-sm text-red-800 shadow-sm" role="alert">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">
              {error.includes('Not enough tokens') || error.includes('Your balance:') ? t.notEnoughTokens : t.somethingWentWrong}
            </p>
            <p className="mt-1 break-words">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="flex-shrink-0 p-1 text-red-500 hover:text-red-700 text-lg rounded hover:bg-red-100" aria-label={t.dismiss}>×</button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-700 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}
      {warning && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 shadow-sm" role="status">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-600" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">Generation contract check</p>
            <p className="mt-1 break-words">{warning}</p>
          </div>
          <button onClick={() => setWarning(null)} className="flex-shrink-0 p-1 text-amber-500 hover:text-amber-700 text-lg rounded hover:bg-amber-100" aria-label={t.dismiss}>×</button>
        </div>
      )}

      <div className={`grid gap-6 ${questions.length > 0 ? 'lg:grid-cols-3' : ''}`}>
        {/* Left Panel - Generation & Settings (full width when no questions yet) */}
        <div className="space-y-4">
          {/* AI Generation Card - Only show in create mode, not edit mode */}
          {!isEditMode && (
            <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-5 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{t.aiGenerateTitle}</h3>
                  <p className="text-xs text-gray-500">{t.aiGenerateSubtitle}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                  selectedDocIds.length > 0
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-amber-200 bg-amber-50 text-amber-700'
                }`}>
                  {selectedDocIds.length > 0
                    ? `RAG mode active: ${selectedDocIds.length} document(s) selected.`
                    : 'AI-only mode active: no document selected. Generation will use your settings and core prompt.'}
                </div>
                  {/* Exam Title */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                      {t.examTitleLabel}
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Network Operating Systems - Midterm"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 placeholder:text-gray-400"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Leave empty to auto-generate from selected documents.
                    </p>
                  </div>

                  {/* Document Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                      {t.selectDocuments} (optional)
                    </label>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto rounded-lg border border-gray-100 p-2 bg-white/50">
                      {documents.map((doc) => (
                        <label
                          key={doc.id}
                          className={`flex items-center gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-all text-sm ${
                            selectedDocIds.includes(doc.id)
                              ? 'border-purple-400 bg-purple-50 shadow-sm ring-1 ring-purple-400'
                              : 'border-gray-200 hover:border-purple-200 hover:bg-purple-25'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedDocIds.includes(doc.id)}
                            onChange={() => {
                              setSelectedDocIds(prev =>
                                prev.includes(doc.id)
                                  ? prev.filter(id => id !== doc.id)
                                  : [...prev, doc.id]
                            )
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="truncate flex-1 font-medium">{doc.title}</span>
                          <span className="text-xs text-gray-400 uppercase">{doc.file_type}</span>
                        </label>
                      ))}
                    </div>
                    {documents.length === 0 && (
                      <p className="mt-2 text-xs text-gray-500">
                        {t.noDocumentsFound} You can continue in AI-only mode.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                      Core Prompt (optional)
                    </label>
                    <textarea
                      value={corePrompt}
                      onChange={(e) => setCorePrompt(e.target.value)}
                      placeholder="Describe what this exam should focus on. Example: Job-ready practical scenarios for junior frontend developers, with clear real-world context."
                      rows={3}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 placeholder:text-gray-400 resize-none"
                    />
                  </div>

                  {/* Topics with optional question count per topic */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-gray-600">
                        {t.topicsOptional}
                        <span className="text-gray-400 font-normal ml-1">{t.topicsOptionalHint}</span>
                      </label>
                      {topicEntries.length < 5 && (
                        <button
                          type="button"
                          onClick={() => setTopicEntries([...topicEntries, { name: '' }])}
                          className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium"
                        >
                          <Plus className="h-3 w-3" />
                          {t.addTopic}
                        </button>
                      )}
                    </div>
                    {topicEntries.length === 0 ? (
                      <p className="text-xs text-gray-500 py-2">
                        {t.topicsEmptyHint}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {topicEntries.map((entry, index) => (
                          <div key={index} className="flex items-center gap-2 flex-wrap">
                            <input
                              type="text"
                              value={entry.name}
                              onChange={(e) => {
                                const next = [...topicEntries]
                                next[index] = { ...next[index], name: e.target.value }
                                setTopicEntries(next)
                              }}
                              placeholder="e.g. ВВЕДЕНИЕ (pages 3-19) or КЛЕТОЧНАЯ ТЕОРИЯ"
                              className="flex-1 min-w-[140px] rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 placeholder:text-gray-400"
                            />
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500 whitespace-nowrap">{t.questionsPerTopicLabel}</span>
                              <input
                                type="number"
                                min={1}
                                max={200}
                                value={entry.count ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value
                                  const next = [...topicEntries]
                                  next[index] = { ...next[index], count: v === '' ? undefined : Math.max(1, parseInt(v, 10) || 1) }
                                  setTopicEntries(next)
                                }}
                                placeholder="—"
                                className="w-16 rounded-lg border border-gray-200 px-2 py-2 text-sm bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setTopicEntries(topicEntries.filter((_, i) => i !== index))}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                              title={t.removeTopic}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1.5">
                      {topicEntries.length === 0
                        ? t.leaveEmptyHint
                        : (() => {
                            const withNames = topicEntries.filter(ent => ent.name.trim())
                            const allSet = withNames.length > 0 && withNames.every(ent => ent.count != null && ent.count > 0)
                            return allSet
                              ? `${t.totalQuestionsAcross} ${withNames.reduce((s, ent) => s + (ent.count ?? 0), 0)} questions across ${withNames.length} topic(s)`
                              : `${topicEntries.length}/5 ${t.topicsTotalHint}`
                          })()}
                    </p>
                  </div>

                  {/* Quick Options Row – language, total questions, exam time */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <LanguageSelectWithFlags
                      label={t.language}
                      value={generateLanguage}
                      onChange={setGenerateLanguage}
                      options={LANGUAGES}
                    />
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Total Questions</label>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={resolvedTotalQuestions}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10)
                          if (!Number.isNaN(v)) setTotalQuestions(Math.max(1, Math.min(200, v)))
                        }}
                        disabled={allTopicsHaveCount}
                        className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-sm font-medium bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        aria-label="Total questions"
                        placeholder="10"
                      />
                      {allTopicsHaveCount && (
                        <p className="mt-1 text-[11px] text-gray-500">Auto-synced from topic counts.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">{t.minutesLabel}</label>
                      <input
                        type="number"
                        min={1}
                        max={480}
                        value={durationMinutes}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10)
                          if (!Number.isNaN(v)) setDurationMinutes(Math.max(1, Math.min(480, v)))
                        }}
                        className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-sm font-medium bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        aria-label={t.minutesLabel}
                        placeholder="60"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 text-sm font-medium text-gray-700">
                    <Settings className="h-4 w-4" />
                    {t.advancedSettings}
                  </div>

                  {/* Advanced Settings Panel */}
                  <div className="space-y-4 p-4 rounded-xl bg-white border border-gray-200">
                      {/* Question Types */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">{t.questionTypes}</label>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            totalQuestionTypePercent === 100 ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {totalQuestionTypePercent}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">Percentages of total questions ({resolvedTotalQuestions}). Total is always auto-balanced to 100%.</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-blue-700">{t.typeMultipleChoice}</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={questionTypePercentages.multiple_choice}
                                  onChange={(e) => handleQuestionTypePercentChange('multiple_choice', e.target.value)}
                                  className="w-24 h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-blue-600"
                                  style={buildRangeTrackStyle(questionTypePercentages.multiple_choice, '#2563eb')}
                                />
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={questionTypePercentages.multiple_choice}
                                  onChange={(e) => handleQuestionTypePercentChange('multiple_choice', e.target.value)}
                                  className="w-12 text-center rounded border border-blue-300 text-sm font-bold text-blue-700 bg-white"
                                />
                                <span className="text-[11px] font-semibold text-blue-700">{plannedQuestionTypeCounts.multiple_choice}</span>
                              </div>
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-green-50 border border-green-200">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-green-700">{t.typeTrueFalse}</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={questionTypePercentages.true_false}
                                  onChange={(e) => handleQuestionTypePercentChange('true_false', e.target.value)}
                                  className="w-24 h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-600 [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-green-600"
                                  style={buildRangeTrackStyle(questionTypePercentages.true_false, '#16a34a')}
                                />
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={questionTypePercentages.true_false}
                                  onChange={(e) => handleQuestionTypePercentChange('true_false', e.target.value)}
                                  className="w-12 text-center rounded border border-green-300 text-sm font-bold text-green-700 bg-white"
                                />
                                <span className="text-[11px] font-semibold text-green-700">{plannedQuestionTypeCounts.true_false}</span>
                              </div>
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-purple-50 border border-purple-200">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-purple-700">{t.typeMultipleSelect}</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={questionTypePercentages.multiple_select}
                                  onChange={(e) => handleQuestionTypePercentChange('multiple_select', e.target.value)}
                                  className="w-24 h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-600 [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-purple-600"
                                  style={buildRangeTrackStyle(questionTypePercentages.multiple_select, '#9333ea')}
                                />
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={questionTypePercentages.multiple_select}
                                  onChange={(e) => handleQuestionTypePercentChange('multiple_select', e.target.value)}
                                  className="w-12 text-center rounded border border-purple-300 text-sm font-bold text-purple-700 bg-white"
                                />
                                <span className="text-[11px] font-semibold text-purple-700">{plannedQuestionTypeCounts.multiple_select}</span>
                              </div>
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-orange-50 border border-orange-200">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-orange-700">{t.typeFillBlank}</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={questionTypePercentages.fill_blank}
                                  onChange={(e) => handleQuestionTypePercentChange('fill_blank', e.target.value)}
                                  className="w-24 h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-600 [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-orange-600"
                                  style={buildRangeTrackStyle(questionTypePercentages.fill_blank, '#ea580c')}
                                />
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={questionTypePercentages.fill_blank}
                                  onChange={(e) => handleQuestionTypePercentChange('fill_blank', e.target.value)}
                                  className="w-12 text-center rounded border border-orange-300 text-sm font-bold text-orange-700 bg-white"
                                />
                                <span className="text-[11px] font-semibold text-orange-700">{plannedQuestionTypeCounts.fill_blank}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Difficulty Levels (percentages of total) */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">{t.difficultyLevels}</label>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            totalDifficultyPercent === 100 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {totalDifficultyPercent}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">Set percentages; values are converted to counts out of {resolvedTotalQuestions}. Total auto-balances to 100%.</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="flex flex-col items-center p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                            <span className="text-xs font-bold text-emerald-700 mb-1">{t.difficultyEasy}</span>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={difficultyPercentages.easy}
                              onChange={(e) => handleDifficultyPercentChange('easy', e.target.value)}
                              className="w-full mb-1 h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-600 [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-emerald-600"
                              style={buildRangeTrackStyle(difficultyPercentages.easy, '#059669')}
                            />
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={difficultyPercentages.easy}
                              onChange={(e) => handleDifficultyPercentChange('easy', e.target.value)}
                              className="w-14 text-center rounded border border-emerald-300 text-sm font-bold text-emerald-700 bg-white"
                            />
                            <span className="mt-1 text-[11px] font-semibold text-emerald-700">{plannedDifficultyCounts.easy}</span>
                          </div>
                          <div className="flex flex-col items-center p-2 rounded-lg bg-amber-50 border border-amber-200">
                            <span className="text-xs font-bold text-amber-700 mb-1">{t.difficultyMedium}</span>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={difficultyPercentages.medium}
                              onChange={(e) => handleDifficultyPercentChange('medium', e.target.value)}
                              className="w-full mb-1 h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-600 [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-amber-600"
                              style={buildRangeTrackStyle(difficultyPercentages.medium, '#d97706')}
                            />
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={difficultyPercentages.medium}
                              onChange={(e) => handleDifficultyPercentChange('medium', e.target.value)}
                              className="w-14 text-center rounded border border-amber-300 text-sm font-bold text-amber-700 bg-white"
                            />
                            <span className="mt-1 text-[11px] font-semibold text-amber-700">{plannedDifficultyCounts.medium}</span>
                          </div>
                          <div className="flex flex-col items-center p-2 rounded-lg bg-red-50 border border-red-200">
                            <span className="text-xs font-bold text-red-700 mb-1">{t.difficultyHard}</span>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={difficultyPercentages.hard}
                              onChange={(e) => handleDifficultyPercentChange('hard', e.target.value)}
                              className="w-full mb-1 h-1.5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-red-600"
                              style={buildRangeTrackStyle(difficultyPercentages.hard, '#dc2626')}
                            />
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={difficultyPercentages.hard}
                              onChange={(e) => handleDifficultyPercentChange('hard', e.target.value)}
                              className="w-14 text-center rounded border border-red-300 text-sm font-bold text-red-700 bg-white"
                            />
                            <span className="mt-1 text-[11px] font-semibold text-red-700">{plannedDifficultyCounts.hard}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerate}
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 disabled:opacity-50 disabled:shadow-none transition-all duration-200"
                  >
                    {isPending && !translatingLang ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {t.generating}
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        {t.generateQuestions}
                      </>
                    )}
                  </button>
                  {isPending && !translatingLang && (
                    <p className="text-xs text-gray-500 text-center mt-2">
                      {t.generateWaitHint}
                    </p>
                  )}
                </div>
            </div>
          )}

          {/* After exam – what students see in results */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4 text-gray-500" />
              {t.afterExamTitle}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {t.afterExamHint}
            </p>
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-sm font-medium text-gray-700">{t.showCorrectAnswers}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showCorrectAnswers}
                  onClick={() => setShowCorrectAnswers((v) => !v)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    showCorrectAnswers ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                      showCorrectAnswers ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-sm font-medium text-gray-700">{t.showExplanations}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showExplanations}
                  onClick={() => setShowExplanations((v) => !v)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    showExplanations ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                      showExplanations ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
            </div>
          </div>

          {/* Summary & Stats Card */}
          {questions.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 rounded-xl border border-purple-200 bg-purple-50/40 p-3">
                <label className="mb-1 block text-xs font-semibold text-purple-700 uppercase tracking-wide">
                  {t.examTitleLabel} ({t.editableLabel})
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.examTitlePlaceholder}
                  className="w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
                <p className="mt-1 text-xs text-purple-700/80">
                  {t.examTitleSaveHint}
                </p>
              </div>

              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gray-400" />
                {t.examSummary}
              </h3>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 p-3 text-center border border-blue-100">
                  <p className="text-2xl font-bold text-blue-600">{questions.length}</p>
                  <p className="text-xs font-medium text-blue-600/70">{t.questionsLabel}</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 p-3 text-center border border-purple-200 focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-1 transition-shadow">
                  <label className="block text-xs font-medium text-purple-600/80 mb-1">{t.minutesLabel} ({t.editableLabel})</label>
                  <input
                    type="number"
                    min={1}
                    max={480}
                    value={durationMinutes}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10)
                      if (!Number.isNaN(v)) setDurationMinutes(Math.max(1, Math.min(480, v)))
                    }}
                    className="w-full text-2xl font-bold text-purple-600 bg-white/60 border border-purple-200 rounded-lg text-center px-2 py-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    aria-label={t.minutesLabel}
                    title="Change exam time in minutes"
                  />
                </div>
                <div className="rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/50 p-3 text-center border border-orange-100">
                  <p className="text-2xl font-bold text-orange-600">{availableLanguages.length}</p>
                  <p className="text-xs font-medium text-orange-600/70">{t.languagesLabel}</p>
                </div>
              </div>

              {/* Question Type Distribution */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {t.questionTypesLabel}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(questionTypeDistribution).map(([type, count]) => count > 0 && (
                    <span
                      key={type}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border ${questionTypeColors[type as QuestionType]}`}
                    >
                      {questionTypeLabels[type as QuestionType].split(' ')[0]}: {count}
                    </span>
                  ))}
                </div>
              </div>

              {/* Difficulty Distribution */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  {t.difficultyDistribution}
                </p>
                <div className="flex gap-2">
                  {actualDifficultyDistribution.easy > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-300">
                      Easy: {actualDifficultyDistribution.easy}
                    </span>
                  )}
                  {actualDifficultyDistribution.medium > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-300">
                      Medium: {actualDifficultyDistribution.medium}
                    </span>
                  )}
                  {actualDifficultyDistribution.hard > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
                      Hard: {actualDifficultyDistribution.hard}
                    </span>
                  )}
                  {(actualDifficultyDistribution.easy + actualDifficultyDistribution.medium + actualDifficultyDistribution.hard) === 0 && (
                    <span className="text-xs text-gray-400 italic">{t.noDifficultyData}</span>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Panel - Questions Preview (only show after questions exist; first step = AI generate only) */}
        {questions.length > 0 && (
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-5 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-gray-900 text-lg">{t.questionsPreview}</h3>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                    {questions.length} {t.totalLabel}
                  </span>
                </div>

                {/* Quick Language Switcher */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      {LANGUAGES.slice(0, 6).map((lang) => {
                        const isAvailable = availableLanguages.includes(lang.code)
                        const isCurrent = currentLanguage === lang.code
                        const isTranslating = translatingLang === lang.code

                        return (
                          <button
                            key={lang.code}
                            onClick={() => handleTranslate(lang.code)}
                            disabled={isPending}
                            className={`relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ${
                              isCurrent
                                ? 'bg-blue-100 ring-2 ring-blue-500 shadow-sm'
                                : isAvailable
                                ? 'bg-gray-100 hover:bg-gray-200'
                                : 'bg-gray-50 hover:bg-gray-100 opacity-50'
                            } disabled:opacity-50`}
                            title={lang.name}
                          >
                            {isTranslating ? (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            ) : (
                              <FlagIcon countryCode={lang.countryCode} size={20} />
                            )}
                            {isAvailable && !isCurrent && (
                              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-green-500 ring-2 ring-white" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                    {/* Retranslate Button */}
                    {currentLanguage !== generateLanguage && (
                      <button
                        onClick={() => handleTranslate(currentLanguage, true)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50 transition-colors"
                        title={t.retranslate}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        {t.retranslate}
                      </button>
                    )}
                  </div>
              </div>

              {/* Add Question Buttons */}
              <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs font-medium text-gray-500">{t.addLabel}</span>
                  {(['multiple_choice', 'true_false', 'multiple_select', 'fill_blank'] as QuestionType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => addQuestion(type)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      {questionTypeLabels[type].split(' ')[0]}
                    </button>
                  ))}
                </div>
            </div>

            {/* Questions List (panel only visible when questions exist) */}
            <div className="p-5">
                <div className="space-y-4">
                  {/* Topic Filter */}
                  {allTopics.length > 0 && (
                    <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200">
                      <span className="text-xs font-semibold text-gray-600">{t.filterByTopic}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedTopicFilter(null)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedTopicFilter === null
                            ? 'bg-purple-100 text-purple-700 border border-purple-300'
                            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {t.allLabel} ({questions.length})
                      </button>
                      {allTopics.map((topic) => {
                        const count = questions.filter(q => 
                          q.topics && q.topics.some(t => t.trim() === topic)
                        ).length
                        return (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => setSelectedTopicFilter(topic)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                              selectedTopicFilter === topic
                                ? 'bg-purple-100 text-purple-700 border border-purple-300'
                                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                            }`}
                          >
                            {topic} ({count})
                          </button>
                        )
                      })}
                    </div>
                  )}
                  
                  {currentDisplayQuestions.map((question, idx) => {
                    const globalIndex = (currentPage - 1) * QUESTIONS_PER_PAGE + idx
                    const isEditing = editingQuestion === question.id

                    return (
                      <div
                        key={question.id}
                        className={`rounded-xl border-2 transition-all duration-200 ${
                          isEditing ? 'border-blue-400 bg-blue-50/30 shadow-lg shadow-blue-500/10' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        {/* Question Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
                          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gray-800 to-gray-900 text-sm font-bold text-white shadow-md">
                              {globalIndex + 1}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold border ${questionTypeColors[question.type]}`}>
                              {questionTypeLabels[question.type]}
                            </span>
                            {question.difficulty && (
                              <span className={`rounded-full px-2.5 py-1 text-xs font-bold border ${difficultyColors[question.difficulty]}`}>
                                {difficultyLabels[question.difficulty]}
                              </span>
                            )}
                            {question.topics && question.topics.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap">
                                {question.topics.map((topic, topicIdx) => (
                                  <span
                                    key={topicIdx}
                                    className="rounded-full px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200"
                                    title={`${t.topicLabel} ${topic}`}
                                  >
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingQuestion(isEditing ? null : question.id)}
                              className={`p-2 rounded-lg transition-colors ${
                                isEditing ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                              }`}
                              title={isEditing ? t.doneEditing : t.editQuestion}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => removeQuestion(question.id)}
                              className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                              title={t.deleteQuestion}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Question Content */}
                        <div className="p-4">
                          {isEditing ? (
                            <QuestionEditor
                              question={question}
                              onUpdate={(updates) => updateQuestion(question.id, updates)}
                              onClose={() => setEditingQuestion(null)}
                              translations={{
                                questionLabel: t.questionEditorQuestionLabel,
                                questionPlaceholder: t.questionEditorQuestionPlaceholder,
                                optionsSelectOne: t.questionEditorOptionsSelectOne,
                                optionsSelectAll: t.questionEditorOptionsSelectAll,
                                optionLetter: t.questionEditorOptionLetter,
                                correctAnswerLabel: t.questionEditorCorrectAnswerLabel,
                                correctAnswerPlaceholder: t.questionEditorCorrectAnswerPlaceholder,
                                explanationLabel: t.questionEditorExplanationLabel,
                                explanationPlaceholder: t.questionEditorExplanationPlaceholder,
                                topicsLabel: t.questionEditorTopicsLabel,
                                topicPlaceholder: t.questionEditorTopicPlaceholder,
                                removeTopic: t.questionEditorRemoveTopic,
                                addTopic: t.questionEditorAddTopic,
                                difficultyLabel: t.questionEditorDifficultyLabel,
                                done: t.questionEditorDone,
                                difficultyEasy: t.difficultyEasy,
                                difficultyMedium: t.difficultyMedium,
                                difficultyHard: t.difficultyHard,
                              }}
                            />
                          ) : (
                            <QuestionPreview
                              question={question}
                              trueFalseLabels={{ optionTrue: t.optionTrue, optionFalse: t.optionFalse }}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t.previous}
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white shadow-md'
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
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    {t.next}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="sticky bottom-0 -mx-6 px-6 py-4 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg shadow-gray-200/50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.cancel}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportQuestions}
              disabled={displayQuestions.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              title={t.exportToExcel}
            >
              <FileText className="h-4 w-4" />
              {t.exportToExcel}
            </button>

            <button
              onClick={() => handleSave(false)}
              disabled={isPending || questions.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t.saveExam}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

