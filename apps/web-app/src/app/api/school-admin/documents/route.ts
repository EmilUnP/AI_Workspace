import { NextResponse } from 'next/server'
import { getApiUrl } from '@/lib/portal-urls'
import { cookies } from 'next/headers'
import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'

export async function GET() {
  try {
    const token = (await cookies()).get('access_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const backendBase = getApiUrl()
    const response = await fetch(`${backendBase}/v1/documents`, {
      headers: webAppBackendAuthHeaders(token),
      cache: 'no-store',
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      return NextResponse.json({ error: payload.error || 'Failed to fetch documents' }, { status: response.status })
    }

    const payload = (await response.json()) as { items?: Array<Record<string, unknown>> }
    return NextResponse.json({ items: payload.items || [] })
  } catch (error) {
    console.error('Documents API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
