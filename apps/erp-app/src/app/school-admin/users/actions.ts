'use server'

import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { createAdminClient, adminCreateUser } from '@eduator/auth/supabase/admin'
import { tokenRepository } from '@eduator/db/repositories/tokens'
import { revalidatePath } from 'next/cache'

export async function createUser(formData: FormData) {
  const supabase = await createServerClient()
  
  // Get current user's organization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }
  
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()
  
  if (!currentProfile?.organization_id) {
    return { error: 'No organization found' }
  }
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const full_name = formData.get('full_name') as string
  const profile_type = formData.get('profile_type') as string
  const organization_unit_id = formData.get('organization_unit_id') as string

  // Validate inputs
  if (!email || !password || !full_name || !profile_type) {
    return { error: 'All fields are required' }
  }

  if (profile_type !== 'teacher') {
    return { error: 'Only teacher role can be created in this lightweight version' }
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters' }
  }

  // Check if email already exists
  const adminClient = createAdminClient()
  const { data: existingUsers } = await adminClient.auth.admin.listUsers()
  const emailExists = existingUsers?.users?.some(u => u.email === email)
  
  if (emailExists) {
    return { error: 'A user with this email already exists' }
  }

  // Create auth user using admin client
  // The database trigger will automatically create a profile with pending status
  const { data: authData, error: authError } = await adminCreateUser(
    email,
    password,
    { full_name, profile_type },
    true // email confirmed
  )

  if (authError) {
    console.error('Error creating auth user:', authError)
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: 'Failed to create user' }
  }

  // Wait a moment for the trigger to create the profile
  await new Promise(resolve => setTimeout(resolve, 500))

  // Prepare metadata with organization unit if provided
  const metadata: Record<string, unknown> = {}
  if (organization_unit_id) {
    metadata.organization_unit_id = organization_unit_id
  }

  // Update the profile with organization and approved status
  // The trigger already created the profile, we just need to update it
  const { error: updateError } = await adminClient
    .from('profiles')
    .update({
      full_name,
      profile_type,
      organization_id: currentProfile.organization_id,
      approval_status: 'approved', // Auto-approve users created by school admin
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', authData.user.id)

  if (updateError) {
    console.error('Error updating profile:', updateError)
    // Try to clean up the auth user
    try {
      await adminClient.auth.admin.deleteUser(authData.user.id)
    } catch (e) {
      console.error('Failed to clean up auth user:', e)
    }
    return { error: updateError.message }
  }

  // Grant initial tokens for new user (if platform setting > 0)
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id')
    .eq('user_id', authData.user.id)
    .single()
  if (profile?.id) {
    await tokenRepository.grantInitialTokensForNewUser(profile.id)
  }

  revalidatePath('/school-admin/users')
  return { success: true, userId: authData.user.id }
}

export async function updateUserStatus(userId: string, status: 'approved' | 'rejected') {
  const supabase = await createServerClient()
  
  // Get current user's organization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }
  
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()
  
  if (!currentProfile?.organization_id) {
    return { error: 'No organization found' }
  }

  // Only update users in the same organization
  const { error } = await supabase
    .from('profiles')
    .update({ 
      approval_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .eq('organization_id', currentProfile.organization_id)

  if (error) {
    console.error('Error updating user status:', error)
    return { error: error.message }
  }

  revalidatePath('/school-admin/users')
  return { success: true }
}

export async function deleteUser(userId: string) {
  const supabase = await createServerClient()
  
  // Get current user's organization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }
  
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()
  
  if (!currentProfile?.organization_id) {
    return { error: 'No organization found' }
  }

  // Get the user to delete (must be in same organization)
  const { data: targetProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('id', userId)
    .eq('organization_id', currentProfile.organization_id)
    .single()

  if (fetchError || !targetProfile) {
    return { error: 'User not found or not in your organization' }
  }

  // Delete the profile
  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId)

  if (profileError) {
    console.error('Error deleting profile:', profileError)
    return { error: profileError.message }
  }

  // Try to delete the auth user
  if (targetProfile.user_id) {
    try {
      const adminClient = createAdminClient()
      await adminClient.auth.admin.deleteUser(targetProfile.user_id)
    } catch (e) {
      console.error('Could not delete auth user:', e)
    }
  }

  revalidatePath('/school-admin/users')
  return { success: true }
}
