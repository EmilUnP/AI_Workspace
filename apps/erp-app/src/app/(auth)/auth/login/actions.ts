'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export type LoginState = { error: string } | null

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

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

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  if (!data.user) {
    return { error: 'Login failed' }
  }

  // Get profile to determine redirect
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('profile_type, approval_status, organization_id, source')
    .eq('user_id', data.user.id)
    .single()

  if (profileError || !profile) {
    return { error: 'Could not fetch user profile' }
  }

  // Check approval status
  if (profile.approval_status === 'pending') {
    redirect('/auth/pending-approval')
  }

  if (profile.approval_status === 'rejected') {
    redirect('/auth/access-denied')
  }

  // Redirect based on role
  switch (profile.profile_type) {
    case 'platform_owner':
      redirect('/platform-owner')
      break
    case 'school_superadmin':
      redirect('/school-admin')
      break
    case 'teacher':
      redirect('/school-admin')
      break
    case 'student':
      redirect('/auth/access-denied')
      break
    default:
      redirect('/')
  }
  return null
}
