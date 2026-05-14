import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/backend-auth'
import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const token = await getAccessToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'
  const backendUrl = `${backendBase}/v1/documents/${id}/file`

  const upstream = await fetch(backendUrl, {
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store',
  })

  if (!upstream.ok || !upstream.body) {
    const payload = await upstream.text().catch(() => '')
    return NextResponse.json(
      { error: payload || 'Unable to fetch file' },
      { status: upstream.status || 500 }
    )
  }

  const headers = new Headers()
  headers.set(
    'Content-Type',
    upstream.headers.get('content-type') || 'application/octet-stream'
  )

  const originalDisposition =
    upstream.headers.get('content-disposition') || 'inline; filename="document"'
  const forceDownload = request.nextUrl.searchParams.get('download') === '1'
  headers.set(
    'Content-Disposition',
    forceDownload
      ? originalDisposition.replace(/^inline/i, 'attachment')
      : originalDisposition
  )

  return new NextResponse(upstream.body, {
    status: 200,
    headers,
  })
}
