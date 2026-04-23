import type { UserContext } from '../types'

/**
 * Security guards for agent operations
 */
export class SecurityGuards {
  /**
   * Validates that user has permission to perform an action
   */
  static canPerformAction(
    context: UserContext,
    _action: string,
    targetOrganizationId?: string | null
  ): { allowed: boolean; reason?: string } {
    // Platform owners can do anything
    if (context.profileType === 'platform_owner') {
      return { allowed: true }
    }

    // School admins can only act within their organization
    if (context.profileType === 'school_superadmin') {
      if (targetOrganizationId && targetOrganizationId !== context.organizationId) {
        return {
          allowed: false,
          reason: 'Cannot perform actions outside your organization',
        }
      }
      return { allowed: true }
    }

    return {
      allowed: false,
      reason: 'Insufficient permissions for this action',
    }
  }

  /**
   * Validates SQL query is safe (SELECT only)
   */
  static isQuerySafe(query: string): { safe: boolean; reason?: string } {
    const trimmedQuery = query.trim().toUpperCase()

    // Blocked keywords
    const blockedKeywords = [
      'INSERT',
      'UPDATE',
      'DELETE',
      'DROP',
      'ALTER',
      'TRUNCATE',
      'CREATE',
      'GRANT',
      'REVOKE',
      'EXEC',
      'EXECUTE',
      'CALL',
    ]

    for (const keyword of blockedKeywords) {
      // Use word boundary regex to match only whole words, not substrings
      // This prevents false positives like "CREATED" matching "CREATE"
      const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'i')
      if (keywordRegex.test(query)) {
        return {
          safe: false,
          reason: `Query contains blocked keyword: ${keyword}. Only SELECT queries are allowed.`,
        }
      }
    }

    // Must start with SELECT
    if (!trimmedQuery.startsWith('SELECT')) {
      return {
        safe: false,
        reason: 'Query must be a SELECT statement. Only read operations are allowed via SQL.',
      }
    }

    return { safe: true }
  }

  /**
   * Validates that user can query a specific table
   */
  static canQueryTable(
    context: UserContext,
    tableName: string
  ): { allowed: boolean; reason?: string } {
    // Allowed tables (all tables from the actual database schema)
    const allowedTables = [
      'organizations',
      'profiles', // ALL users (teachers, students, admins) are here
      'classes',
      'class_enrollments',
      'class_teachers',
      'exams',
      'exam_submissions',
      'lessons',
      'documents',
      'chat_conversations',
      'chat_messages',
      'teacher_chat_conversations',
      'teacher_chat_messages',
    ]

    if (!allowedTables.includes(tableName.toLowerCase())) {
      return {
        allowed: false,
        reason: `Table "${tableName}" is not accessible via the agent`,
      }
    }

    // Platform owners can query any table
    if (context.profileType === 'platform_owner') {
      return { allowed: true }
    }

    // School admins can query organization-scoped tables
    return { allowed: true }
  }

  /**
   * Validates user can create entities
   */
  static canCreateEntity(
    context: UserContext,
    entityType: 'user' | 'class' | 'student' | 'teacher'
  ): { allowed: boolean; reason?: string } {
    // Platform owners can create anything
    if (context.profileType === 'platform_owner') {
      return { allowed: true }
    }

    // School admins can create users, classes, students, teachers in their org
    if (context.profileType === 'school_superadmin') {
      return { allowed: true }
    }

    return {
      allowed: false,
      reason: `Cannot create ${entityType}. Requires platform owner or school admin privileges.`,
    }
  }
}
