import type { UserContext, ActionToolResult } from '../types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { InputValidator } from '../security/validator'
import { organizationRepository } from '@eduator/db/repositories'
import type { CreateOrganizationInput } from '@eduator/core/types/organization'
import { ORGANIZATION_TYPES, SUBSCRIPTION_PLANS } from '@eduator/config'

export interface CreateOrganizationParams {
  name: string
  type?: string // 'school' | 'university' | 'institution' | 'academy' | 'other'
  email?: string
  subscriptionPlan?: string // 'basic' | 'premium' | 'enterprise'
  createDemoUsers?: boolean // If true, create demo teacher and students
}

/**
 * Create a new organization
 * Only platform owners can create organizations
 */
export async function createOrganization(
  params: CreateOrganizationParams,
  context: UserContext,
  client: SupabaseClient
): Promise<ActionToolResult> {
  // Only platform owners can create organizations
  if (context.profileType !== 'platform_owner') {
    return {
      success: false,
      error: 'Only platform owners can create organizations',
    }
  }

  // Validate name
  if (!params.name || params.name.trim().length < 3) {
    return {
      success: false,
      error: 'Organization name must be at least 3 characters',
    }
  }

  // Prepare organization data with defaults
  const organizationData: CreateOrganizationInput = {
    name: params.name.trim(),
    type: (params.type as any) || ORGANIZATION_TYPES.SCHOOL,
    email: params.email || `contact@${params.name.toLowerCase().replace(/\s+/g, '')}.edu`,
    subscription_plan: (params.subscriptionPlan as any) || SUBSCRIPTION_PLANS.BASIC,
  }

  // Validate email format
  if (!InputValidator.isValidEmail(organizationData.email)) {
    return {
      success: false,
      error: 'Invalid email format',
    }
  }

  try {
    // Create organization
    const organization = await organizationRepository.create(organizationData)

    if (!organization) {
      return {
        success: false,
        error: 'Failed to create organization',
      }
    }

    const result: any = {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        type: organization.type,
        email: organization.email,
        subscription_plan: organization.subscription_plan,
      },
    }

    // Create demo users if requested
    // Note: For demo users, we'll just create profiles without auth users
    // In production, you might want to create full auth users
    if (params.createDemoUsers) {
      const demoUsers = []
      
      // Create demo school admin
      try {
        const adminEmail = `admin@${organization.slug}.edu`
        const { data: adminProfile } = await client
          .from('profiles')
          .insert({
            profile_type: 'school_superadmin',
            organization_id: organization.id,
            full_name: `${organization.name} Admin`,
            email: adminEmail,
            approval_status: 'approved',
            is_active: true,
            source: 'erp',
          })
          .select()
          .single()

        if (adminProfile) {
          demoUsers.push({
            type: 'school_superadmin',
            name: adminProfile.full_name,
            email: adminProfile.email,
            id: adminProfile.id,
          })
        }
      } catch (error) {
        console.error('Error creating demo admin:', error)
      }

      // Create demo teacher
      try {
        const teacherEmail = `teacher@${organization.slug}.edu`
        const { data: teacherProfile } = await client
          .from('profiles')
          .insert({
            profile_type: 'teacher',
            organization_id: organization.id,
            full_name: `Demo Teacher`,
            email: teacherEmail,
            approval_status: 'approved',
            is_active: true,
            source: 'erp',
          })
          .select()
          .single()

        if (teacherProfile) {
          demoUsers.push({
            type: 'teacher',
            name: teacherProfile.full_name,
            email: teacherProfile.email,
            id: teacherProfile.id,
          })
        }
      } catch (error) {
        console.error('Error creating demo teacher:', error)
      }

      // Create 3 demo students
      for (let i = 1; i <= 3; i++) {
        try {
          const studentEmail = `student${i}@${organization.slug}.edu`
          const { data: studentProfile } = await client
            .from('profiles')
            .insert({
              profile_type: 'student',
              organization_id: organization.id,
              full_name: `Demo Student ${i}`,
              email: studentEmail,
              approval_status: 'approved',
              is_active: true,
              source: 'erp',
            })
            .select()
            .single()

          if (studentProfile) {
            demoUsers.push({
              type: 'student',
              name: studentProfile.full_name,
              email: studentProfile.email,
              id: studentProfile.id,
            })
          }
        } catch (error) {
          console.error(`Error creating demo student ${i}:`, error)
        }
      }

      result.demoUsers = demoUsers
      result.demoUsersCount = demoUsers.length
    }

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create organization',
    }
  }
}
