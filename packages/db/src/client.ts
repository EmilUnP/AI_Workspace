import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

let dbClient: SupabaseClient | null = null

/**
 * Get a Supabase client for database operations
 * This client uses the service role key for server-side operations
 */
export function getDbClient(): SupabaseClient {
  if (dbClient) return dbClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for database client')
  }

  dbClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return dbClient
}

/**
 * Execute a raw SQL query
 * Only use for complex queries that can't be done with the Supabase client
 */
export async function executeRawQuery<T = unknown>(
  query: string,
  params?: unknown[]
): Promise<{ data: T | null; error: Error | null }> {
  const supabase = getDbClient()

  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      query_text: query,
      query_params: params,
    })

    if (error) throw error

    return { data: data as T, error: null }
  } catch (error) {
    console.error('Raw query error:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Create a transaction-like batch of operations
 * Note: Supabase doesn't support true transactions, this is a best-effort approach
 */
export async function batchOperations<T>(
  operations: Array<() => Promise<T>>
): Promise<{ results: T[]; errors: Error[] }> {
  const results: T[] = []
  const errors: Error[] = []

  for (const operation of operations) {
    try {
      const result = await operation()
      results.push(result)
    } catch (error) {
      errors.push(error as Error)
    }
  }

  return { results, errors }
}
