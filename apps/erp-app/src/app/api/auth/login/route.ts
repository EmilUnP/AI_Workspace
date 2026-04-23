import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Helper to redirect with status 303 (See Other).
 * This ensures the browser uses GET after a POST, following the PRG pattern.
 */
function redirectTo(url: URL) {
  return NextResponse.redirect(url, { status: 303 })
}

function getRequestOrigin(request: NextRequest) {
  const forwardedHost = request.headers
    .get('x-forwarded-host')
    ?.split(',')[0]
    ?.trim()
  const host = forwardedHost || request.headers.get('host')?.split(',')[0]?.trim()
  if (!host) {
    const explicitOrigin = process.env.NEXT_PUBLIC_ERP_URL || process.env.NEXT_PUBLIC_APP_URL
    if (explicitOrigin) return explicitOrigin.replace(/\/+$/, '')
    return request.nextUrl.origin
  }

  const forwardedProto = request.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim()
  const proto = forwardedProto || request.nextUrl.protocol.replace(':', '') || 'http'

  return `${proto}://${host}`
}

/**
 * POST /api/auth/login – form login handler.
 * Used instead of /auth/login/action so Vercel reliably accepts POST on API routes.
 */
/** Allow redirect only to same-origin paths (e.g. /org/slug) */
function isSafeRedirect(path: string | null): path is string {
  if (!path || typeof path !== 'string') return false
  const trimmed = path.trim()
  return trimmed.startsWith('/') && !trimmed.startsWith('//') && !/^https?:\/\//i.test(trimmed)
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const email = (formData.get('email') as string) || ''
  const password = (formData.get('password') as string) || ''
  const redirectToParam = (formData.get('redirectTo') as string) || ''
  const origin = getRequestOrigin(request)

  const orgParam = (formData.get('org') as string) || ''

  if (!email || !password) {
    const loginUrl = new URL('/auth/login', origin)
    loginUrl.searchParams.set('error', 'Email and password are required')
    if (orgParam) loginUrl.searchParams.set('org', orgParam)
    return redirectTo(loginUrl)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set(name, value, options)
          } catch {
            // Route handler
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.delete(name)
          } catch {
            // Route handler
          }
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const loginUrl = new URL('/auth/login', origin)
    loginUrl.searchParams.set('error', error.message)
    if (orgParam) loginUrl.searchParams.set('org', orgParam)
    return redirectTo(loginUrl)
  }

  if (!data.user) {
    const loginUrl = new URL('/auth/login', origin)
    loginUrl.searchParams.set('error', 'Login failed')
    if (orgParam) loginUrl.searchParams.set('org', orgParam)
    return redirectTo(loginUrl)
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('profile_type, approval_status, organization_id, source')
    .eq('user_id', data.user.id)
    .single()

  if (profileError || !profile) {
    const loginUrl = new URL('/auth/login', origin)
    loginUrl.searchParams.set('error', 'Could not fetch user profile')
    if (orgParam) loginUrl.searchParams.set('org', orgParam)
    return redirectTo(loginUrl)
  }

  if (profile.approval_status === 'pending') {
    return redirectTo(new URL('/auth/pending-approval', origin))
  }
  if (profile.approval_status === 'rejected') {
    return redirectTo(new URL('/auth/access-denied', origin))
  }

  const safeRedirect = isSafeRedirect(redirectToParam) ? redirectToParam : null

  switch (profile.profile_type) {
    case 'platform_owner':
      return redirectTo(new URL('/platform-owner', origin))
    case 'school_superadmin':
      return redirectTo(new URL('/school-admin', origin))
    case 'teacher':
      return redirectTo(new URL(safeRedirect || '/teacher', origin))
    case 'student':
      return redirectTo(new URL('/auth/access-denied', origin))
    default:
      return redirectTo(new URL(safeRedirect || '/', origin))
  }
}
