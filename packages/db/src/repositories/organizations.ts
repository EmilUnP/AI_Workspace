import { getDbClient } from '../client'
import type {
  Organization,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationWithStats,
} from '@eduator/core/types/organization'
import type { OrganizationStatus, SubscriptionPlan } from '@eduator/config'
import { slugify } from '@eduator/core/utils/slugify'

/**
 * Organization Repository - Data access layer for organizations
 */
export const organizationRepository = {
  /**
   * Get organization by ID
   */
  async getById(id: string): Promise<Organization | null> {
    const supabase = getDbClient()

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error getting organization:', error)
      return null
    }

    return data as Organization
  },

  /**
   * Get organization by slug
   */
  async getBySlug(slug: string): Promise<Organization | null> {
    const supabase = getDbClient()

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) {
      console.error('Error getting organization by slug:', error)
      return null
    }

    return data as Organization
  },

  /**
   * Get organization with stats
   */
  async getByIdWithStats(id: string): Promise<OrganizationWithStats | null> {
    const supabase = getDbClient()

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (orgError || !org) {
      console.error('Error getting organization:', orgError)
      return null
    }

    // Get stats
    const [teacherCount, studentCount, classCount, examCount] = await Promise.all([
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', id)
        .eq('profile_type', 'teacher'),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', id)
        .eq('profile_type', 'student'),
      supabase
        .from('classes')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', id),
      supabase
        .from('exams')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', id),
    ])

    return {
      ...org,
      stats: {
        total_teachers: teacherCount.count || 0,
        total_students: studentCount.count || 0,
        total_classes: classCount.count || 0,
        total_exams: examCount.count || 0,
        storage_used_gb: 0, // TODO: Calculate from storage
        ai_requests_used: 0, // TODO: Track AI requests
      },
    } as OrganizationWithStats
  },

  /**
   * Get all organizations
   */
  async getAll(options?: {
    page?: number
    perPage?: number
    status?: OrganizationStatus
    subscriptionPlan?: SubscriptionPlan
    search?: string
  }) {
    const supabase = getDbClient()
    const { page = 1, perPage = 20, status, subscriptionPlan, search } = options || {}

    let query = supabase
      .from('organizations')
      .select('*', { count: 'exact' })

    if (status) {
      query = query.eq('status', status)
    }

    if (subscriptionPlan) {
      query = query.eq('subscription_plan', subscriptionPlan)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1)

    if (error) {
      console.error('Error getting organizations:', error)
      return { data: [], count: 0 }
    }

    return { data: data as Organization[], count: count || 0 }
  },

  /**
   * Create a new organization
   */
  async create(input: CreateOrganizationInput): Promise<Organization | null> {
    const supabase = getDbClient()

    // Generate unique slug
    let slug = slugify(input.name)
    const existingSlug = await this.getBySlug(slug)
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`
    }

    const { data, error } = await supabase
      .from('organizations')
      .insert({
        ...input,
        slug,
        subscription_plan: input.subscription_plan || 'basic',
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating organization:', error)
      return null
    }

    return data as Organization
  },

  /**
   * Update an organization
   */
  async update(id: string, input: UpdateOrganizationInput): Promise<Organization | null> {
    const supabase = getDbClient()

    const updateData: Record<string, unknown> = {
      ...input,
      updated_at: new Date().toISOString(),
    }

    // Update slug if name changed
    if (input.name) {
      const slug = slugify(input.name)
      const existingSlug = await this.getBySlug(slug)
      if (!existingSlug || existingSlug.id === id) {
        updateData.slug = slug
      }
    }

    const { data, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating organization:', error)
      return null
    }

    return data as Organization
  },

  /**
   * Update organization status
   */
  async updateStatus(id: string, status: OrganizationStatus): Promise<boolean> {
    const supabase = getDbClient()

    const { error } = await supabase
      .from('organizations')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating organization status:', error)
      return false
    }

    return true
  },

  /**
   * Update subscription plan
   */
  async updateSubscription(id: string, plan: SubscriptionPlan): Promise<boolean> {
    const supabase = getDbClient()

    const { error } = await supabase
      .from('organizations')
      .update({
        subscription_plan: plan,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating subscription:', error)
      return false
    }

    return true
  },

  /**
   * Delete an organization
   */
  async delete(id: string): Promise<boolean> {
    const supabase = getDbClient()

    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting organization:', error)
      return false
    }

    return true
  },

  /**
   * Get organization counts by status
   */
  async getCountsByStatus() {
    const supabase = getDbClient()

    const { data, error } = await supabase
      .from('organizations')
      .select('status')

    if (error) {
      console.error('Error getting status counts:', error)
      return { active: 0, suspended: 0, inactive: 0 }
    }

    return {
      active: data.filter((o) => o.status === 'active').length,
      suspended: data.filter((o) => o.status === 'suspended').length,
      inactive: data.filter((o) => o.status === 'inactive').length,
    }
  },

  /**
   * Get organization counts by subscription plan
   */
  async getCountsByPlan() {
    const supabase = getDbClient()

    const { data, error } = await supabase
      .from('organizations')
      .select('subscription_plan')

    if (error) {
      console.error('Error getting plan counts:', error)
      return { basic: 0, premium: 0, enterprise: 0 }
    }

    return {
      basic: data.filter((o) => o.subscription_plan === 'basic').length,
      premium: data.filter((o) => o.subscription_plan === 'premium').length,
      enterprise: data.filter((o) => o.subscription_plan === 'enterprise').length,
    }
  },
}
