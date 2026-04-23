import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

let adminClient: SupabaseClient | null = null

/**
 * Creates a Supabase admin client with service role key
 * This client bypasses Row Level Security (RLS)
 * ONLY use on server-side (API routes, server actions)
 */
export function createAdminClient(): SupabaseClient {
  if (adminClient) return adminClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase admin environment variables')
  }

  adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return adminClient
}

/**
 * Create a new user with admin privileges
 */
export async function adminCreateUser(
  email: string,
  password: string,
  metadata?: Record<string, unknown>,
  emailConfirm = true
) {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: emailConfirm,
    user_metadata: metadata,
  })

  return { data, error }
}

/**
 * Delete a user with admin privileges
 */
export async function adminDeleteUser(userId: string) {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase.auth.admin.deleteUser(userId)

  return { data, error }
}

/**
 * Update user with admin privileges
 */
export async function adminUpdateUser(
  userId: string,
  updates: {
    email?: string
    password?: string
    user_metadata?: Record<string, unknown>
    app_metadata?: Record<string, unknown>
    email_confirm?: boolean
    phone_confirm?: boolean
    ban_duration?: string
  }
) {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase.auth.admin.updateUserById(userId, updates)

  return { data, error }
}

/**
 * Get user by ID with admin privileges
 */
export async function adminGetUserById(userId: string) {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase.auth.admin.getUserById(userId)

  return { data, error }
}

/**
 * List all users with admin privileges
 */
export async function adminListUsers(
  page = 1,
  perPage = 50
) {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase.auth.admin.listUsers({
    page,
    perPage,
  })

  return { data, error }
}

/**
 * Generate invite link for a user
 */
export async function adminGenerateInviteLink(
  email: string,
  redirectTo?: string
) {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      redirectTo,
    },
  })

  return { data, error }
}

/**
 * Ban a user
 */
export async function adminBanUser(userId: string, duration?: string) {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: duration || '876000h', // ~100 years (permanent)
  })

  return { data, error }
}

/**
 * Unban a user
 */
export async function adminUnbanUser(userId: string) {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  })

  return { data, error }
}

/**
 * Create profile for a user (bypasses RLS)
 */
export async function adminCreateProfile(profile: {
  user_id: string
  profile_type: string
  organization_id?: string | null
  full_name: string
  email: string
  approval_status?: string
}) {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      ...profile,
      approval_status: profile.approval_status || 'pending',
      is_active: true,
    })
    .select()
    .single()

  return { data, error }
}

/**
 * Update profile with admin privileges (bypasses RLS)
 */
export async function adminUpdateProfile(
  profileId: string,
  updates: Record<string, unknown>
) {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId)
    .select()
    .single()

  return { data, error }
}

/**
 * Get all profiles for an organization (bypasses RLS)
 */
export async function adminGetOrganizationProfiles(organizationId: string) {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  return { data, error }
}
