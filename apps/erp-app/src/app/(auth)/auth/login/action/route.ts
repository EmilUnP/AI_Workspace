import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

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
 * Explicit POST handler for login so Vercel accepts the form POST (avoids 405).
 * Form posts to /auth/login/action instead of using server action on /auth/login.
 * GET redirects to login page (avoids 405 when user lands on /auth/login/action via refresh/back).
 */
export function GET(request: NextRequest) {
  return redirectTo(new URL('/auth/login', getRequestOrigin(request)))
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const email = (formData.get('email') as string) || ''
  const password = (formData.get('password') as string) || ''
  const origin = getRequestOrigin(request)

  if (!email || !password) {
    return redirectTo(
      new URL('/auth/login?error=' + encodeURIComponent('Email and password are required'), origin)
    )
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
    return redirectTo(
      new URL('/auth/login?error=' + encodeURIComponent(error.message), origin)
    )
  }

  if (!data.user) {
    return redirectTo(
      new URL('/auth/login?error=' + encodeURIComponent('Login failed'), origin)
    )
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('profile_type, approval_status, organization_id, source')
    .eq('user_id', data.user.id)
    .single()

  if (profileError || !profile) {
    return redirectTo(
      new URL('/auth/login?error=' + encodeURIComponent('Could not fetch user profile'), origin)
    )
  }

  if (profile.approval_status === 'pending') {
    return redirectTo(new URL('/auth/pending-approval', origin))
  }
  if (profile.approval_status === 'rejected') {
    return redirectTo(new URL('/auth/access-denied', origin))
  }

  switch (profile.profile_type) {
    case 'platform_owner':
      return redirectTo(new URL('/platform-owner', origin))
    case 'school_superadmin':
      return redirectTo(new URL('/school-admin', origin))
    case 'teacher':
      return redirectTo(new URL('/teacher', origin))
    case 'student':
      return redirectTo(new URL('/auth/access-denied', origin))
    default:
      return redirectTo(new URL('/', origin))
  }
}
