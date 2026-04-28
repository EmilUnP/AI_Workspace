/**
 * Shared API route helpers
 * Works for both web application surfaces
 */

import { NextResponse } from 'next/server'
import { createClient } from '@eduator/auth/supabase/server'

// Demo organization ID for web users
export const DEMO_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001'

/**
 * Require auth helper for course API routes
 * Returns teacher context with organization ID
 */
export async function requireCourseAuth() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      user: null,
      profile: null,
      organizationId: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, organization_id, profile_type')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    return {
      user: null,
      profile: null,
      organizationId: null,
      error: NextResponse.json({ error: 'Profile not found' }, { status: 401 }),
    }
  }

  if (profile.profile_type !== 'teacher' && profile.profile_type !== 'school_superadmin') {
    return {
      user: null,
      profile: null,
      organizationId: null,
      error: NextResponse.json({ error: 'Only teachers can access courses' }, { status: 403 }),
    }
  }

  // Use demo org if no org is assigned
  const organizationId = profile.organization_id || DEMO_ORGANIZATION_ID

  // Verify organization exists
  if (!profile.organization_id && !organizationId) {
    return {
      user: null,
      profile: null,
      organizationId: null,
      error: NextResponse.json({ error: 'Organization not found' }, { status: 403 }),
    }
  }

  return {
    user,
    profile,
    organizationId,
    error: null,
  }
}
