'use server'

import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'

export async function getOrganizationStructure() {
  const supabase = await createServerClient()
  
  // Get current user's organization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', structure: [] }
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()
  
  if (!profile?.organization_id) {
    return { error: 'No organization found', structure: [] }
  }
  
  // Get organization settings
  const adminClient = createAdminClient()
  const { data: org } = await adminClient
    .from('organizations')
    .select('settings')
    .eq('id', profile.organization_id)
    .single()
  
  if (!org) {
    return { error: 'Organization not found', structure: [] }
  }
  
  const structure = org.settings?.structure || []
  
  return { structure, error: null }
}
