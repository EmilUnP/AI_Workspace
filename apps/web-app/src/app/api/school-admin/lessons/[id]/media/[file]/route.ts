import { NextResponse } from 'next/server'
import { getApiUrl } from '@/lib/portal-urls'
import { cookies } from 'next/headers'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'

const getAccessTokenFromRequest = (request: Request): string | null => {
  const cookieHeader = request.headers.get('cookie') || ''
  const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/)
  if (!match?.[1]) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

const getContentType = (fileName: string): string => {
  const ext = path.extname(fileName).toLowerCase()
  if (ext === '.wav') return 'audio/wav'
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.svg') return 'image/svg+xml'
  return 'application/octet-stream'
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; file: string }> }
) {
  const { id, file } = await context.params
  const safeFile = path.basename(file)
  const localMediaPath = path.resolve(process.cwd(), '..', 'backend', 'storage', 'lessons', id, safeFile)
  const backendBase = getApiUrl()

  const cookieToken = (await cookies()).get('access_token')?.value ?? null
  const headerToken =
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
  const token = cookieToken || getAccessTokenFromRequest(request) || headerToken

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Validate ownership/access first.
  const lessonAccessResponse = await fetch(`${backendBase}/v1/lessons/${encodeURIComponent(id)}`, {
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store',
  })
  if (!lessonAccessResponse.ok) {
    return NextResponse.json(
      { error: lessonAccessResponse.status === 404 ? 'Lesson not found' : 'Unauthorized' },
      { status: lessonAccessResponse.status }
    )
  }

  // In local development, prefer direct local file serving first.
  // This avoids auth/proxy edge-cases and keeps media rendering consistent.
  if (process.env.NODE_ENV !== 'production') {
    try {
      const bytes = await readFile(localMediaPath)
      return new NextResponse(bytes, {
        status: 200,
        headers: { 'Content-Type': getContentType(safeFile) },
      })
    } catch {
      // Fall through to backend proxy (e.g. if file does not exist locally).
    }
  }

  const backendUrl = `${backendBase}/v1/lessons/${encodeURIComponent(id)}/media/${encodeURIComponent(file)}`

  const upstream = await fetch(backendUrl, {
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store',
  })

  if (!upstream.ok) {
    if (process.env.NODE_ENV !== 'production') {
      try {
        const bytes = await readFile(localMediaPath)
        return new NextResponse(bytes, {
          status: 200,
          headers: { 'Content-Type': getContentType(safeFile) },
        })
      } catch {
        // continue to upstream error response
      }
    }
    const payload = await upstream.text().catch(() => '')
    return NextResponse.json({ error: payload || 'Unable to fetch lesson media' }, { status: upstream.status || 500 })
  }

  const bytes = await upstream.arrayBuffer()
  const headers = new Headers()
  headers.set('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream')
  headers.set('Content-Length', String(bytes.byteLength))
  const cacheControl = upstream.headers.get('cache-control')
  if (cacheControl) headers.set('Cache-Control', cacheControl)
  const contentDisposition = upstream.headers.get('content-disposition')
  if (contentDisposition) headers.set('Content-Disposition', contentDisposition)

  return new NextResponse(bytes, {
    status: upstream.status,
    headers,
  })
}
