import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const redirectTo = requestUrl.searchParams.get('redirectTo') || '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            try {
              cookieStore.set(name, value, options)
            } catch {
              // Route handler - can be ignored in some contexts
            }
          },
          remove(name: string, _options: Record<string, unknown>) {
            try {
              cookieStore.delete(name)
            } catch {
              // Route handler - can be ignored in some contexts
            }
          },
        },
      }
    )

    let exchangeError: Error | null = null
    try {
      const result = await supabase.auth.exchangeCodeForSession(code)
      exchangeError = result.error
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("Unexpected token '<'") || msg.includes('is not valid JSON')) {
        return NextResponse.redirect(`${origin}/auth/login?error=service_unavailable`)
      }
      throw err
    }

    if (!exchangeError) {
      // Get user profile to redirect based on role
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('profile_type, approval_status, source')
          .eq('user_id', user.id)
          .single()

        if (profile) {
          // Check approval status
          if (profile.approval_status === 'pending') {
            return NextResponse.redirect(`${origin}/auth/pending-approval`)
          }
          if (profile.approval_status === 'rejected') {
            return NextResponse.redirect(`${origin}/auth/access-denied`)
          }

          if (profile.profile_type === 'platform_owner') {
            return NextResponse.redirect(`${origin}/platform-owner`)
          }
          if (profile.profile_type === 'school_superadmin') {
            return NextResponse.redirect(`${origin}/school-admin`)
          }
          if (profile.profile_type === 'teacher') return NextResponse.redirect(`${origin}/teacher`)
          if (profile.profile_type === 'student') return NextResponse.redirect(`${origin}/auth/access-denied`)
        }
      }

      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_error`)
}
