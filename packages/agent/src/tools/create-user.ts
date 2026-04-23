import type { ActionToolResult, UserContext } from '../types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { adminCreateUser, adminUpdateProfile } from '@eduator/auth/supabase/admin'
import { tokenRepository } from '@eduator/db/repositories/tokens'
import { SecurityGuards } from '../security/guards'
import { InputValidator } from '../security/validator'

export interface CreateUserParams {
  email: string
  password: string
  fullName: string
  profileType: 'teacher' | 'student' | 'school_superadmin'
  organizationId?: string
}

/**
 * Creates a new user with profile
 */
export async function createUser(
  params: CreateUserParams,
  context: UserContext,
  client: SupabaseClient
): Promise<ActionToolResult> {
  // Validate permissions
  const permissionCheck = SecurityGuards.canCreateEntity(context, 'user')
  if (!permissionCheck.allowed) {
    return {
      success: false,
      error: permissionCheck.reason,
    }
  }

  // Validate inputs
  if (!InputValidator.isValidEmail(params.email)) {
    return {
      success: false,
      error: 'Invalid email format',
    }
  }

  const passwordCheck = InputValidator.isValidPassword(params.password)
  if (!passwordCheck.valid) {
    return {
      success: false,
      error: passwordCheck.reason,
    }
  }

  if (!InputValidator.isValidProfileType(params.profileType)) {
    return {
      success: false,
      error: `Invalid profile type: ${params.profileType}`,
    }
  }

  // Determine organization ID
  const organizationId =
    params.organizationId || context.organizationId || null

  // Validate organization access
  if (organizationId && !SecurityGuards.canPerformAction(context, 'create_user', organizationId).allowed) {
    return {
      success: false,
      error: 'Cannot create user in this organization',
    }
  }

  // Check if email already exists
  try {
    const { data: existingUsers } = await client.auth.admin.listUsers()
    const emailExists = existingUsers?.users?.some(
      (u) => u.email === params.email
    )

    if (emailExists) {
      return {
        success: false,
        error: 'A user with this email already exists',
      }
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to check existing users',
    }
  }

  try {
    // Create auth user
    const { data: authData, error: authError } = await adminCreateUser(
      params.email,
      params.password,
      {
        full_name: params.fullName,
        profile_type: params.profileType,
      },
      true // email confirmed
    )

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message || 'Failed to create user',
      }
    }

    // Wait a moment for the database trigger to create the profile
    await new Promise((resolve) => setTimeout(resolve, 500))

  // Update profile with organization and approval status
  // Wait a moment for the database trigger to create the profile
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Find the profile created by the trigger
  const { data: existingProfile } = await client
    .from('profiles')
    .select('id')
    .eq('user_id', authData.user.id)
    .single()

  let profileError = null
  if (existingProfile) {
    const { error } = await adminUpdateProfile(
      existingProfile.id,
      {
        full_name: params.fullName,
        profile_type: params.profileType,
        organization_id: organizationId,
        email: params.email,
        approval_status: 'approved',
      }
    )
    profileError = error
  } else {
    profileError = new Error('Profile not found after user creation')
  }

    if (profileError) {
      // Profile might not exist, try creating it
      const { error: createError } = await client
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          full_name: params.fullName,
          profile_type: params.profileType,
          organization_id: organizationId,
          email: params.email,
          approval_status: 'approved',
        })

      if (createError) {
        // Clean up auth user
        try {
          await client.auth.admin.deleteUser(authData.user.id)
        } catch (cleanupError) {
          console.error('Failed to clean up auth user:', cleanupError)
        }

        return {
          success: false,
          error: `User created but profile setup failed: ${createError.message}`,
        }
      }
    }

    // Grant initial tokens for new user (if platform setting > 0)
    const { data: profileForTokens } = await client
      .from('profiles')
      .select('id')
      .eq('user_id', authData.user.id)
      .single()
    if (profileForTokens?.id) {
      await tokenRepository.grantInitialTokensForNewUser(profileForTokens.id)
    }

    return {
      success: true,
      data: {
        userId: authData.user.id,
        email: params.email,
        profileType: params.profileType,
        organizationId,
      },
      metadata: {
        tool: 'create_user',
        timestamp: new Date().toISOString(),
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user',
    }
  }
}
