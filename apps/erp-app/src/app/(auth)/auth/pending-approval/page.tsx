'use client'

import Link from 'next/link'
import { Clock, GraduationCap, LogOut } from 'lucide-react'
import { signOut } from '@eduator/auth/supabase/client'
import { useRouter } from 'next/navigation'

export default function PendingApprovalPage() {
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-yellow-50/80 px-4">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(245,158,11,0.08),transparent)]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(to right, #0d9488 1px, transparent 1px), linear-gradient(to bottom, #0d9488 1px, transparent 1px)', backgroundSize: '3rem 3rem' }} />
      </div>

      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 px-6 py-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
            </Link>
            <div className="mx-auto mt-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Clock className="h-8 w-8 text-white" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-white">
              Pending Approval
            </h1>
            <p className="mt-2 text-amber-100">
              Your account is waiting for administrator review
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-center text-gray-600">
              You&apos;ll receive an email notification once your account has been reviewed.
            </p>

            <div className="mt-6 space-y-3">
              {[
                'An administrator will review your registration',
                'You\'ll receive an email once approved',
                'Sign in again to access your dashboard',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl bg-gray-50 p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-600">{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
