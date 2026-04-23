'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { PublicPageShell } from '@eduator/ui'

/**
 * Client-only redirect page. Used after login when user must go to SAAS app.
 * Server action redirects here with ?to=<url> so we can do a client-side redirect
 * without relying on POST response handling (fixes 405 on Vercel).
 */
function AuthRedirectContent() {
  const searchParams = useSearchParams()
  const to = searchParams.get('to')

  useEffect(() => {
    if (to) {
      try {
        const url = decodeURIComponent(to)
        if (url.startsWith('http://') || url.startsWith('https://')) {
          window.location.href = url
          return
        }
      } catch {
        // invalid URL
      }
    }
    window.location.href = '/auth/login'
  }, [to])

  return (
    <PublicPageShell accent="green" className="bg-[#f8fdf9]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        <p className="text-sm font-medium text-gray-600">Redirecting...</p>
      </div>
    </PublicPageShell>
  )
}

export default function AuthRedirectPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#f8fdf9]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    }>
      <AuthRedirectContent />
    </Suspense>
  )
}
