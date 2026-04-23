'use server'

import { createClient } from '@supabase/supabase-js'
import { tokenRepository } from '@eduator/db/repositories/tokens'

// Use admin client to create users without affecting current session
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase admin credentials')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function createSchoolAdmin(
  organizationId: string,
  data: {
    fullName: string
    email: string
    password: string
  }
) {
  try {
    const supabase = getAdminClient()
    
    // Create the user using admin API (won't affect current session)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: data.fullName,
      },
    })

    if (authError) {
      return { error: authError.message }
    }

    if (!authData.user) {
      return { error: 'Failed to create user' }
    }

    // Update the profile with organization and role
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: data.fullName,
        organization_id: organizationId,
        profile_type: 'school_superadmin',
        approval_status: 'approved',
      })
      .eq('user_id', authData.user.id)

    if (profileError) {
      // Profile might not exist yet, try upsert
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          user_id: authData.user.id,
          email: data.email,
          full_name: data.fullName,
          organization_id: organizationId,
          profile_type: 'school_superadmin',
          approval_status: 'approved',
        })

      if (upsertError) {
        return { error: 'User created but failed to set up profile: ' + upsertError.message }
      }
    }

    // Grant initial tokens for new user (if platform setting > 0)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authData.user.id)
      .single()
    if (profile?.id) {
      await tokenRepository.grantInitialTokensForNewUser(profile.id)
    }

    return { success: true, userId: authData.user.id }
  } catch (err) {
    console.error('Error creating school admin:', err)
    return { error: 'An unexpected error occurred' }
  }
}
