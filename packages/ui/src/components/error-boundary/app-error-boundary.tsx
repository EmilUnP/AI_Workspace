'use client'
import { AlertCircle, RefreshCw } from 'lucide-react'

export type ErrorBoundaryVariant = 'violet' | 'blue'

const variantClasses: Record<ErrorBoundaryVariant, string> = {
  violet: 'bg-violet-600 hover:bg-violet-700',
  blue: 'bg-blue-600 hover:bg-blue-700',
}

export interface AppErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
  variant?: ErrorBoundaryVariant
}

/**
 * Shared error boundary content for Next.js error.tsx.
 * Use in both ERP (violet) and ERP (blue) apps so UI is centralized in @eduator/ui.
 */
export function AppErrorBoundary({ error, reset, variant = 'violet' }: AppErrorBoundaryProps) {
  void error

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      <div className="flex max-w-md flex-col items-center rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-gray-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-gray-500">
          We couldn&apos;t complete your request. This has been logged. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className={`mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white ${variantClasses[variant]}`}
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  )
}
