import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

/** True if the error indicates Supabase returned HTML (e.g. 520/521 from Cloudflare) or auth client got non-JSON and threw (e.g. TypeError on session string). */
function isSupabaseDownError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return (
    msg.includes('<!DOCTYPE') ||
    msg.includes('<html') ||
    msg.includes("Unexpected token '<'") ||
    msg.includes('is not valid JSON') ||
    msg.includes("Cannot create property 'user' on string")
  )
}

/** True if the error just means no session (e.g. unauthenticated visitor). Not logged as an error. */
function isNoSessionError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return (
    msg.includes('Auth session missing') ||
    msg.includes('Session not found') ||
    msg.includes('session_missing') ||
    msg === 'Auth session missing!'
  )
}

/** Log auth/store errors briefly; avoid dumping HTML or huge messages when Supabase is down. Skips logging for expected "no session" cases. */
function logAuthError(context: string, error: unknown): void {
  if (isNoSessionError(error)) return
  if (isSupabaseDownError(error)) {
    console.error(`[Auth] ${context}: Supabase returned non-JSON (service may be down).`)
    return
  }
  const msg = error instanceof Error ? error.message : String(error)
  console.error(`[Auth] ${context}:`, msg)
}

/**
 * Creates a Supabase client for server-side usage (Server Components, Route Handlers)
 * This client manages cookies for session handling
 */
export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        try {
          cookieStore.set(name, value, options)
        } catch {
          // Server Component - can be ignored
        }
      },
      remove(name: string, _options: Record<string, unknown>) {
        try {
          cookieStore.delete(name)
        } catch {
          // Server Component - can be ignored
        }
      },
    },
  })
}

/**
 * Get the current user from server-side
 */
export async function getUser() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      logAuthError('Error getting user', error)
      return null
    }

    return user
  } catch (err) {
    if (isSupabaseDownError(err)) {
      logAuthError('Error getting user', err)
      return null
    }
    throw err
  }
}

/**
 * Get the current session from server-side
 */
export async function getSession() {
  try {
    const supabase = await createClient()
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      logAuthError('Error getting session', error)
      return null
    }

    return session
  } catch (err) {
    if (isSupabaseDownError(err)) {
      logAuthError('Error getting session', err)
      return null
    }
    throw err
  }
}

/**
 * Verify the JWT token and get user
 * Useful for API routes and server actions
 */
export async function verifyAuth() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      logAuthError('Error in verifyAuth', error)
      return { user: null, error: error }
    }
    if (!user) {
      return { user: null, error: new Error('No user found') }
    }

    return { user, error: null }
  } catch (err) {
    if (isSupabaseDownError(err)) {
      logAuthError('Error in verifyAuth', err)
      return { user: null, error: err instanceof Error ? err : new Error(String(err)) }
    }
    throw err
  }
}

/** Profile fields needed for nav/redirects and layout (e.g. API integration flag); use getUserProfile() when full row is needed */
const PROFILE_FIELDS_NAV = 'id, full_name, email, avatar_url, profile_type, organization_id, source, metadata'

/**
 * Get session and profile in one client + one auth call + one profile query.
 * Wrapped in React cache() so multiple calls in the same request (e.g. layout + page) are deduplicated.
 */
export const getSessionWithProfile = cache(async function getSessionWithProfile() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      logAuthError('Error getting user (sessionWithProfile)', userError)
      return null
    }
    if (!user) return null

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(PROFILE_FIELDS_NAV)
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      logAuthError('Error getting profile', profileError)
      return { user, profile: null }
    }

    return { user, profile }
  } catch (err) {
    if (isSupabaseDownError(err)) {
      logAuthError('Error in getSessionWithProfile', err)
      return null
    }
    throw err
  }
})

/**
 * Get user profile from the profiles table
 */
export async function getUserProfile() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      logAuthError('Error getting user (getUserProfile)', userError)
      return null
    }
    if (!user) return null

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      logAuthError('Error getting profile', error)
      return null
    }

    return profile
  } catch (err) {
    if (isSupabaseDownError(err)) {
      logAuthError('Error in getUserProfile', err)
      return null
    }
    throw err
  }
}

/**
 * Get user profile with organization details
 */
export async function getUserProfileWithOrganization() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      logAuthError('Error getting user (getUserProfileWithOrganization)', userError)
      return null
    }
    if (!user) return null

    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
      *,
      organization:organizations(
        id,
        name,
        type,
        subscription_plan,
        status
      )
    `)
      .eq('user_id', user.id)
      .single()

    if (error) {
      logAuthError('Error getting profile with organization', error)
      return null
    }

    return profile
  } catch (err) {
    if (isSupabaseDownError(err)) {
      logAuthError('Error in getUserProfileWithOrganization', err)
      return null
    }
    throw err
  }
}
