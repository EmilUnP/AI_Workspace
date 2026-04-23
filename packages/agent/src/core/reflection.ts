import type { UserContext } from '../types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SqlExecutor } from '../executor/sql'
import { generateJSON } from '@eduator/ai/gemini'
import { SQL_GENERATION_PROMPT } from '../prompts'
import { DATABASE_SCHEMA } from '../prompts/database-schema'
import { SchemaLoader } from './schema-loader'
import { logger } from '../logger'

/**
 * Reflection/Retry configuration
 */
export interface ReflectionConfig {
  /** Maximum number of retry attempts */
  maxRetries: number
  /** Whether to enable critic/review step before execution */
  enableCritic: boolean
  /** Whether to include schema context in prompts */
  includeSchema: boolean
}

/**
 * Default reflection configuration
 */
export const DEFAULT_REFLECTION_CONFIG: ReflectionConfig = {
  maxRetries: 3,
  enableCritic: true,
  includeSchema: true,
}

/**
 * SQL generation attempt with error history
 */
export interface SQLGenerationAttempt {
  attempt: number
  query: string
  explanation?: string
  error?: string
  timestamp: Date
}

/**
 * Reflection result
 */
export interface ReflectionResult {
  query: string
  explanation: string
  attempts: SQLGenerationAttempt[]
  success: boolean
  finalError?: string
}

/**
 * Error category for intelligent error handling
 */
export enum ErrorCategory {
  TABLE_NOT_FOUND = 'table_not_found',
  COLUMN_NOT_FOUND = 'column_not_found',
  SYNTAX_ERROR = 'syntax_error',
  TYPE_MISMATCH = 'type_mismatch',
  MISSING_JOIN = 'missing_join',
  PERMISSION_DENIED = 'permission_denied',
  INVALID_REFERENCE = 'invalid_reference',
  OTHER = 'other',
}

/**
 * Categorize error for targeted fixes
 */
function categorizeError(error: string): ErrorCategory {
  const lowerError = error.toLowerCase()
  
  if (lowerError.includes('does not exist') || lowerError.includes('relation') || lowerError.includes('table')) {
    if (lowerError.includes('column') || lowerError.includes('attribute')) {
      return ErrorCategory.COLUMN_NOT_FOUND
    }
    return ErrorCategory.TABLE_NOT_FOUND
  }
  
  // Check for syntax errors (including JOIN syntax errors)
  if (lowerError.includes('syntax') || lowerError.includes('parse') || lowerError.includes('invalid')) {
    // Check if it's a JOIN-related syntax error
    if (lowerError.includes('created_by') || lowerError.includes('organization_id') || lowerError.includes('join') || lowerError.includes('near')) {
      return ErrorCategory.MISSING_JOIN
    }
    return ErrorCategory.SYNTAX_ERROR
  }
  
  if (lowerError.includes('type') || lowerError.includes('cannot') || lowerError.includes('cast')) {
    return ErrorCategory.TYPE_MISMATCH
  }
  
  if (lowerError.includes('join') || lowerError.includes('ambiguous') || lowerError.includes('missing') || lowerError.includes('at or near')) {
    return ErrorCategory.MISSING_JOIN
  }
  
  if (lowerError.includes('permission') || lowerError.includes('denied') || lowerError.includes('access')) {
    return ErrorCategory.PERMISSION_DENIED
  }
  
  if (lowerError.includes('foreign key') || lowerError.includes('reference') || lowerError.includes('constraint')) {
    return ErrorCategory.INVALID_REFERENCE
  }
  
  return ErrorCategory.OTHER
}

/**
 * Reflection-based SQL generation with retry loop
 * 
 * This implements the "Reflection Pattern" where:
 * 1. Generate: LLM produces SQL
 * 2. Execute: Try to run it
 * 3. Catch: If it fails, capture error and categorize it
 * 4. Reflect: Feed categorized error + history back to LLM with targeted guidance
 * 5. Repeat: LLM provides corrected SQL based on error category
 */
export class SQLReflection {
  private config: ReflectionConfig
  private context: UserContext
  private client: SupabaseClient
  private successfulPatterns: Set<string> = new Set() // Track successful query patterns
  private schemaLoader: SchemaLoader

