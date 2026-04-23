'use client'

import { createBrowserClient } from '@supabase/ssr'

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

/**
 * True if the error indicates Supabase returned HTML (e.g. 521/525) instead of JSON.
 * In that case we treat as "no session" rather than throwing.
 */
function isSupabaseDownError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return (
    msg.includes("Unexpected token '<'") ||
    msg.includes('is not valid JSON') ||
    msg.includes('<!DOCTYPE') ||
    msg.includes('<html')
  )
}

/**
 * Creates a Supabase client for browser/client-side usage
 * This client is suitable for client components in Next.js
 */
export function createClient(): ReturnType<typeof createBrowserClient> {
  if (supabaseClient) return supabaseClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey)

  return supabaseClient
}

/**
 * Get the current user from client-side
 */
export async function getUser() {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      if (!isSupabaseDownError(error)) console.error('Error getting user:', error.message)
      return null
    }

    return user
  } catch (err) {
    if (isSupabaseDownError(err)) return null
    throw err
  }
}

/**
 * Get the current session from client-side
 */
export async function getSession() {
  try {
    const supabase = createClient()
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      if (!isSupabaseDownError(error)) console.error('Error getting session:', error.message)
      return null
    }

    return session
  } catch (err) {
    if (isSupabaseDownError(err)) return null
    throw err
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithPassword(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  return { data, error }
}

/**
 * Sign up with email and password
 */
export async function signUp(
  email: string,
  password: string,
  metadata?: Record<string, unknown>
) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  })

  return { data, error }
}

/**
 * Sign out
 */
export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  return { error }
}

/**
 * Sign in with OAuth provider
 */
export async function signInWithOAuth(
  provider: 'google' | 'github' | 'azure',
  redirectTo?: string
) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
    },
  })

  return { data, error }
}

/**
 * Reset password
 */
export async function resetPassword(email: string, redirectTo?: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || `${window.location.origin}/auth/reset-password`,
  })

  return { data, error }
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  return { data, error }
}

/**
 * Update user metadata
 */
export async function updateUserMetadata(metadata: Record<string, unknown>) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.updateUser({
    data: metadata,
  })

  return { data, error }
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: unknown) => void
) {
  const supabase = createClient()
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback)

  return subscription
}
