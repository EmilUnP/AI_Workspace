import type { ActionToolResult, UserContext } from '../types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createUser } from './create-user'

export interface CreateTeacherParams {
  email: string
  password: string
  fullName: string
  organizationId?: string
  department?: string
  bio?: string
}

/**
 * Creates a new teacher profile
 */
export async function createTeacher(
  params: CreateTeacherParams,
  context: UserContext,
  client: SupabaseClient
): Promise<ActionToolResult> {
  // Use createUser tool with teacher profile type
  const userResult = await createUser(
    {
      email: params.email,
      password: params.password,
      fullName: params.fullName,
      profileType: 'teacher',
      organizationId: params.organizationId,
    },
    context,
    client
  )

  if (!userResult.success || !userResult.data) {
    return userResult
  }

  const teacherId = (userResult.data as { userId: string }).userId

  // Update teacher profile with additional fields if provided
  if (params.department || params.bio) {
    const { error: updateError } = await client
      .from('profiles')
      .update({
        metadata: {
          ...(params.department && { department: params.department }),
          ...(params.bio && { bio: params.bio }),
        },
      })
      .eq('id', teacherId)

    if (updateError) {
      // Profile created but metadata update failed - non-critical
      return {
        success: true,
        data: {
          ...userResult.data,
          metadataUpdateError: updateError.message,
        },
        metadata: {
          ...userResult.metadata,
          note: 'Teacher created but metadata update failed',
        },
      }
    }
  }

  return {
    success: true,
    data: {
      ...userResult.data,
      ...(params.department && { department: params.department }),
      ...(params.bio && { bio: params.bio }),
    },
    metadata: userResult.metadata,
  }
}
