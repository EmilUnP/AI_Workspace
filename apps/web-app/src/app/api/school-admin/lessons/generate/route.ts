import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'

const getBackendBase = () => process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'

export async function POST(request: NextRequest) {
  const accessToken = (await cookies()).get('access_token')?.value
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const response = await fetch(`${getBackendBase()}/v1/ai/lessons/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...webAppBackendAuthHeaders(accessToken),
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })

    const text = await response.text()
    let data: unknown = {}
    if (text.trim().length > 0) {
      try {
        data = JSON.parse(text) as unknown
      } catch {
        data = { error: text }
      }
    }

    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json(
      { error: 'Backend unavailable. Start backend and try again.' },
      { status: 502 }
    )
  }
}
