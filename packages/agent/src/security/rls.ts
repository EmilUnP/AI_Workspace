import type { UserContext } from '../types'

/**
 * Enforces Row-Level Security by injecting organization filters into SQL queries
 */
export class RLSEnforcer {
  /**
   * Adds organization filter to SQL query based on user context
   * 
   * Platform owners can see all organizations
   * School admins can only see their organization's data
   */
  static injectOrganizationFilter(
    query: string,
    context: UserContext
  ): string {
    // Platform owners don't need filters - they can see everything
    if (context.profileType === 'platform_owner' || !context.organizationId) {
      return query
    }

    // For school admins, we need to add organization_id filter
    // This is a simple approach - in production, you'd want more sophisticated SQL parsing
    const orgId = context.organizationId

    // Check if query already has WHERE clause
    const hasWhere = /\bWHERE\b/i.test(query)

    // Tables that should have organization_id filter
    const organizationScopedTables = [
      'profiles',
      'classes',
      'exams',
      'lessons',
      'chat_conversations',
    ]

    // Check if any organization-scoped table is in the query
    const needsFilter = organizationScopedTables.some(table => {
      const regex = new RegExp(`\\bFROM\\s+${table}\\b|\\bJOIN\\s+${table}\\b`, 'i')
      return regex.test(query)
    })

    if (!needsFilter) {
      return query
    }

    // Add organization filter
    // Note: This is a simplified approach. For production, use a proper SQL parser
    if (hasWhere) {
      // Add AND condition
      return query.replace(/\bWHERE\b/i, (match) => {
        return `${match} organization_id = '${orgId}' AND`
      })
    } else {
      // Add WHERE clause before ORDER BY, GROUP BY, or LIMIT
      const insertPoint = query.search(/\b(ORDER BY|GROUP BY|LIMIT)\b/i)
      if (insertPoint > 0) {
        return (
          query.slice(0, insertPoint).trim() +
          ` WHERE organization_id = '${orgId}' ` +
          query.slice(insertPoint).trim()
        )
      } else {
        return query.trim() + ` WHERE organization_id = '${orgId}'`
      }
    }
  }

  /**
   * Validates that user has access to the organization they're querying
   */
  static validateOrganizationAccess(
    context: UserContext,
    targetOrganizationId?: string | null
  ): boolean {
    // Platform owners can access any organization
    if (context.profileType === 'platform_owner') {
      return true
    }

    // School admins can only access their own organization
    if (context.profileType === 'school_superadmin') {
      return targetOrganizationId === context.organizationId
    }

    return false
  }

  /**
   * Gets the organization filter condition for a specific table
   */
  static getOrganizationCondition(
    context: UserContext,
    tableAlias?: string
  ): string | null {
    if (context.profileType === 'platform_owner' || !context.organizationId) {
      return null
    }

    const prefix = tableAlias ? `${tableAlias}.` : ''
    return `${prefix}organization_id = '${context.organizationId}'`
  }
}
