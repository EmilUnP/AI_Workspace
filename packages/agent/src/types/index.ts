import type { Profile } from '@eduator/core/types/profile'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Agent configuration options
 */
export interface AgentOptions {
  /** Current user's UUID */
  userId: string
  /** User's profile type */
  profileType: 'platform_owner' | 'school_superadmin'
  /** Organization ID (null for platform owners) */
  organizationId: string | null
  /** Optional Supabase client (uses admin client if not provided) */
  supabaseClient?: SupabaseClient
}

/**
 * User context extracted from request
 */
export interface UserContext {
  userId: string
  profileType: 'platform_owner' | 'school_superadmin'
  organizationId: string | null
  profile?: Profile
}

/**
 * Agent process options
 */
export interface ProcessOptions {
  /** User's query/message (text input) */
  message?: string
  /** Audio input (Buffer, base64 string, or ArrayBuffer) */
  audio?: Buffer | string | ArrayBuffer
  /** Audio MIME type (e.g., 'audio/wav', 'audio/mpeg') */
  audioMimeType?: string
  /** Language code for STT (e.g., 'en-US', 'az-AZ') */
  audioLanguageCode?: string
  /** Optional conversation ID for context */
  conversationId?: string
  /** Include tool execution metadata in response */
  includeMetadata?: boolean
  /** Show SQL queries in response */
  showSql?: boolean
}

/**
 * Agent response
 */
export interface AgentResponse {
  /** Human-readable response text (AI-formatted explanation) */
  text: string
  /** Raw JSON data from database (for charts/tables in frontend) */
  rawData?: unknown[]
  /** Row count */
  rowCount?: number
  /** Tools that were executed (if any) */
  toolCalls?: ToolCall[]
  /** SQL query executed (if any, only if showSql=true) */
  sqlQuery?: string
  /** Error message (if any) */
  error?: string
  /** Progress information for multi-step operations */
  progress?: ProgressInfo
}

/**
 * Tool call information
 */
export interface ToolCall {
  /** Tool name that was called */
  tool: string
  /** Parameters passed to the tool */
  parameters: Record<string, unknown>
  /** Tool execution result */
  result?: unknown
  /** Error if tool failed */
  error?: string
}

/**
 * Progress item for multi-step operations
 */
export interface ProgressItem {
  /** Tool name */
  tool: string
  /** Human-readable description of what this step does */
  description: string
  /** Current status */
  status: 'pending' | 'executing' | 'completed' | 'failed'
  /** Error message if failed */
  error?: string
}

/**
 * Progress information for multi-step operations
 */
export interface ProgressInfo {
  /** List of steps to be executed */
  steps: ProgressItem[]
  /** Current step index (0-based) */
  currentStep?: number
  /** Total number of steps */
  totalSteps: number
  /** Whether the operation is in progress */
  inProgress: boolean
}

/**
 * SQL executor options
 */
export interface SqlExecutorOptions {
  /** SQL query to execute (SELECT only) */
  query: string
  /** User context for RLS */
  context: UserContext
  /** Supabase client */
  client: SupabaseClient
}

/**
 * SQL executor result
 */
export interface SqlExecutorResult {
  /** Query result data */
  data: unknown[]
  /** Number of rows returned */
  rowCount: number
  /** Error if query failed */
  error?: string
}

/**
 * Action tool result
 */
export interface ActionToolResult {
  /** Success status */
  success: boolean
  /** Result data */
  data?: unknown
  /** Error message if failed */
  error?: string
  /** Tool-specific metadata */
  metadata?: Record<string, unknown>
}

/**
 * Intent classification result
 */
export interface IntentClassification {
  /** Detected intent type */
  intent: 'inquiry' | 'action' | 'conversation'
  /** Confidence score (0-1) */
  confidence: number
  /** Relevant tool names (if action) */
  tools?: string[]
  /** Suggested SQL query (if inquiry) */
  suggestedSql?: string
}

/**
 * Database table metadata
 */
export interface TableMetadata {
  /** Table name */
  name: string
  /** Table description */
  description?: string
  /** Column names */
  columns: string[]
  /** Key relationships */
  relationships?: Array<{
    table: string
    foreignKey: string
    type: 'one-to-one' | 'one-to-many' | 'many-to-many'
  }>
}
