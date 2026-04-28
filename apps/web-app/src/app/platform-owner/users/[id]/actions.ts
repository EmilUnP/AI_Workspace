'use server'

import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { tokenRepository } from '@eduator/db/repositories/tokens'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const allowedRoles = new Set(['platform_owner', 'school_superadmin', 'teacher'])
const allowedApprovalStatuses = new Set(['pending', 'approved', 'rejected'])

const createSchoolAdminSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().trim().email('Enter a valid email address').transform((value) => value.toLowerCase()),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

async function requirePlatformOwner() {
  const supabase = await createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized' as const }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('profile_type')
    .eq('user_id', user.id)
    .single()

  if (profileError || profile?.profile_type !== 'platform_owner') {
    return { error: 'Only Platform Owners can perform this action' as const }
  }

  return { supabase }
}

export async function updateUser(formData: FormData) {
  const auth = await requirePlatformOwner()
  if ('error' in auth) {
    return { error: auth.error }
  }

  const { supabase } = auth
  const id = formData.get('id') as string
  const full_name = (formData.get('full_name') as string)?.trim()
  const profile_type = formData.get('profile_type') as string
  const approval_status = formData.get('approval_status') as string
  const organization_id_input = formData.get('organization_id') as string | null

  if (!allowedRoles.has(profile_type)) {
    return { error: 'Unsupported role for this lightweight version' }
  }
  if (!allowedApprovalStatuses.has(approval_status)) {
    return { error: 'Unsupported approval status' }
  }

  const organization_id = organization_id_input && organization_id_input !== 'none' ? organization_id_input : null

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name,
      profile_type,
      approval_status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating user:', error)
    return { error: error.message }
  }

  revalidatePath('/platform-owner/users')
  revalidatePath(`/platform-owner/users/${id}`)
  
  return { success: true }
}

export async function deleteUser(profileId: string) {
  const auth = await requirePlatformOwner()
  if ('error' in auth) {
    return { error: auth.error }
  }

  const { supabase } = auth
  
  // First get the user_id (auth id) from the profile
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('id', profileId)
    .single()

  if (fetchError) {
    console.error('Error fetching profile:', fetchError)
    return { error: fetchError.message }
  }

  // Delete the profile
  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', profileId)

  if (profileError) {
    console.error('Error deleting profile:', profileError)
    return { error: profileError.message }
  }

  // Try to delete the auth user using admin client
  if (profile?.user_id) {
    try {
      const adminClient = createAdminClient()
      const { error: authError } = await adminClient.auth.admin.deleteUser(profile.user_id)
      
      if (authError) {
        console.error('Error deleting auth user:', authError)
        // Profile is already deleted, so we continue
      }
    } catch (e) {
      console.error('Could not delete auth user:', e)
      // Profile is already deleted, so we continue
    }
  }

  revalidatePath('/platform-owner/users')
  redirect('/platform-owner/users')
}

export async function approveUser(userId: string) {
  const auth = await requirePlatformOwner()
  if ('error' in auth) {
    return { error: auth.error }
  }

  const { supabase } = auth
  
  const { error } = await supabase
    .from('profiles')
    .update({ 
      approval_status: 'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    console.error('Error approving user:', error)
    return { error: error.message }
  }

  revalidatePath('/platform-owner/users')
  revalidatePath(`/platform-owner/users/${userId}`)
  
  return { success: true }
}

export async function rejectUser(userId: string) {
  const auth = await requirePlatformOwner()
  if ('error' in auth) {
    return { error: auth.error }
  }

  const { supabase } = auth
  
  const { error } = await supabase
    .from('profiles')
    .update({ 
      approval_status: 'rejected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    console.error('Error rejecting user:', error)
    return { error: error.message }
  }

  revalidatePath('/platform-owner/users')
  revalidatePath(`/platform-owner/users/${userId}`)
  
  return { success: true }
}

export async function createSchoolAdmin(formData: FormData) {
  const auth = await requirePlatformOwner()
  if ('error' in auth) {
    return { error: auth.error }
  }

  const parsed = createSchoolAdminSchema.safeParse({
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { supabase } = auth
  const adminClient = createAdminClient()
  const { full_name, email, password } = parsed.data

  const { data: existingProfile, error: existingError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingError) {
    console.error('Error checking existing profile:', existingError)
    return { error: 'Could not verify user email uniqueness' }
  }
  if (existingProfile) {
    return { error: 'A user with this email already exists' }
  }

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name,
    },
  })

  if (authError) {
    return { error: authError.message }
  }
  if (!authData.user) {
    return { error: 'Failed to create user' }
  }

  const profilePayload = {
    user_id: authData.user.id,
    email,
    full_name,
    profile_type: 'school_superadmin',
    approval_status: 'approved',
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'user_id' })

  if (profileError) {
    console.error('Error setting up profile:', profileError)
    return { error: 'User created but failed to set up profile' }
  }

  const { data: createdProfile } = await adminClient
    .from('profiles')
    .select('id')
    .eq('user_id', authData.user.id)
    .single()

  if (createdProfile?.id) {
    await tokenRepository.grantInitialTokensForNewUser(createdProfile.id)
  }

  revalidatePath('/platform-owner/users')

  return { success: true }
}
