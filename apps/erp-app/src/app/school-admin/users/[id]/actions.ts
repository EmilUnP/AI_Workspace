'use server'

import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function verifyOrganizationAccess(targetUserId: string) {
  const supabase = await createServerClient()
  
  // Get current user's organization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', organizationId: null }
  }
  
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()
  
  if (!currentProfile?.organization_id) {
    return { error: 'No organization found', organizationId: null }
  }

  // Verify target user is in the same organization
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id, user_id, organization_id')
    .eq('id', targetUserId)
    .eq('organization_id', currentProfile.organization_id)
    .single()

  if (!targetProfile) {
    return { error: 'User not found or not in your organization', organizationId: null }
  }

  return { error: null, organizationId: currentProfile.organization_id, targetProfile }
}

export async function updateUser(formData: FormData) {
  const id = formData.get('id') as string
  const full_name = formData.get('full_name') as string
  const profile_type = formData.get('profile_type') as string
  const approval_status = formData.get('approval_status') as string
  const organization_unit_id = formData.get('organization_unit_id') as string
  const api_integration_enabled = formData.get('api_integration_enabled') === '1'

  // Validate inputs
  if (!id || !full_name || !profile_type || !approval_status) {
    return { error: 'All fields are required' }
  }

  if (!['teacher', 'student'].includes(profile_type)) {
    return { error: 'Invalid role. Must be teacher or student' }
  }

  const { error: accessError, organizationId } = await verifyOrganizationAccess(id)
  if (accessError) {
    return { error: accessError }
  }

  const adminClient = createAdminClient()

  // Get current metadata
  const { data: currentProfile, error: fetchError } = await adminClient
    .from('profiles')
    .select('metadata')
    .eq('id', id)
    .single()

  if (fetchError) {
    console.error('Error fetching current profile:', fetchError)
    return { error: 'Failed to fetch user data' }
  }

  // Prepare metadata with organization unit
  // Handle null metadata from database
  const currentMetadata = currentProfile?.metadata 
    ? (typeof currentProfile.metadata === 'string' 
        ? JSON.parse(currentProfile.metadata) 
        : currentProfile.metadata)
    : {}
  
  const metadata: Record<string, unknown> = { ...currentMetadata }
  
  // Update organization_unit_id
  if (organization_unit_id && organization_unit_id.trim() !== '') {
    metadata.organization_unit_id = organization_unit_id.trim()
  } else {
    delete metadata.organization_unit_id
  }

  // Update api_integration_enabled (teachers only)
  if (profile_type === 'teacher') {
    metadata.api_integration_enabled = api_integration_enabled
  } else {
    delete metadata.api_integration_enabled
  }

  const updateData: Record<string, unknown> = {
    full_name,
    profile_type,
    approval_status,
    updated_at: new Date().toISOString(),
    metadata: metadata, // Always include metadata to ensure it's updated
  }

  // Use admin client to update, including metadata field
  const { error } = await adminClient
    .from('profiles')
    .update(updateData)
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) {
    console.error('Error updating user:', error)
    return { error: error.message }
  }

  revalidatePath('/school-admin/users')
  revalidatePath(`/school-admin/users/${id}`)
  
  return { success: true }
}

export async function changePassword(userId: string, newPassword: string) {
  // Validate password
  if (!newPassword || newPassword.length < 6) {
    return { error: 'Password must be at least 6 characters' }
  }

  // Get the profile to find the auth user_id
  const supabase = await createServerClient()
  
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

  // Verify target user is in the same organization and get their auth user_id
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id, user_id')
    .eq('user_id', userId)
    .eq('organization_id', currentProfile.organization_id)
    .single()

  if (!targetProfile) {
    return { error: 'User not found or not in your organization' }
  }

  // Change password using admin client
  try {
    const adminClient = createAdminClient()
    const { error: passwordError } = await adminClient.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (passwordError) {
      console.error('Error changing password:', passwordError)
      return { error: passwordError.message }
    }

    return { success: true }
  } catch (e) {
    console.error('Error changing password:', e)
    return { error: 'Failed to change password' }
  }
}

export async function deleteUser(userId: string) {
  const { error: accessError, targetProfile } = await verifyOrganizationAccess(userId)
  if (accessError || !targetProfile) {
    return { error: accessError || 'User not found' }
  }

  const supabase = await createServerClient()

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
  redirect('/school-admin/users')
}
