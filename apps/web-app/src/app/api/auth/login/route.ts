import { NextResponse } from 'next/server'
import { getApiUrl } from '@/lib/portal-urls'
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
    const explicitOrigin = process.env.NEXT_PUBLIC_ERP_URL
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

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const email = (formData.get('email') as string) || ''
  const password = (formData.get('password') as string) || ''
  const origin = getRequestOrigin(request)
  const backendBase = getApiUrl()

  if (!email || !password) {
    const loginUrl = new URL('/auth/login', origin)
    loginUrl.searchParams.set('error', 'Email and password are required')
    return redirectTo(loginUrl)
  }

  let response: Response
  try {
    response = await fetch(`${backendBase}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    })
  } catch {
    const loginUrl = new URL('/auth/login', origin)
    loginUrl.searchParams.set(
      'error',
      `Backend unavailable at ${backendBase}. Start backend (npm run dev in apps/backend) and try again.`
    )
    return redirectTo(loginUrl)
  }

  if (!response.ok) {
    let errorMessage = 'Login failed'
    try {
      const body = (await response.json()) as { error?: string }
      if (body?.error) errorMessage = body.error
    } catch {
      // ignore parse issue
    }
    if (response.status >= 500) {
      errorMessage = `${errorMessage} (API ${backendBase} returned ${response.status})`
    }
    const loginUrl = new URL('/auth/login', origin)
    loginUrl.searchParams.set('error', errorMessage)
    return redirectTo(loginUrl)
  }

  const data = (await response.json()) as {
    user?: { id: string; email: string; role: string }
    tokens?: { accessToken: string; refreshToken: string; tokenType: string }
  }

  if (!data.user || !data.tokens?.accessToken || !data.tokens.refreshToken) {
    const loginUrl = new URL('/auth/login', origin)
    loginUrl.searchParams.set('error', 'Login failed')
    return redirectTo(loginUrl)
  }

  const destinationPath = data.user.role === 'admin' ? '/platform-owner' : '/app'
  const destinationUrl = new URL(destinationPath, origin)
  const redirectResponse = redirectTo(destinationUrl)
  const secure = request.nextUrl.protocol === 'https:'
  redirectResponse.cookies.set('access_token', data.tokens.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 60 * 15,
  })
  redirectResponse.cookies.set('refresh_token', data.tokens.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return redirectResponse
}