  constructor(
    context: UserContext,
    client: SupabaseClient,
    config: Partial<ReflectionConfig> = {}
  ) {
    this.context = context
    this.client = client
    this.config = { ...DEFAULT_REFLECTION_CONFIG, ...config }
    this.schemaLoader = new SchemaLoader(client)
  }

  /**
   * Generate and execute SQL with reflection loop
   */
  async generateAndExecute(
    message: string,
    initialQuery?: string
  ): Promise<ReflectionResult> {
    const attempts: SQLGenerationAttempt[] = []
    let currentQuery = initialQuery
    let lastError: string | undefined

    // Build schema context - use static schema (comprehensive and accurate)
    // Note: Dynamic schema fetching is disabled because information_schema queries
    // are blocked by the execute_sql RPC function. The static schema has been
    // updated with actual database structure verified via MCP Supabase.
    let schemaContext = ''
    if (this.config.includeSchema) {
      // Use static schema which has been verified against actual database
      // This is more reliable than trying to query information_schema
      schemaContext = DATABASE_SCHEMA
      logger.debug('[SQL Reflection] Using verified static database schema')
    }

    // If we have an initial query (from intent classification), create an attempt entry
    if (initialQuery && attempts.length === 0) {
      attempts.push({
        attempt: 1,
        query: initialQuery,
        explanation: 'Query from intent classification',
        timestamp: new Date(),
      })
    }

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Generate SQL if we don't have one or if previous attempt failed
        if (!currentQuery || lastError) {
          logger.debug(`[SQL Reflection] Attempt ${attempt}/${this.config.maxRetries}: Generating SQL...`)
          
          const generationResult = await this.generateSQLWithReflection(
            message,
            attempts,
            schemaContext
          )
          
          currentQuery = generationResult.query
          attempts.push({
            attempt,
            query: currentQuery,
            explanation: generationResult.explanation,
            timestamp: new Date(),
          })
        }

        // Critic step: Review SQL before execution (on first attempt)
        if (this.config.enableCritic && attempt === 1) {
          logger.debug('[SQL Reflection] Running critic review...')
          const criticResult = await this.reviewSQL(currentQuery, message, schemaContext)
          
          if (!criticResult.approved) {
            logger.debug('[SQL Reflection] Critic rejected query:', criticResult.reason)
            
            // If critic provided a suggested fix, use it
            if (criticResult.suggestedFix) {
              logger.debug('[SQL Reflection] Using critic\'s suggested fix')
              currentQuery = criticResult.suggestedFix
              // Update the last attempt's query and ensure explanation exists
              if (attempts.length > 0) {
                attempts[attempts.length - 1].query = currentQuery
                // Ensure explanation exists (use critic's reason if available)
                if (!attempts[attempts.length - 1].explanation) {
                  attempts[attempts.length - 1].explanation = criticResult.reason || 'Query corrected by critic'
                }
              }
              // Don't set error, just update query and continue to execution
            } else {
              lastError = criticResult.reason || 'Query rejected by critic'
              // Ensure we have an attempt entry before setting error
              if (attempts.length > 0) {
                attempts[attempts.length - 1].error = lastError
              } else {
                attempts.push({
                  attempt,
                  query: currentQuery || '',
                  error: lastError,
                  timestamp: new Date(),
                })
              }
              continue // Retry with feedback
            }
          }
        }

        // Execute SQL
        logger.debug(`[SQL Reflection] Attempt ${attempt}: Executing query...`)
        const result = await SqlExecutor.execute({
          query: currentQuery,
          context: this.context,
          client: this.client,
        })

        if (result.error) {
          lastError = result.error
          const errorCategory = categorizeError(result.error)
          attempts[attempts.length - 1].error = lastError
          logger.debug(`[SQL Reflection] Attempt ${attempt} failed:`, {
            error: lastError,
            category: errorCategory,
          })
          
          // Continue to next attempt if we have retries left
          if (attempt < this.config.maxRetries) {
            currentQuery = undefined // Force regeneration with categorized error
            continue
          }
        } else {
          // Success! Track successful pattern
          const queryPattern = this.extractQueryPattern(currentQuery)
          if (queryPattern) {
            this.successfulPatterns.add(queryPattern)
          }
          
          logger.debug(`[SQL Reflection] Attempt ${attempt} succeeded!`)
          
          // Ensure we have an attempt entry with explanation
          const lastAttempt = attempts[attempts.length - 1]
          if (!lastAttempt) {
            // Create attempt entry if it doesn't exist (shouldn't happen, but safety check)
            attempts.push({
              attempt,
              query: currentQuery,
              explanation: 'Query executed successfully',
              timestamp: new Date(),
            })
          } else if (!lastAttempt.explanation) {
            // Ensure explanation exists
            lastAttempt.explanation = 'Query executed successfully'
          }
          
          return {
            query: currentQuery,
            explanation: attempts[attempts.length - 1].explanation || 'Query executed successfully',
            attempts,
            success: true,
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`[SQL Reflection] Attempt ${attempt} exception:`, lastError)
        
        if (attempts.length > 0) {
          attempts[attempts.length - 1].error = lastError
        } else {
          attempts.push({
            attempt,
            query: currentQuery || '',
            error: lastError,
            timestamp: new Date(),
          })
        }

        if (attempt < this.config.maxRetries) {
          currentQuery = undefined // Force regeneration
          continue
        }
      }
    }

