import { NextRequest, NextResponse } from 'next/server'
import { getApiUrl } from '@/lib/portal-urls'
import { cookies } from 'next/headers'
import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'

export async function POST(request: NextRequest) {
  try {
    const token = (await cookies()).get('access_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const backendBase = getApiUrl()
    const response = await fetch(`${backendBase}/v1/ai/education-plans/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...webAppBackendAuthHeaders(token),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    const text = await response.text()
    let payload: unknown = {}
    if (text.trim()) {
      try {
        payload = JSON.parse(text) as unknown
      } catch {
        payload = { error: text }
      }
    }

    return NextResponse.json(payload, { status: response.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate plan'
    console.error('[education-plans/generate]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
