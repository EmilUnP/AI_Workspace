import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, _options: Record<string, unknown>) {
          cookieStore.set(name, value, _options)
        },
        remove(name: string, _options: Record<string, unknown>) {
          cookieStore.delete(name)
        },
      },
    }
  )

  // Get the session from the request body (allow body to be a JSON string from some clients)
  let body: { access_token?: string; refresh_token?: string }
  try {
    const raw = await request.json()
    body = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  const { access_token, refresh_token } = body

  if (access_token && refresh_token) {
    try {
      await supabase.auth.setSession({
        access_token,
        refresh_token,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('is not valid JSON') || msg.includes("Unexpected token '<'")) {
        return NextResponse.json(
          { success: false, error: 'Auth service temporarily unavailable. Please try again.' },
          { status: 503 }
        )
      }
      throw err
    }
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      return NextResponse.json({ success: true, user_id: user.id })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('is not valid JSON') || msg.includes("Unexpected token '<'")) {
      return NextResponse.json(
        { success: false, error: 'Auth service temporarily unavailable. Please try again.' },
        { status: 503 }
      )
    }
    throw err
  }

  return NextResponse.json({ success: false, error: 'Failed to set session' }, { status: 400 })
}