    // All attempts failed
    return {
      query: currentQuery || '',
      explanation: 'Failed to generate valid SQL after multiple attempts',
      attempts,
      success: false,
      finalError: lastError,
    }
  }

  /**
   * Extract query pattern for learning (simplified structure)
   */
  private extractQueryPattern(query: string): string | null {
    try {
      // Extract key components: tables, main operation
      const tables = query.match(/FROM\s+(\w+)/gi) || []
      const joins = query.match(/JOIN\s+(\w+)/gi) || []
      const hasCount = /COUNT/i.test(query)
      const hasWhere = /WHERE/i.test(query)
      
      const pattern = [
        tables.map(t => t.replace(/FROM\s+/i, '')).join(','),
        joins.map(j => j.replace(/JOIN\s+/i, '')).join(','),
        hasCount ? 'COUNT' : 'SELECT',
        hasWhere ? 'WHERE' : 'NO_WHERE',
      ].join('|')
      
      return pattern || null
    } catch {
      return null
    }
  }

  /**
   * Generate SQL with reflection on previous errors
   * Enhanced with error categorization and targeted guidance
   */
  private async generateSQLWithReflection(
    message: string,
    previousAttempts: SQLGenerationAttempt[],
    schemaContext: string
  ): Promise<{ query: string; explanation: string }> {
    const context = JSON.stringify({
      profileType: this.context.profileType,
      organizationId: this.context.organizationId,
    })

    // Build reflection prompt
    let reflectionPrompt = SQL_GENERATION_PROMPT.replace('{question}', message)
      .replace('{context}', context)

    // Add schema context if provided (actual schema + static docs)
    if (schemaContext) {
      // Schema context already includes both actual schema and static docs
      reflectionPrompt = `${schemaContext}\n\n${reflectionPrompt}`
    }

      // Add error history with categorization if we have previous attempts
      if (previousAttempts.length > 0) {
        const errorHistory = previousAttempts
          .filter(a => a.error)
          .map(a => {
            const category = categorizeError(a.error || '')
            return {
              attempt: a.attempt,
              query: a.query,
              error: a.error,
              category,
            }
          })

        // Note: hasNoResultsError could be used for special handling of 0-result cases
        // Currently not used but kept for future enhancement

      // Group errors by category for better analysis
      const errorsByCategory = new Map<ErrorCategory, typeof errorHistory>()
      errorHistory.forEach(err => {
        if (!errorsByCategory.has(err.category)) {
          errorsByCategory.set(err.category, [])
        }
        errorsByCategory.get(err.category)!.push(err)
      })

      // Build targeted guidance based on error categories
      let categoryGuidance = ''
      if (errorsByCategory.has(ErrorCategory.TABLE_NOT_FOUND)) {
        categoryGuidance += `\n**CRITICAL: Table Not Found Errors Detected**\n`
        categoryGuidance += `- The database does NOT have "users", "teachers", or "students" tables\n`
        categoryGuidance += `- ALL users are in the "profiles" table\n`
        categoryGuidance += `- Use: SELECT * FROM profiles WHERE profile_type = 'teacher' (NOT FROM teachers)\n`
        categoryGuidance += `- Use: SELECT * FROM profiles WHERE profile_type = 'student' (NOT FROM students)\n`
      }
      
      if (errorsByCategory.has(ErrorCategory.COLUMN_NOT_FOUND)) {
        categoryGuidance += `\n**CRITICAL: Column Not Found Errors Detected**\n`
        categoryGuidance += `- The profiles table uses "profile_type" (NOT "role")\n`
        categoryGuidance += `- The profiles table uses "full_name" (NOT "name")\n`
        categoryGuidance += `- The profiles table has "organization_id" (UUID), NOT "organization_name"\n`
        categoryGuidance += `- To get organization name, JOIN with organizations table: JOIN organizations o ON p.organization_id = o.id\n`
      }
      
      if (errorsByCategory.has(ErrorCategory.MISSING_JOIN)) {
        categoryGuidance += `\n**CRITICAL: Missing JOIN or JOIN Syntax Errors Detected**\n`
        categoryGuidance += `- Always use proper JOIN syntax: FROM table1 alias1 JOIN table2 alias2 ON alias1.column = alias2.column\n`
        categoryGuidance += `- When querying by organization name, you MUST JOIN: FROM profiles p JOIN organizations o ON p.organization_id = o.id\n`
        categoryGuidance += `- When querying exams/lessons by teacher email, JOIN: FROM exams e JOIN profiles p ON e.created_by = p.id\n`
        categoryGuidance += `- When querying classes with teacher info, JOIN: FROM classes c LEFT JOIN profiles p ON c.teacher_id = p.id\n`
        categoryGuidance += `- When querying enrollments, JOIN: FROM class_enrollments ce JOIN profiles p ON ce.student_id = p.id\n`
        categoryGuidance += `- **CRITICAL**: Use table aliases (e, p, l) and always use JOIN keyword, not comma-separated tables\n`
        categoryGuidance += `- **CRITICAL**: If error says "syntax error at or near 'created_by'", check JOIN syntax and table aliases\n`
      }
      
      if (errorsByCategory.has(ErrorCategory.TYPE_MISMATCH)) {
        categoryGuidance += `\n**CRITICAL: Type Mismatch Errors Detected**\n`
        categoryGuidance += `- organization_id is UUID type, use: WHERE organization_id = 'uuid-string'\n`
        categoryGuidance += `- profile_type is VARCHAR, use: WHERE profile_type = 'teacher' (with quotes)\n`
        categoryGuidance += `- Check that UUIDs are properly quoted as strings\n`
      }

      const errorHistoryText = errorHistory
        .map(e => `Attempt ${e.attempt} (${e.category}):\nQuery: ${e.query}\nError: ${e.error}`)
        .join('\n\n')

      reflectionPrompt += `\n\n## 🔄 REFLECTION: Previous Attempts Failed\n\nYour previous action(s) resulted in error(s). **CRITICALLY ANALYZE** why they failed and provide a corrected SQL command.\n\n**Error History:**\n${errorHistoryText}\n\n${categoryGuidance}\n\n**Step-by-Step Fix Process:**\n1. **Read the error message carefully** - it tells you exactly what's wrong\n2. **Identify the error category** from the history above\n3. **Review the database schema** - verify table names, column names, and relationships\n4. **Check the targeted guidance** above for your error category\n5. **Apply the fix** - correct table names, add JOINs, fix column names, fix types\n6. **Verify the query structure** - ensure it matches the schema exactly\n7. **Test your logic** - does the corrected query answer: "${message}"?\n\n**Common Fixes:**\n- ❌ FROM users → ✅ FROM profiles\n- ❌ FROM teachers → ✅ FROM profiles WHERE profile_type = 'teacher'\n- ❌ WHERE role = 'teacher' → ✅ WHERE profile_type = 'teacher'\n- ❌ profiles.name → ✅ profiles.full_name OR o.name (if joined with organizations)\n- ❌ profiles.organization_name → ✅ o.name (after JOIN organizations o ON p.organization_id = o.id)\n- ❌ Missing JOIN when querying by organization name → ✅ Add JOIN organizations\n- ❌ WHERE o.name = 'Test' → ✅ WHERE o.name ILIKE '%Test%' (use ILIKE for case-insensitive matching)\n\n**CRITICAL**: Generate a corrected SQL query that:\n- Uses correct table names (profiles, not users/teachers/students)\n- Uses correct column names (profile_type, not role; full_name, not name)\n- Includes proper JOINs when needed\n- **Uses ILIKE (not =) when filtering by organization name** for case-insensitive matching\n- Matches the database schema exactly\n- Answers the user's original question: "${message}"`
    }

    const { data } = await generateJSON<{ query: string; explanation: string }>(
      reflectionPrompt,
      { model: 'flash' }
    )

    return data
  }

  /**
   * Critic step: Review SQL before execution
   * Enhanced with more thorough validation and pattern matching
   * Now uses actual database schema for validation
   */
  private async reviewSQL(
    query: string,
    originalMessage: string,
    schemaContext: string
  ): Promise<{ approved: boolean; reason?: string; suggestedFix?: string }> {
    // Quick pattern-based checks first (fast, validates against actual schema)
    const quickChecks = await this.performQuickChecks(query)
    if (!quickChecks.approved) {
      return quickChecks
    }

    // Then use LLM for deeper analysis
    const criticPrompt = `You are an expert SQL query critic with deep knowledge of PostgreSQL and the Eduator database schema. Your job is to catch errors BEFORE they hit the database.

**Original User Question:** "${originalMessage}"

**Proposed SQL Query:**
\`\`\`sql
${query}
\`\`\`

**Database Schema Context:**
${schemaContext || 'See system prompts for schema information'}

**IMPORTANT**: The schema above is fetched from the ACTUAL database. Use it to verify:
- Table names exist
- Column names exist
- Data types are correct
- Foreign key relationships are correct

**Your Task:**
Perform a comprehensive review of this SQL query. Be thorough but not overly strict.

**Validation Checklist (Check ALL):**
1. **Table Names**: 
   - ❌ Does it use "users", "teachers", or "students"? → Should use "profiles"
   - ✅ Does it use correct table names from schema?

2. **Column Names**:
   - ❌ Does it use "role" column? → Should use "profile_type"
   - ❌ Does it use "name" for profiles? → Should use "full_name"
   - ❌ Does it reference "organization_name" in profiles? → Should JOIN organizations and use "o.name"
   - ✅ Do all column names exist in the referenced tables?

3. **JOINs**:
   - ❌ When querying by organization name, is there a JOIN with organizations?
   - ❌ When querying classes with teacher info, is there a JOIN with profiles?
   - ✅ Are JOINs properly structured with correct ON conditions?

4. **Data Types**:
   - ✅ Are UUIDs properly quoted as strings?
   - ✅ Are string values properly quoted?
   - ✅ Are boolean values using true/false (not 1/0)?

5. **Security**:
   - ✅ Is it a SELECT-only query? (No INSERT, UPDATE, DELETE, DROP, etc.)

6. **Logic**:
   - ✅ Does the query answer the user's question: "${originalMessage}"?
   - ✅ Are WHERE clauses appropriate?
   - ✅ Are filters correct (is_active, approval_status, etc.)?

7. **Schema Compliance**:
   - ✅ Does it match the actual database structure?
   - ✅ Are foreign key relationships respected?

**Common Mistakes to Catch:**
- Using "users" table (doesn't exist) → Use "profiles"
- Using "role" column (doesn't exist) → Use "profile_type"
- Missing JOIN when querying organization name
- Using "name" instead of "full_name" for profiles
- Using "organization_name" in profiles (doesn't exist) → JOIN organizations

**Respond with JSON:**
{
  "approved": true | false,
  "reason": "Detailed explanation. If approved, briefly confirm. If rejected, explain ALL issues found.",
  "suggestedFix": "If rejected, provide a corrected SQL query that fixes ALL identified issues"
}

**Be strict but fair. Approve if the query is correct. Reject only if there are clear, fixable issues.**`

    try {
      const { data } = await generateJSON<{
        approved: boolean
        reason?: string
        suggestedFix?: string
      }>(criticPrompt, { model: 'flash' })

      // If critic suggests a fix, use it
      if (!data.approved && data.suggestedFix) {
        logger.debug('[SQL Reflection] Critic provided suggested fix')
        return {
          approved: false,
          reason: data.reason,
          suggestedFix: data.suggestedFix,
        }
      }

      return {
        approved: data.approved,
        reason: data.reason,
      }
    } catch (error) {
      // If critic fails, approve by default (fail open)
      logger.warn('[SQL Reflection] Critic review failed, approving by default:', error)
      return { approved: true }
    }
  }

  /**
   * Quick pattern-based checks (fast, no LLM)
   * Enhanced with actual schema validation
   */
  private async performQuickChecks(query: string): Promise<{ approved: boolean; reason?: string }> {
    const upperQuery = query.toUpperCase().trim()

    // Check for non-SELECT queries
    if (!upperQuery.startsWith('SELECT')) {
      return {
        approved: false,
        reason: 'Only SELECT queries are allowed',
      }
    }

    // Check for dangerous keywords (use word boundaries to avoid false positives)
    const dangerousKeywords = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE']
    for (const keyword of dangerousKeywords) {
      // Use word boundary regex to match only whole words, not substrings
      // This prevents false positives like "CREATED" or "CREATED_BY" matching "CREATE"
      const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'i')
      if (keywordRegex.test(query)) {
        return {
          approved: false,
          reason: `Query contains forbidden keyword: ${keyword}`,
        }
      }
    }

    // Extract table names from query
    const tableMatches = Array.from(query.matchAll(/\bFROM\s+(\w+)\b/gi))
    const tableNames = tableMatches.map(m => m[1].toLowerCase())
    const joinMatches = Array.from(query.matchAll(/\bJOIN\s+(\w+)\b/gi))
    const joinTables = joinMatches.map(m => m[1].toLowerCase())
    const allTables = [...new Set([...tableNames, ...joinTables])]

    // Validate tables exist in actual database
    for (const tableName of allTables) {
      const exists = await this.schemaLoader.tableExists(tableName)
      if (!exists) {
        // Check for common mistakes
        if (tableName === 'users' || tableName === 'user') {
          return {
            approved: false,
            reason: 'Table "users" does not exist. Use "profiles" table instead.',
          }
        }
        if (tableName === 'teachers' || tableName === 'teacher') {
          return {
            approved: false,
            reason: 'Table "teachers" does not exist. Use "profiles" with WHERE profile_type = \'teacher\' instead.',
          }
        }
        if (tableName === 'students' || tableName === 'student') {
          return {
            approved: false,
            reason: 'Table "students" does not exist. Use "profiles" with WHERE profile_type = \'student\' instead.',
          }
        }
        return {
          approved: false,
          reason: `Table "${tableName}" does not exist in the database.`,
        }
      }
    }

    // Check for common table name mistakes (pattern-based, fast)
    const tableMistakes = [
      { pattern: /\bFROM\s+users\b/i, fix: 'Use "profiles" table instead of "users"' },
      { pattern: /\bFROM\s+teachers\b/i, fix: 'Use "profiles" with WHERE profile_type = \'teacher\' instead of "teachers" table' },
      { pattern: /\bFROM\s+students\b/i, fix: 'Use "profiles" with WHERE profile_type = \'student\' instead of "students" table' },
    ]

    for (const mistake of tableMistakes) {
      if (mistake.pattern.test(query)) {
        return {
          approved: false,
          reason: mistake.fix,
        }
      }
    }

    // Check for common column mistakes
    const columnMistakes = [
      { pattern: /\bprofiles\.role\b/i, fix: 'Use "profile_type" instead of "role" column' },
      { pattern: /\bp\.role\b/i, fix: 'Use "profile_type" instead of "role" column' },
      { pattern: /\bWHERE\s+role\s*=/i, fix: 'Use "profile_type" instead of "role" column' },
    ]

    for (const mistake of columnMistakes) {
      if (mistake.pattern.test(query)) {
        return {
          approved: false,
          reason: mistake.fix,
        }
      }
    }

    return { approved: true }
  }
}
