import { getDbClient } from '../client'
import type { Profile, CreateProfileInput, UpdateProfileInput } from '@eduator/core/types/profile'
import type { ApprovalStatus } from '@eduator/config'

/**
 * Profile Repository - Data access layer for profiles
 */
export const profileRepository = {
  /**
   * Get profile by ID
   */
  async getById(id: string): Promise<Profile | null> {
    const supabase = getDbClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error getting profile by id:', error)
      return null
    }

    return data as Profile
  },

  /**
   * Get profile by user ID
   */
  async getByUserId(userId: string): Promise<Profile | null> {
    const supabase = getDbClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error getting profile by user_id:', error)
      return null
    }

    return data as Profile
  },

  async getByIdWithOrganization(id: string) {
    return this.getById(id)
  },

  /**
   * Get all profiles
   */
  async getAll(options?: {
    page?: number
    perPage?: number
    profileType?: string
    approvalStatus?: ApprovalStatus
    organizationId?: string
  }) {
    const supabase = getDbClient()
    const { page = 1, perPage = 20, profileType, approvalStatus, organizationId } = options || {}

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })

    if (profileType) {
      query = query.eq('profile_type', profileType)
    }

    if (approvalStatus) {
      query = query.eq('approval_status', approvalStatus)
    }

    void organizationId

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1)

    if (error) {
      console.error('Error getting profiles:', error)
      return { data: [], count: 0 }
    }

    return { data: data as Profile[], count: count || 0 }
  },

  /**
   * Get profiles by organization. Optional limit to avoid unbounded queries (e.g. limit: 500).
   */
  async getByOrganization(
    organizationId: string,
    options?: { profileType?: string; approvalStatus?: ApprovalStatus; limit?: number }
  ) {
    const supabase = getDbClient()
    void organizationId

    const profileListColumns = 'id, user_id, profile_type, full_name, email, avatar_url, phone, approval_status, is_active, metadata, registration_info, source, created_at, updated_at'
    let query = supabase
      .from('profiles')
      .select(profileListColumns)
      .neq('id', '')

    if (options?.profileType) {
      query = query.eq('profile_type', options.profileType)
    }

    if (options?.approvalStatus) {
      query = query.eq('approval_status', options.approvalStatus)
    }

    if (options?.limit != null && options.limit > 0) {
      query = query.limit(Math.min(options.limit, 5000))
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error getting profiles by scope:', error)
      return []
    }

    return data as Profile[]
  },

  /**
   * Create a new profile
   */
  async create(input: CreateProfileInput): Promise<Profile | null> {
    const supabase = getDbClient()

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        ...input,
        approval_status: 'pending',
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating profile:', error)
      return null
    }

    return data as Profile
  },

  /**
   * Update a profile
   */
  async update(id: string, input: UpdateProfileInput): Promise<Profile | null> {
    const supabase = getDbClient()

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return null
    }

    return data as Profile
  },

  /**
   * Update approval status
   */
  async updateApprovalStatus(
    id: string,
    status: ApprovalStatus
  ): Promise<Profile | null> {
    const supabase = getDbClient()

    const { data, error } = await supabase
      .from('profiles')
      .update({
        approval_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating approval status:', error)
      return null
    }

    return data as Profile
  },

  /**
   * Soft delete (deactivate) a profile
   */
  async deactivate(id: string): Promise<boolean> {
    const supabase = getDbClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Error deactivating profile:', error)
      return false
    }

    return true
  },

  /**
   * Hard delete a profile
   */
  async delete(id: string): Promise<boolean> {
    const supabase = getDbClient()

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting profile:', error)
      return false
    }

    return true
  },

  /**
   * Get pending approval count
   */
  async getPendingCount(organizationId?: string): Promise<number> {
    const supabase = getDbClient()

    let query = supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('approval_status', 'pending')

    void organizationId

    const { count, error } = await query

    if (error) {
      console.error('Error getting pending count:', error)
      return 0
    }

    return count || 0
  },

  /**
   * Search profiles
   */
  async search(query: string, organizationId?: string) {
    const supabase = getDbClient()

    let dbQuery = supabase
      .from('profiles')
      .select('*')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)

    void organizationId

    const { data, error } = await dbQuery
      .order('full_name', { ascending: true })
      .limit(20)

    if (error) {
      console.error('Error searching profiles:', error)
      return []
    }

    return data as Profile[]
  },
}
