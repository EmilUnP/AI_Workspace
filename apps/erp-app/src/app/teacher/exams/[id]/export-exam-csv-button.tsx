'use client'

import { useTranslations } from 'next-intl'
import { Download } from 'lucide-react'
import { exportQuestionsToCsv } from '@eduator/ui'

interface ExportExamCsvButtonProps {
  questions: Array<{
    id: string
    type: string
    text: string
    options: string[]
    correctAnswer: string | string[]
    explanation?: string
    difficulty?: string
    topics?: string[]
  }>
  examTitle: string
  languageCode: string
}

export function ExportExamCsvButton({
  questions,
  examTitle,
  languageCode,
}: ExportExamCsvButtonProps) {
  const t = useTranslations('teacherExams')
  return (
    <button
      type="button"
      onClick={() => {
        exportQuestionsToCsv({
          questions,
          languageCode,
          filenameBase: examTitle,
        })
      }}
      disabled={questions.length === 0}
      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 sm:px-4"
      title={t('exportToExcelTitle')}
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">{t('exportToExcel')}</span>
    </button>
  )
}
