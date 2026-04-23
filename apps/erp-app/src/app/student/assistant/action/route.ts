import { NextResponse } from 'next/server'
import { sendAssistantMessage } from '../actions'

/** Parse JSON body without throwing "Error in input stream" on empty/invalid body. */
async function parseJsonBody(request: Request): Promise<{ message: string; contextSummary: string } | null> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return null
  try {
    const raw = await request.text()
    if (!raw.trim()) return null
    const body = JSON.parse(raw) as unknown
    if (body === null || typeof body !== 'object') return null
    const message = typeof (body as Record<string, unknown>).message === 'string'
      ? ((body as Record<string, unknown>).message as string).trim()
      : ''
    const contextSummary = typeof (body as Record<string, unknown>).contextSummary === 'string'
      ? ((body as Record<string, unknown>).contextSummary as string)
      : ''
    return { message, contextSummary }
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request)
    if (!body) {
      return NextResponse.json(
        { error: { message: 'Invalid or missing JSON body' } },
        { status: 400 }
      )
    }
    const { message, contextSummary } = body
    if (!message) {
      return NextResponse.json(
        { error: { message: 'Message is required' } },
        { status: 400 }
      )
    }

    const text = await sendAssistantMessage(message, contextSummary)
    return NextResponse.json({ text })
  } catch (error) {
    console.error('Assistant action error:', error)
    return NextResponse.json(
      { error: { message: (error as Error).message || 'Failed to get response' } },
      { status: 500 }
    )
  }
}
