'use server'

import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'

export async function getOrganizationStructure() {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', structure: [] }
  void createAdminClient
  return { structure: [], error: null }
}
