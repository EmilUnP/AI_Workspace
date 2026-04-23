'use server'

import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateUser(formData: FormData) {
  const supabase = await createServerClient()
  
  const id = formData.get('id') as string
  const full_name = formData.get('full_name') as string
  const profile_type = formData.get('profile_type') as string
  const approval_status = formData.get('approval_status') as string
  const organization_id = formData.get('organization_id') as string | null

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('profile_type')
    .eq('id', id)
    .single()

  const allowedRoles = new Set(['platform_owner', 'school_superadmin', 'teacher'])
  const isLegacyStudent = existingProfile?.profile_type === 'student'
  if (!allowedRoles.has(profile_type) && !(isLegacyStudent && profile_type === 'student')) {
    return { error: 'Unsupported role for this lightweight version' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name,
      profile_type,
      approval_status,
      organization_id: organization_id && organization_id !== 'none' ? organization_id : null,
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
  const supabase = await createServerClient()
  
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
  const supabase = await createServerClient()
  
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
  const supabase = await createServerClient()
  
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
