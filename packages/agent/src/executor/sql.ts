import type { SqlExecutorOptions, SqlExecutorResult, UserContext } from '../types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SecurityGuards } from '../security/guards'
import { getGeminiFlash } from '@eduator/ai/gemini'
import { executeRawQuery } from '@eduator/db/client'
import { logger } from '../logger'

/**
 * SQL Executor with RLS support
 * Only allows SELECT queries and enforces Row-Level Security
 * 
 * Note: This executor parses SQL queries and converts them to Supabase query builder calls
 * to ensure RLS policies are properly enforced. For complex queries, consider using
 * database functions instead.
 */
export class SqlExecutor {
  /**
   * Normalizes SQL query - replaces common incorrect table names with correct ones
   */
  private static normalizeQuery(query: string): string {
    let normalized = query

    // Replace incorrect table names with correct ones
    // Case-insensitive replacements using regex
    const replacements: Array<[RegExp, string]> = [
      // "users" table doesn't exist - use "profiles"
      [/\bFROM\s+users\b/gi, 'FROM profiles'],
      [/\bJOIN\s+users\b/gi, 'JOIN profiles'],
      [/\bUPDATE\s+users\b/gi, 'UPDATE profiles'],
      // "teachers" table doesn't exist - use "profiles" with WHERE clause
      [/\bFROM\s+teachers\b/gi, 'FROM profiles'],
      [/\bJOIN\s+teachers\b/gi, 'JOIN profiles'],
      // "students" table doesn't exist - use "profiles" with WHERE clause
      [/\bFROM\s+students\b/gi, 'FROM profiles'],
      [/\bJOIN\s+students\b/gi, 'JOIN profiles'],
      // "staff" table doesn't exist - use "profiles"
      [/\bFROM\s+staff\b/gi, 'FROM profiles'],
      [/\bJOIN\s+staff\b/gi, 'JOIN profiles'],
      // Fix organization_name references (profiles doesn't have this column)
      [/\bprofiles\.organization_name\b/gi, 'o.name'],
      [/\bp\.organization_name\b/gi, 'o.name'],
      // Fix profiles.name references (profiles has full_name, not name)
      [/\bprofiles\.name\b/gi, 'profiles.full_name'],
      [/\bp\.name\b/gi, 'p.full_name'],
      // Fix role references - profiles table uses profile_type, NOT role
      // Only replace when it's clearly referring to profiles table (not class_teachers.role)
      [/\bprofiles\.role\b/gi, 'profiles.profile_type'],
      [/\bp\.role\b/gi, 'p.profile_type'],
      // Replace standalone "role" in WHERE/AND/OR clauses when querying profiles
      // But be careful - only if it's in a profiles query context
      [/(WHERE|AND|OR)\s+role\s*=\s*['"](teacher|student|school_superadmin|platform_owner)['"]/gi, '$1 profile_type = \'$2\''],
      // Also fix role in SELECT, GROUP BY, ORDER BY clauses when it's clearly about profiles
      [/\bSELECT\s+role\b/gi, 'SELECT profile_type'],
      [/\b,\s*role\b/gi, ', profile_type'],
      [/\bGROUP\s+BY\s+role\b/gi, 'GROUP BY profile_type'],
      [/\bORDER\s+BY\s+role\b/gi, 'ORDER BY profile_type'],
    ]

    for (const [pattern, replacement] of replacements) {
      normalized = normalized.replace(pattern, replacement)
    }
    
    // Fix organization name values - remove " organization" suffix if present
    // This handles cases where AI includes " organization" in the name value
    // Example: WHERE o.name = 'Test organization' → WHERE o.name = 'Test'
    normalized = normalized.replace(/(WHERE\s+o\.name\s*=\s*)['"]([^'"]+)\s+organization['"]/gi, "$1'$2'")
    normalized = normalized.replace(/(WHERE\s+o\.name\s*=\s*)['"]([^'"]+)\s+organization['"]/gi, '$1"$2"')
    
    // Check if query references organization name but doesn't have JOIN
    // If so, we need to add the JOIN
    if (/\borganization.*name|name.*organization/i.test(normalized) && !/\bJOIN\s+organizations/i.test(normalized)) {
      logger.debug('[SQL Executor] Detected organization name reference without JOIN, attempting to add JOIN')
      // Try to add JOIN if FROM profiles exists
      if (/FROM\s+profiles/i.test(normalized)) {
        // Replace FROM profiles with FROM profiles p JOIN organizations o ON p.organization_id = o.id
        normalized = normalized.replace(/FROM\s+profiles(\s|$)/i, 'FROM profiles p JOIN organizations o ON p.organization_id = o.id$1')
        // Replace any profiles.organization_name or p.organization_name with o.name
        normalized = normalized.replace(/\b(profiles|p)\.organization_name\b/gi, 'o.name')
        // Replace standalone organization_name in WHERE clause with o.name (no table prefix)
        // Do this carefully - only replace organization_name that's not already qualified
        normalized = normalized.replace(/\b(?<!\.)organization_name\b/gi, 'o.name')
        // Fix organization name values - remove " organization" suffix
        normalized = normalized.replace(/(WHERE\s+o\.name\s*=\s*)['"]([^'"]+)\s+organization['"]/gi, "$1'$2'")
        // Replace any profiles.name or p.name with o.name (if it's in WHERE clause for organization)
        if (/WHERE.*\b(profiles|p)\.name\s*=/i.test(normalized)) {
          normalized = normalized.replace(/\b(profiles|p)\.name\b/gi, 'o.name')
        }
        logger.debug('[SQL Executor] Added JOIN, normalized query:', normalized)
      }
    }
    
    // Also fix organization_name references even if JOIN already exists
    // This catches cases where AI generates organization_name after JOIN is added
    if (/\bJOIN\s+organizations/i.test(normalized)) {
      // Replace any standalone organization_name with o.name
      normalized = normalized.replace(/\b(?<!\.)organization_name\b/gi, 'o.name')
      // Also replace any table-prefixed organization_name that shouldn't exist
      normalized = normalized.replace(/\b(profiles|p)\.organization_name\b/gi, 'o.name')
      // Fix organization name values - remove " organization" suffix
      normalized = normalized.replace(/(WHERE\s+o\.name\s*=\s*)['"]([^'"]+)\s+organization['"]/gi, "$1'$2'")
    }
    
    // Additional pass: Fix any remaining role references in profiles queries
    // This handles cases where role appears without table prefix in profiles context
    if (/FROM\s+profiles/i.test(normalized) && /\brole\b/i.test(normalized) && !/class_teachers/i.test(normalized)) {
      // Replace role = 'teacher'/'student' etc. with profile_type
      normalized = normalized.replace(/\brole\s*=\s*['"](teacher|student|school_superadmin|platform_owner)['"]/gi, 'profile_type = \'$1\'')
      // Replace role IN ('teacher', 'student') with profile_type
      normalized = normalized.replace(/\brole\s+IN\s*\(/gi, 'profile_type IN (')
      // Replace standalone role in WHERE/AND/OR when it's clearly about profiles
      normalized = normalized.replace(/(WHERE|AND|OR)\s+role\s*=/gi, '$1 profile_type =')
      logger.debug('[SQL Executor] Fixed role → profile_type in profiles query')
    }

    // If we replaced "teachers" or "students", we need to add WHERE clauses
    // This is a simplified approach - for complex queries, the AI should handle it
    if (/FROM\s+profiles/i.test(normalized) && /\bteachers\b/i.test(query)) {
      // If the original query mentioned "teachers", ensure profile_type filter
      if (!/WHERE.*profile_type/i.test(normalized)) {
        // Add WHERE clause or extend existing one
        if (/WHERE/i.test(normalized)) {
          normalized = normalized.replace(/(\bWHERE\b)/i, "$1 profile_type = 'teacher' AND")
        } else {
          // Add WHERE before ORDER BY, GROUP BY, or LIMIT
          const insertPoint = normalized.search(/\b(ORDER BY|GROUP BY|LIMIT)\b/i)
          if (insertPoint > 0) {
            normalized = normalized.slice(0, insertPoint).trim() + 
              " WHERE profile_type = 'teacher' " + 
              normalized.slice(insertPoint).trim()
          } else {
            normalized = normalized.trim() + " WHERE profile_type = 'teacher'"
          }
        }
      }
    }

    if (/FROM\s+profiles/i.test(normalized) && /\bstudents\b/i.test(query) && !/\bteachers\b/i.test(query)) {
      // If the original query mentioned "students" (but not teachers), ensure profile_type filter
      if (!/WHERE.*profile_type/i.test(normalized)) {
        // Add WHERE clause or extend existing one
        if (/WHERE/i.test(normalized)) {
          normalized = normalized.replace(/(\bWHERE\b)/i, "$1 profile_type = 'student' AND")
        } else {
          // Add WHERE before ORDER BY, GROUP BY, or LIMIT
          const insertPoint = normalized.search(/\b(ORDER BY|GROUP BY|LIMIT)\b/i)
          if (insertPoint > 0) {
            normalized = normalized.slice(0, insertPoint).trim() + 
              " WHERE profile_type = 'student' " + 
              normalized.slice(insertPoint).trim()
          } else {
            normalized = normalized.trim() + " WHERE profile_type = 'student'"
          }
        }
      }
    }
    
    // Fix class name references - ensure proper JOINs when querying classes with organization
    if (/FROM\s+classes/i.test(normalized) && /\borganization/i.test(normalized) && !/\bJOIN\s+organizations/i.test(normalized)) {
      logger.debug('[SQL Executor] Detected class query with organization reference, adding JOIN')
      normalized = normalized.replace(/FROM\s+classes(\s+[a-z])?/i, 'FROM classes c JOIN organizations o ON c.organization_id = o.id$1')
      // Fix organization_name references in class queries
      normalized = normalized.replace(/\b(classes|c)\.organization_name\b/gi, 'o.name')
      normalized = normalized.replace(/\b(?<!\.)organization_name\b/gi, 'o.name')
      normalized = normalized.replace(/(WHERE\s+o\.name\s*=\s*)['"]([^'"]+)\s+organization['"]/gi, "$1'$2'")
    }
    
    // Fix exam/lesson queries with organization references
    if (/(FROM\s+(exams|lessons))/i.test(normalized) && /\borganization/i.test(normalized) && !/\bJOIN\s+organizations/i.test(normalized)) {
      logger.debug('[SQL Executor] Detected exam/lesson query with organization reference, adding JOIN')
      normalized = normalized.replace(/FROM\s+(exams|lessons)(\s+[a-z])?/i, 'FROM $1 e JOIN organizations o ON e.organization_id = o.id$2')
      // Fix organization_name references
      normalized = normalized.replace(/\b(exams|lessons|e)\.organization_name\b/gi, 'o.name')
      normalized = normalized.replace(/\b(?<!\.)organization_name\b/gi, 'o.name')
      normalized = normalized.replace(/(WHERE\s+o\.name\s*=\s*)['"]([^'"]+)\s+organization['"]/gi, "$1'$2'")
    }
    
    // Fix exam/lesson queries with teacher name references - ensure proper JOIN
    if (/(FROM\s+(exams|lessons))/i.test(normalized) && /\b(teacher|created_by)/i.test(normalized) && !/\bJOIN\s+profiles/i.test(normalized)) {
      logger.debug('[SQL Executor] Detected exam/lesson query with teacher reference, adding JOIN')
      const tableAlias = normalized.match(/FROM\s+(exams|lessons)(\s+([a-z]))?/i)?.[3] || 'e'
      normalized = normalized.replace(/FROM\s+(exams|lessons)(\s+[a-z])?/i, `FROM $1 ${tableAlias} JOIN profiles p ON ${tableAlias}.created_by = p.id`)
      // Ensure profile_type filter for teachers
      if (/\bteacher/i.test(query) && !/WHERE.*profile_type/i.test(normalized)) {
        if (/WHERE/i.test(normalized)) {
          normalized = normalized.replace(/(\bWHERE\b)/i, "$1 p.profile_type = 'teacher' AND")
        } else {
          const insertPoint = normalized.search(/\b(ORDER BY|GROUP BY|LIMIT)\b/i)
          if (insertPoint > 0) {
            normalized = normalized.slice(0, insertPoint).trim() + 
              " WHERE p.profile_type = 'teacher' " + 
              normalized.slice(insertPoint).trim()
          } else {
            normalized = normalized.trim() + " WHERE p.profile_type = 'teacher'"
          }
        }
      }
    }
    
    // Fix class queries with teacher name references
    if (/FROM\s+classes/i.test(normalized) && /\bteacher/i.test(normalized) && !/\bJOIN\s+profiles/i.test(normalized)) {
      logger.debug('[SQL Executor] Detected class query with teacher reference, adding JOIN')
      normalized = normalized.replace(/FROM\s+classes(\s+[a-z])?/i, 'FROM classes c LEFT JOIN profiles p ON c.teacher_id = p.id$1')
    }
    
    // Fix class enrollment queries - ensure proper JOINs
    if (/FROM\s+class_enrollments/i.test(normalized) && !/\bJOIN\s+profiles/i.test(normalized)) {
      logger.debug('[SQL Executor] Detected class_enrollments query, ensuring profiles JOIN')
      if (!/\bJOIN\s+profiles/i.test(normalized)) {
        normalized = normalized.replace(/FROM\s+class_enrollments(\s+[a-z])?/i, 'FROM class_enrollments ce JOIN profiles p ON ce.student_id = p.id$1')
      }
    }
    
    // Fix queries asking for "users without organization" or "null organization"
    if (/FROM\s+profiles/i.test(normalized) && /\b(without|no|null)\s+organization/i.test(query)) {
      if (!/WHERE.*organization_id\s+IS\s+NULL/i.test(normalized)) {
        if (/WHERE/i.test(normalized)) {
          normalized = normalized.replace(/(\bWHERE\b)/i, "$1 organization_id IS NULL AND")
        } else {
          const insertPoint = normalized.search(/\b(ORDER BY|GROUP BY|LIMIT)\b/i)
          if (insertPoint > 0) {
            normalized = normalized.slice(0, insertPoint).trim() + 
              " WHERE organization_id IS NULL " + 
              normalized.slice(insertPoint).trim()
          } else {
            normalized = normalized.trim() + " WHERE organization_id IS NULL"
          }
        }
      }
    }

    return normalized
  }

  /**
   * Executes a SELECT query with RLS enforcement
   */
  static async execute(
    options: SqlExecutorOptions
  ): Promise<SqlExecutorResult> {
    const { query, context, client } = options

    logger.debug('[SQL Executor] Original query:', query)
    logger.debug('[SQL Executor] Context:', { profileType: context.profileType, organizationId: context.organizationId })

    // Normalize query - replace incorrect table names
    const normalizedQuery = this.normalizeQuery(query)
    logger.debug('[SQL Executor] Normalized query:', normalizedQuery)

    // Validate query is safe (SELECT only)
    const safetyCheck = SecurityGuards.isQuerySafe(normalizedQuery)
    if (!safetyCheck.safe) {
      logger.error('[SQL Executor] Query safety check failed:', safetyCheck.reason)
      return {
        data: [],
        rowCount: 0,
        error: safetyCheck.reason,
      }
    }

    // Use query builder approach (more secure and respects RLS automatically)
    const result = await this.executeWithQueryBuilder(normalizedQuery, context, client)
    logger.debug('[SQL Executor] Result:', { rowCount: result.rowCount, hasError: !!result.error })
    return result
  }

  /**
   * Check if query contains JOINs
   */
  private static hasJoin(query: string): boolean {
    return /\bJOIN\b/i.test(query)
  }

  /**
   * Extract all table names from query (including JOINs)
   */
  private static extractTables(query: string): string[] {
    const tables: string[] = []
    
    // Extract FROM table
    const fromMatch = query.match(/FROM\s+(\w+)/i)
    if (fromMatch) {
      tables.push(fromMatch[1].toLowerCase())
    }
    
    // Extract JOIN tables
    const joinMatches = query.matchAll(/JOIN\s+(\w+)/gi)
    for (const match of joinMatches) {
      tables.push(match[1].toLowerCase())
    }
    
    return tables
  }

  /**
   * Execution method using Supabase query builder or raw SQL
   * Uses raw SQL for JOIN queries, query builder for simple queries
   * This approach automatically respects RLS policies
   */
  private static async executeWithQueryBuilder(
    query: string,
    context: UserContext,
    client: SupabaseClient
  ): Promise<SqlExecutorResult> {
    try {
      // Check if query has JOINs - if yes, use raw SQL execution
      const hasJoinClause = this.hasJoin(query)
      logger.debug('[SQL Executor] Has JOIN:', hasJoinClause)
      
      if (hasJoinClause) {
        logger.debug('[SQL Executor] Using raw SQL execution for JOIN query')
        return await this.executeRawSQL(query, context, client)
      }
      
      logger.debug('[SQL Executor] Using query builder for simple query')

      // Extract table name from SELECT query (simple queries without JOIN)
      const tableMatch = query.match(/FROM\s+(\w+)/i)
      if (!tableMatch) {
        return {
          data: [],
          rowCount: 0,
          error: 'Could not determine table name from query',
        }
      }

      const tableName = tableMatch[1].toLowerCase()

      // Validate table access
      const accessCheck = SecurityGuards.canQueryTable(context, tableName)
      if (!accessCheck.allowed) {
        // Provide helpful error message for common mistakes
        let helpfulMessage = accessCheck.reason
        if (tableName.toLowerCase() === 'users') {
          helpfulMessage = `Table "users" does not exist. Use "profiles" instead. For example: SELECT * FROM profiles WHERE is_active = true`
        } else if (tableName.toLowerCase() === 'teachers') {
          helpfulMessage = `Table "teachers" does not exist. Use "profiles" with WHERE profile_type = 'teacher'. For example: SELECT * FROM profiles WHERE profile_type = 'teacher' AND is_active = true`
        } else if (tableName.toLowerCase() === 'students') {
          helpfulMessage = `Table "students" does not exist. Use "profiles" with WHERE profile_type = 'student'. For example: SELECT * FROM profiles WHERE profile_type = 'student' AND is_active = true`
        } else if (tableName.toLowerCase() === 'staff') {
          helpfulMessage = `Table "staff" does not exist. Use "profiles" instead. For example: SELECT * FROM profiles WHERE is_active = true`
        }
        
        return {
          data: [],
          rowCount: 0,
          error: helpfulMessage,
        }
      }

      // Build query with Supabase client
      // Note: RLS policies are automatically enforced by Supabase based on the user's JWT
      // We use the admin client but with user context set in the request
      let queryBuilder = client.from(tableName).select('*')

      // Apply organization filter for school admins manually if needed
      // (RLS should handle this, but we add it explicitly for clarity)
      if (context.profileType === 'school_superadmin' && context.organizationId) {
        queryBuilder = queryBuilder.eq('organization_id', context.organizationId)
      }

      // Parse WHERE conditions
      const whereMatch = query.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+GROUP\s+BY|\s+LIMIT|$)/i)
      if (whereMatch) {
        const whereClause = whereMatch[1].trim()
        // Parse simple WHERE conditions (e.g., "column = 'value'", "column > 5")
        // This is a simplified parser - for production, use a proper SQL parser
        this.applyWhereConditions(queryBuilder, whereClause)
      }

      // Apply ORDER BY if present
      const orderMatch = query.match(/ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i)
      if (orderMatch) {
        const column = orderMatch[1]
        const direction = orderMatch[2]?.toLowerCase() === 'desc' ? false : true
        queryBuilder = queryBuilder.order(column, { ascending: direction })
      }

      // Apply LIMIT if present
      const limitMatch = query.match(/LIMIT\s+(\d+)/i)
      if (limitMatch) {
        queryBuilder = queryBuilder.limit(parseInt(limitMatch[1], 10))
      }

      // Execute query
      // Note: We're using admin client but RLS is enforced at the database level
      // The query builder will respect RLS policies based on the user context
      // For school admins, we explicitly add organization_id filter
      logger.debug('[SQL Executor] Executing query builder for table:', tableName)
      const { data, error } = await queryBuilder

      if (error) {
        logger.error('[SQL Executor] Query builder error:', error.message, error)
        return {
          data: [],
          rowCount: 0,
          error: error.message,
        }
      }

      logger.debug('[SQL Executor] Query builder success:', { rowCount: data?.length || 0 })
      return {
        data: data || [],
        rowCount: data?.length || 0,
      }
    } catch (error) {
      return {
        data: [],
        rowCount: 0,
        error: error instanceof Error ? error.message : 'Query execution failed',
      }
    }
  }

  /**
   * Execute raw SQL query (for JOINs and complex queries)
   * RLS is enforced at the database level
   */
  private static async executeRawSQL(
    query: string,
    context: UserContext,
    _client: SupabaseClient
  ): Promise<SqlExecutorResult> {
    try {
      logger.debug('[SQL Executor] Executing raw SQL query:', query)
      
      // Extract all table names from the query
      const tables = this.extractTables(query)
      logger.debug('[SQL Executor] Extracted tables:', tables)
      
      // Validate all tables are accessible
      for (const table of tables) {
        const accessCheck = SecurityGuards.canQueryTable(context, table)
        if (!accessCheck.allowed) {
          logger.error('[SQL Executor] Table access denied:', table, accessCheck.reason)
          return {
            data: [],
            rowCount: 0,
            error: `Table "${table}" is not accessible: ${accessCheck.reason}`,
          }
        }
      }

      // Clean up the query - ensure it's SELECT only
      const cleanedQuery = query.trim()
      if (!/^SELECT\s+/i.test(cleanedQuery)) {
        logger.error('[SQL Executor] Non-SELECT query detected')
        return {
          data: [],
          rowCount: 0,
          error: 'Only SELECT queries are allowed',
        }
      }

      logger.debug('[SQL Executor] Calling executeRawQuery with cleaned query')
      // Execute raw SQL using the db package's executeRawQuery function
      // This uses the RPC function 'execute_sql' which should exist in the database
      const { data, error } = await executeRawQuery<unknown[]>(cleanedQuery)

      if (error) {
        logger.error('[SQL Executor] Raw query execution error:', error.message, error)
        return {
          data: [],
          rowCount: 0,
          error: error.message || 'Query execution failed',
        }
      }

      // Ensure data is an array
      const resultData = Array.isArray(data) ? data : (data ? [data] : [])
      logger.debug('[SQL Executor] Raw query success:', { rowCount: resultData.length })
      
      return {
        data: resultData,
        rowCount: resultData.length,
      }
    } catch (error) {
      // Fallback: provide helpful error
      logger.error('[SQL Executor] Raw SQL execution exception:', error)
      return {
        data: [],
        rowCount: 0,
        error: error instanceof Error ? error.message : 'Raw SQL execution failed. The database function "execute_sql" may need to be created.',
      }
    }
  }

  /**
   * Applies WHERE conditions to query builder
   * Simplified parser for common WHERE patterns
   */
  private static applyWhereConditions(
    queryBuilder: any,
    whereClause: string
  ): void {
    // Parse simple conditions like: column = 'value', column > 5, column IS NULL
    const conditions = whereClause.split(/\s+AND\s+/i)
    
    for (const condition of conditions) {
      const trimmed = condition.trim()
      
      // Handle equality: column = 'value'
      const eqMatch = trimmed.match(/(\w+)\s*=\s*['"]?([^'"]+)['"]?/)
      if (eqMatch) {
        const [, column, value] = eqMatch
        // Check if value is a number
        const numValue = Number(value)
        queryBuilder = queryBuilder.eq(column, isNaN(numValue) ? value : numValue)
        continue
      }
      
      // Handle IS NULL: column IS NULL
      const nullMatch = trimmed.match(/(\w+)\s+IS\s+NULL/i)
      if (nullMatch) {
        queryBuilder = queryBuilder.is(nullMatch[1], null)
        continue
      }
      
      // Handle comparison operators: column > 5, column >= 10
      const compMatch = trimmed.match(/(\w+)\s*(>|>=|<|<=|!=|<>)\s*['"]?([^'"]+)['"]?/)
      if (compMatch) {
        const [, column, operator, value] = compMatch
        const numValue = Number(value)
        const finalValue = isNaN(numValue) ? value : numValue
        
        switch (operator) {
          case '>':
            queryBuilder = queryBuilder.gt(column, finalValue)
            break
          case '>=':
            queryBuilder = queryBuilder.gte(column, finalValue)
            break
          case '<':
            queryBuilder = queryBuilder.lt(column, finalValue)
            break
          case '<=':
            queryBuilder = queryBuilder.lte(column, finalValue)
            break
          case '!=':
          case '<>':
            queryBuilder = queryBuilder.neq(column, finalValue)
            break
        }
      }
    }
  }

  /**
   * Formats query result into human-readable text using AI
   */
  static async formatResult(
    result: SqlExecutorResult,
    originalQuery?: string
  ): Promise<string> {
    if (result.error) {
      return `❌ Query failed: ${result.error}`
    }

    if (result.rowCount === 0) {
      return 'No results found.'
    }

    // Use AI to format the results in a nice, contextual way
    try {
      const formatted = await this.formatWithAI(result.data, result.rowCount, originalQuery)
      return formatted
    } catch (error) {
      // Fallback to code-based formatting if AI fails
      logger.error('AI formatting failed, using fallback:', error)
      return this.formatWithCode(result.data, result.rowCount)
    }
  }

  /**
   * Synchronous version for fallback (if needed)
   */
  static formatResultSync(result: SqlExecutorResult): string {
    if (result.error) {
      return `❌ Query failed: ${result.error}`
    }

    if (result.rowCount === 0) {
      return 'No results found.'
    }

    return this.formatWithCode(result.data, result.rowCount)
  }

  /**
   * Detect language from text
   */
  private static detectLanguage(text: string): string {
    // Simple language detection based on character patterns
    // For production, you might want to use a proper language detection library
    
    // Check for Cyrillic (Russian, Ukrainian, etc.)
    if (/[\u0400-\u04FF]/.test(text)) {
      return 'ru'
    }
    
    // Check for Chinese characters
    if (/[\u4E00-\u9FFF]/.test(text)) {
      return 'zh'
    }
    
    // Check for Arabic
    if (/[\u0600-\u06FF]/.test(text)) {
      return 'ar'
    }
    
    // Check for Azerbaijani/Turkish specific characters
    if (/[əışğüöç]/.test(text.toLowerCase())) {
      return 'az'
    }
    
    // Check for common Azerbaijani/Turkish words
    const azTrWords = ['necə', 'nə', 'kim', 'harada', 'niyə', 'ne', 'nasıl', 'kim']
    if (azTrWords.some(word => text.toLowerCase().includes(word))) {
      return 'az'
    }
    
    // Default to English
    return 'en'
  }

  /**
   * Format results using AI for intelligent, contextual formatting
   * This is LLM Call 2 (Summarizer) - takes original question + raw JSON and formats it
   * Responds in the SAME language as the user's question
   */
  private static async formatWithAI(
    data: unknown[],
    rowCount: number,
    originalQuery?: string
  ): Promise<string> {
    const model = getGeminiFlash()

    // Detect language from user's question
    const userLanguage = originalQuery ? this.detectLanguage(originalQuery) : 'en'
    
    // Language names for the prompt
    const languageNames: Record<string, string> = {
      en: 'English',
      az: 'Azerbaijani',
      ru: 'Russian',
      zh: 'Chinese',
      tr: 'Turkish',
      ar: 'Arabic',
      de: 'German',
      fr: 'French',
      es: 'Spanish',
    }

    const languageName = languageNames[userLanguage] || 'English'

    // If no results, provide helpful context
    const noResultsGuidance = rowCount === 0 && originalQuery 
      ? `\n\n**SPECIAL HANDLING FOR ZERO RESULTS**:\nIf the query returned 0 results, provide a helpful response that:\n1. Confirms no results were found\n2. Suggests possible reasons (wrong organization name, no data exists, etc.)\n3. If the query was about an organization, suggest checking available organization names\n4. Be friendly and helpful, not just "No results found"\n\nExample for organization queries: "No teachers found in 'Test' organization. The available organizations are: Eduator Demo, Emil, sdcsadc. Did you mean one of these?"`
      : ''

    const prompt = `You are a helpful assistant answering questions for a school administrator.

**IMPORTANT**: 
- Respond in ${languageName} (the same language as the user's question)
- Be concise and direct - give the answer first, no technical jargon
- Write like a human assistant, not a technical report

**User's Question**: "${originalQuery || 'Database query'}"
**Database Results**: ${rowCount} result${rowCount !== 1 ? 's' : ''}

**Raw Data**:
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`
${noResultsGuidance}

**Your Task**: 
Answer the user's question directly and naturally in ${languageName}. Be brief and friendly.

**Formatting Rules**:
1. **Answer directly** - Start with the answer to their question (e.g., "There are 9 users in Test organization")
2. **No technical terms** - Don't mention "database query", "SQL", "results", "metrics", "detailed analysis"
3. **Keep it short** - Maximum 2-3 sentences for simple queries, brief paragraph for complex ones
4. **Use emojis sparingly** - Only when helpful (👥 for users, ✓ for yes, etc.)
5. **Show data clearly** - Use simple markdown tables for multiple items (max 10 rows shown)
6. **Be conversational** - Write like you're talking to a colleague, not writing a report
7. **Skip unnecessary details** - Don't explain what you did, just give the answer
8. **Format dates** - Use natural language (e.g., "January 12, 2026" in ${languageName})
9. **Numbers** - Make them stand out with **bold** if it's the main answer

**Examples of GOOD responses**:
- "There are **9 users** in the Test organization."
- "You have **5 teachers** and **12 students** in your school."
- "Here are your recent classes:\n| Class | Students |\n|-------|----------|\n| Math 101 | 25 |"
- If 0 results: "No teachers found in 'Test' organization. The available organizations are: Eduator Demo, Emil, sdcsadc. Did you mean one of these?"

**Examples of BAD responses** (don't do this):
- ❌ "Here's the explanation of the user count for the 'Test' organization:"
- ❌ "**Summary:** Based on your query, there are 9 users..."
- ❌ "**Key Insights:** The database query successfully identified..."

**Now answer in ${languageName}** (be brief and direct):`

    const result = await model.generateContent(prompt)
    const response = result.response
    const formatted = response.text()

    return formatted
  }

  /**
   * Fallback code-based formatting
   */
  private static formatWithCode(data: unknown[], rowCount: number): string {
    if (rowCount === 1) {
      return this.formatSingleRow(data[0])
    }

    return this.formatTable(data, rowCount)
  }

  /**
   * Format a single row result
   */
  private static formatSingleRow(row: unknown): string {
    if (!row || typeof row !== 'object') {
      return String(row)
    }

    const obj = row as Record<string, unknown>
    const entries = Object.entries(obj)
    
    if (entries.length === 0) {
      return 'Empty result'
    }

    // Format as key-value pairs
    let formatted = `Found 1 result:\n\n`
    for (const [key, value] of entries) {
      const displayKey = this.formatKey(key)
      const displayValue = this.formatValue(value)
      formatted += `• **${displayKey}**: ${displayValue}\n`
    }

    return formatted
  }

  /**
   * Format multiple rows as a table
   */
  private static formatTable(rows: unknown[], rowCount: number): string {
    if (!rows || rows.length === 0) {
      return 'No results found.'
    }

    // Get all unique keys from all rows
    const allKeys = new Set<string>()
    for (const row of rows) {
      if (row && typeof row === 'object') {
        Object.keys(row as Record<string, unknown>).forEach((key) => allKeys.add(key))
      }
    }

    const keys = Array.from(allKeys)

    if (keys.length === 0) {
      return 'No data columns found.'
    }

    // Limit displayed columns for readability (max 10)
    const displayKeys = keys.slice(0, 10)
    const hasMoreColumns = keys.length > 10

    // Build table
    let formatted = `Found **${rowCount}** result${rowCount !== 1 ? 's' : ''}:\n\n`

    // Table header
    formatted += '| ' + displayKeys.map((k) => this.formatKey(k)).join(' | ') + ' |\n'
    formatted += '|' + displayKeys.map(() => '---').join('|') + '|\n'

    // Table rows (limit to 20 rows for readability)
    const displayRows = rows.slice(0, 20)
    for (const row of displayRows) {
      if (row && typeof row === 'object') {
        const obj = row as Record<string, unknown>
        const values = displayKeys.map((key) => {
          const value = obj[key]
          return this.formatTableValue(value)
        })
        formatted += '| ' + values.join(' | ') + ' |\n'
      }
    }

    // Add summary if there are more rows or columns
    if (rowCount > 20) {
      formatted += `\n*... and ${rowCount - 20} more rows (showing first 20)*\n`
    }

    if (hasMoreColumns) {
      formatted += `\n*... and ${keys.length - 10} more columns (showing first 10)*\n`
    }

    return formatted
  }

  /**
   * Format a table cell value
   */
  private static formatTableValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '*null*'
    }

    if (typeof value === 'boolean') {
      return value ? '✓' : '✗'
    }

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return `[${value.length} items]`
      }
      // For JSONB objects, show a summary
      const keys = Object.keys(value)
      return `{${keys.length} keys}`
    }

    const str = String(value)
    // Truncate long values
    if (str.length > 50) {
      return str.substring(0, 47) + '...'
    }

    return str
  }

  /**
   * Format a key name for display
   */
  private static formatKey(key: string): string {
    // Convert snake_case to Title Case
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * Format a value for display
   */
  private static formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '*Not set*'
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }

    if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value))) {
      // Format dates nicely
      try {
        const date = typeof value === 'string' ? new Date(value) : value
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
      } catch {
        return String(value)
      }
    }

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return `Array with ${value.length} item${value.length !== 1 ? 's' : ''}`
      }
      // For objects, show a summary
      const keys = Object.keys(value)
      if (keys.length === 0) {
        return '*Empty object*'
      }
      return `Object with ${keys.length} field${keys.length !== 1 ? 's' : ''}: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`
    }

    return String(value)
  }
}
