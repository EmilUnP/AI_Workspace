/**
 * Shared utility to get teacher context
 * Works for both web application surfaces
 */

import { createClient } from '@eduator/auth/supabase/server'

// Demo organization ID for web users
const DEMO_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001'

/**
 * Get teacher info and organization ID
 * Handles both real-org and demo-org cases
 */
export async function getTeacherContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated', teacherId: null, organizationId: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id, profile_type')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return { error: 'Profile not found', teacherId: null, organizationId: null }
  }

  // Use demo org if no org assigned
  const organizationId = profile.organization_id || DEMO_ORGANIZATION_ID

  return {
    error: null,
    teacherId: profile.id,
    organizationId,
    userId: user.id,
  }
}
