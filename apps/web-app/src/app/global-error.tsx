'use client'

import { GlobalErrorBoundary } from '@eduator/ui'

function toSafeBoundaryError(error: Error & { digest?: string }): Error & { digest?: string } {
  const message =
    typeof error?.message === 'string' && error.message.trim().length > 0
      ? error.message
      : 'Unexpected application error'
  const safe = new globalThis.Error(message) as Error & { digest?: string }
  if (error?.digest) safe.digest = error.digest
  return safe
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <GlobalErrorBoundary error={toSafeBoundaryError(error)} reset={reset} variant="blue" />
}
