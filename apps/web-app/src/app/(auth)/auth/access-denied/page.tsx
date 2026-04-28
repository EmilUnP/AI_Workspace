'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { XCircle, GraduationCap, LogOut, Mail } from 'lucide-react'
import { signOut } from '@eduator/auth/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

function AccessDeniedContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = searchParams.get('message')

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-red-50/80 via-orange-50/50 to-amber-50/80 px-4">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(239,68,68,0.06),transparent)]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(to right, #0d9488 1px, transparent 1px), linear-gradient(to bottom, #0d9488 1px, transparent 1px)', backgroundSize: '3rem 3rem' }} />
      </div>

      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-green-600 shadow-lg shadow-emerald-500/25">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
        </Link>

        <div className="mt-10 overflow-hidden rounded-2xl border border-gray-100 bg-white p-8 shadow-xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-red-100">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            Access <span className="text-red-600">Denied</span>
          </h1>
          <p className="mt-3 text-gray-600">
            {message || 'Your account registration was not approved. This may be due to incomplete information or other verification issues.'}
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
          <h2 className="font-semibold text-gray-900">Need help?</h2>
          <p className="mt-2 text-sm text-gray-600">
            If you believe this is a mistake, please contact our support team for assistance.
          </p>
          <a
            href="mailto:support@eduator.ai"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40"
          >
            <Mail className="h-4 w-4" />
            Contact Support
          </a>
        </div>

        <button
          onClick={handleSignOut}
          className="mt-6 inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-700"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function AccessDeniedPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    }>
      <AccessDeniedContent />
    </Suspense>
  )
}
