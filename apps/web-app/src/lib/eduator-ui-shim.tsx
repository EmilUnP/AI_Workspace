import type { ReactNode } from 'react'

type AnyProps = Record<string, any>

function Placeholder({ children }: { children?: ReactNode }) {
  return <>{children ?? null}</>
}

export function AppErrorBoundary({ error, reset }: { error: Error; reset: () => void; variant?: string }) {
  return (
    <div className="mx-auto max-w-xl rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="mt-2 text-sm">{error?.message || 'Unexpected application error'}</p>
      <button type="button" onClick={reset} className="mt-4 rounded-md bg-red-700 px-3 py-2 text-sm text-white">
        Try again
      </button>
    </div>
  )
}

export function GlobalErrorBoundary({ error, reset }: { error: Error; reset: () => void; variant?: string }) {
  return <AppErrorBoundary error={error} reset={reset} />
}

export function PaginationFooter() {
  return null
}

export function LessonRowActions() { return null }
export function EducationPlanRowActions() { return null }
export function EducationPlanCreateForm() { return null }
export function EducationPlanEditForm() { return null }
export function AITutor() { return null }
export function LessonTabs() { return null }
export function AudioPlayer() { return null }
export function LessonActions() { return null }
export function RichTextWithMath({ children }: { children?: ReactNode }) { return <>{children ?? null}</> }
export function ExamCreator() { return null }

export async function exportQuestionsToCsv(_questions: unknown[], _fileName?: string) {
  return
}

export type QuestionType = string
export type Question = Record<string, any>
export type ExamCreatorTranslations = Record<string, string>
export type ExamCreatorProps = AnyProps
export const DEFAULT_EXAM_CREATOR_TRANSLATIONS: ExamCreatorTranslations = {}

export type DocumentUploadTranslations = Record<string, string>
export type DocumentsExplorerTranslations = Record<string, string>

export function useDocumentsList(initialDocuments: any[] = []) {
  return {
    documents: initialDocuments,
    addDocument: (_doc: any) => {},
    updateDocument: (_id: string, _doc: any) => {},
    removeDocument: (_id: string) => {},
  }
}

export function DocumentUploadZone(_props: AnyProps) { return <Placeholder /> }
export function DocumentsExplorer(_props: AnyProps) { return <Placeholder /> }

export function Card({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-gray-200 bg-white ${className}`}>{children}</div>
}

export function CardHeader({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <div className={`p-4 ${className}`}>{children}</div>
}

export function CardTitle({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <h3 className={`text-base font-semibold ${className}`}>{children}</h3>
}

export function CardDescription({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <p className={`text-sm text-gray-500 ${className}`}>{children}</p>
}

export function CardContent({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <div className={`p-4 pt-0 ${className}`}>{children}</div>
}

export function Button({ children, className = '', ...props }: AnyProps) {
  return (
    <button {...props} className={`rounded-md bg-gray-900 px-3 py-2 text-sm text-white hover:bg-gray-800 ${className}`}>
      {children}
    </button>
  )
}

export function BarChart(_props: AnyProps) { return <Placeholder /> }
export function LineChart(_props: AnyProps) { return <Placeholder /> }
export function HorizontalBarChart(_props: AnyProps) { return <Placeholder /> }
