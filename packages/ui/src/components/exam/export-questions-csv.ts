/**
 * Shared CSV export for exam questions (with answers).
 * Used by exam-creator (edit page) and exam view (ExamLanguageSelector).
 * UTF-8 BOM so Excel opens Cyrillic/Unicode correctly.
 */

export interface ExportQuestion {
  id: string
  type: string
  text: string
  options: string[]
  correctAnswer: string | string[]
  explanation?: string
  difficulty?: string
  topics?: string[]
}

const VARIANT_LABELS = ['A', 'B', 'C', 'D', 'E']

const DEFAULT_TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Multiple Choice',
  true_false: 'True/False',
  multiple_select: 'Multiple Select',
  fill_blank: 'Fill in Blank',
}

const DEFAULT_DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

function escapeCsv(value: string | number | null | undefined): string {
  const v = value == null ? '' : String(value)
  return `"${v.replace(/"/g, '""')}"`
}

function correctAnswerToLetters(
  q: ExportQuestion,
  variantLabels: string[] = VARIANT_LABELS
): string {
  const opts = Array.isArray(q.options) ? q.options : []
  const correct = q.correctAnswer
  if (correct == null) return ''
  if (opts.length === 0) {
    return Array.isArray(correct) ? correct.join(', ') : String(correct)
  }
  const correctStrings = Array.isArray(correct) ? correct : [correct]
  const letters: string[] = []
  correctStrings.forEach((c) => {
    const idx = opts.findIndex((o) => String(o).trim() === String(c).trim())
    if (idx >= 0 && idx < variantLabels.length) letters.push(variantLabels[idx])
  })
  return letters.length > 0
    ? letters.join(', ')
    : Array.isArray(correct)
      ? correct.join(', ')
      : String(correct)
}

export interface ExportQuestionsCsvOptions {
  questions: ExportQuestion[]
  languageCode: string
  filenameBase: string
  questionTypeLabels?: Record<string, string>
  difficultyLabels?: Record<string, string>
}

/**
 * Build CSV content and trigger download for the given questions.
 * Uses Option A/B/C/D/E columns and Correct Answer as letter(s).
 */
export function exportQuestionsToCsv({
  questions,
  languageCode,
  filenameBase,
  questionTypeLabels = DEFAULT_TYPE_LABELS,
  difficultyLabels = DEFAULT_DIFFICULTY_LABELS,
}: ExportQuestionsCsvOptions): boolean {
  if (questions.length === 0) return false

  const header = [
    'Question #',
    'Language',
    'Type',
    'Difficulty',
    'Topics',
    'Question',
    'Option A',
    'Option B',
    'Option C',
    'Option D',
    'Option E',
    'Correct Answer',
    'Explanation',
  ]

  const lines: string[] = []
  lines.push(header.join(','))

  questions.forEach((q, index) => {
    const topics = q.topics?.join(' | ') ?? ''
    const opts = Array.isArray(q.options) ? q.options : []
    const optionA = opts[0] ?? ''
    const optionB = opts[1] ?? ''
    const optionC = opts[2] ?? ''
    const optionD = opts[3] ?? ''
    const optionE = opts[4] ?? ''
    const correctLetter = correctAnswerToLetters(q)

    lines.push(
      [
        escapeCsv(index + 1),
        escapeCsv(languageCode),
        escapeCsv(questionTypeLabels[q.type] ?? q.type),
        escapeCsv(q.difficulty ? (difficultyLabels[q.difficulty] ?? q.difficulty) : ''),
        escapeCsv(topics),
        escapeCsv(q.text),
        escapeCsv(optionA),
        escapeCsv(optionB),
        escapeCsv(optionC),
        escapeCsv(optionD),
        escapeCsv(optionE),
        escapeCsv(correctLetter),
        escapeCsv(q.explanation ?? ''),
      ].join(',')
    )
  })

  const csvContent = '\uFEFF' + lines.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  const safeName = filenameBase.replace(/[/\\?%*:|"<>]/g, '_')
  link.download = `${safeName} - questions (${languageCode}).csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  return true
}
