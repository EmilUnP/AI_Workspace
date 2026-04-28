'use client'

export type ErrorBoundaryVariant = 'violet' | 'blue'

const variantStyles: Record<ErrorBoundaryVariant, { bg: string }> = {
  violet: { bg: '#7c3aed' },
  blue: { bg: '#2563eb' },
}

export interface GlobalErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
  variant?: ErrorBoundaryVariant
}

/**
 * Shared global error content for Next.js global-error.tsx.
 * Renders minimal inline styles (no Tailwind) so it works when the root layout fails.
 * Use in both web application surfaces.
 */
export function GlobalErrorBoundary({ error, reset, variant = 'violet' }: GlobalErrorBoundaryProps) {
  void error

  const bg = variantStyles[variant].bg

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 24 }}>
        <div
          style={{
            maxWidth: 480,
            margin: '40px auto',
            padding: 24,
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            textAlign: 'center',
            backgroundColor: '#fff',
          }}
        >
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111' }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: 8, fontSize: 14, color: '#6b7280' }}>
            The app encountered an error. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 500,
              color: '#fff',
              backgroundColor: bg,
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
