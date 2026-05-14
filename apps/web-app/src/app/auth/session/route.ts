import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get('access_token')?.value
  if (!accessToken) {
    return NextResponse.json({ success: false, error: 'No session cookie' }, { status: 401 })
  }

  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'
  const meResponse = await fetch(`${backendBase}/v1/auth/me`, {
    method: 'GET',
    headers: webAppBackendAuthHeaders(accessToken),
    cache: 'no-store',
  })

  if (!meResponse.ok) {
    return NextResponse.json({ success: false, error: 'Session invalid' }, { status: 401 })
  }

  const payload = (await meResponse.json()) as { user?: { id?: string } }
  return NextResponse.json({ success: true, user_id: payload.user?.id ?? null })
}
