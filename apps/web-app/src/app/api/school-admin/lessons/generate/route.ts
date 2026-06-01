import { NextRequest, NextResponse } from 'next/server'
import { getApiUrl } from '@/lib/portal-urls'
import { cookies } from 'next/headers'
import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'

/** Lesson + RAG can exceed default 60s gateway limits; allow long upstream wait on the Next server. */
export const maxDuration = 300
export const dynamic = 'force-dynamic'

const getBackendBase = () => getApiUrl()

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
    const response = await fetch(`${getApiUrl()}/v1/ai/lessons/generate`, {
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
