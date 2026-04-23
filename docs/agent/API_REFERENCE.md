# API Reference

## Overview

The agent uses **agentic improvements** for inquiries: intent classification → "think first" understanding → SQL generation with schema context → critic review → execution → on error, reflection/retry (up to 3 times). See [ARCHITECTURE.md](./ARCHITECTURE.md) and `packages/agent/docs/AGENTIC_IMPROVEMENTS.md` for details.

## Agent

### `createAgent(options)`

Creates a new agent instance for **Agent Mode** (full CRUD operations).

**Parameters:**

```typescript
interface AgentOptions {
  userId: string                    // Current user's UUID
  profileType: 'platform_owner' | 'school_superadmin'
  organizationId: string | null     // null for platform owners
  supabaseClient?: SupabaseClient  // Optional, uses admin client if not provided
}
```

**Returns:** `Agent` instance

---

### `createThinkAgent(options)`

Creates a new Think Agent instance for **Think Mode** (read-only operations).

**Parameters:**

```typescript
interface AgentOptions {
  userId: string                    // Current user's UUID
  profileType: 'platform_owner' | 'school_superadmin'
  organizationId: string | null     // null for platform owners
  supabaseClient?: SupabaseClient  // Optional, uses admin client if not provided
}
```

**Returns:** `ThinkAgent` instance

**Note**: Think Mode only allows SELECT queries and blocks all write operations. Use Agent Mode for create/update/delete operations.

---

### `agent.process(options)`

Processes a user message and returns a response. Supports both text and audio input.

**Parameters:**

```typescript
interface ProcessOptions {
  message?: string                  // User's query/message (text input)
  audio?: Buffer | string | ArrayBuffer  // Audio input (automatically transcribed)
  audioMimeType?: string           // Audio MIME type (e.g., 'audio/wav', 'audio/webm')
  audioLanguageCode?: string       // Language code for STT (e.g., 'en-US', 'az-AZ')
  conversationId?: string          // Optional conversation ID for context (reserved)
  includeMetadata?: boolean        // Include tool execution metadata
  showSql?: boolean                // Include SQL query in response
}
```

**Note**: Either `message` or `audio` must be provided. If both are provided, `audio` takes precedence and is transcribed first.

**Returns:**

```typescript
interface AgentResponse {
  text: string                      // Human-readable response
  rawData?: unknown[]               // Raw JSON data from database (for charts/tables)
  rowCount?: number                 // Number of rows returned
  toolCalls?: ToolCall[]           // Tools that were executed
  sqlQuery?: string                // SQL query if executed (if showSql=true)
  error?: string                   // Error message if any
  progress?: ProgressInfo          // Progress information for multi-step operations (Agent Mode only)
}
```

### Progress Information

For multi-step operations in Agent Mode, the response includes progress tracking:

```typescript
interface ProgressInfo {
  steps: Array<{
    tool: string                   // Tool name (e.g., 'create_organization')
    description: string            // Human-readable description (e.g., 'Create organization')
    status: 'pending' | 'executing' | 'completed' | 'failed'
    error?: string                 // Error message if step failed
  }>
  currentStep?: number             // Index of currently executing step
  totalSteps: number               // Total number of steps
  inProgress: boolean             // Whether operation is still in progress
}
```

**Example Response with Progress:**

```typescript
{
  text: "✅ Successfully created organization...",
  progress: {
    steps: [
      { tool: 'create_organization', description: 'Create organization', status: 'completed' },
      { tool: 'create_user', description: 'Create user', status: 'completed' }
    ],
    currentStep: 1,
    totalSteps: 2,
    inProgress: false
  }
}
```

---

## Speech-to-Text (STT)

### `transcribeAudio(audio, options)`

Transcribes audio input to text. Used internally by the agent, but can also be used directly for transcription-only needs.

**Parameters:**

```typescript
interface STTOptions {
  languageCode?: string             // Language code (e.g., 'en-US', 'az-AZ')
  encoding?: 'LINEAR16' | 'FLAC' | 'OGG_OPUS' | 'MP3' | 'WEBM_OPUS'
  sampleRateHertz?: number          // Sample rate (default: 16000)
  enableAutomaticPunctuation?: boolean  // Auto punctuation (default: true)
  enableWordTimeOffsets?: boolean   // Word-level timestamps (default: false)
}
```

**Returns:**

```typescript
interface STTResult {
  text: string                      // Transcribed text
  confidence?: number               // Confidence score (0-1)
  languageCode?: string             // Detected language code
  alternatives?: Array<{            // Alternative transcriptions
    text: string
    confidence?: number
  }>
}
```

---

## Tools

### `createUser(params, context, client)`

Creates a new user with profile.

**Parameters:**

```typescript
interface CreateUserParams {
  email: string
  password: string
  fullName: string
  profileType: 'teacher' | 'student' | 'school_superadmin'
  organizationId?: string
}
```

**Returns:** `ActionToolResult`

---

### `createClass(params, context, client)`

Creates a new class.

**Parameters:**

```typescript
interface CreateClassParams {
  name: string
  description?: string
  subject?: string
  gradeLevel?: string
  academicYear?: string
  semester?: string
  teacherId: string
  organizationId?: string
}
```

**Returns:** `ActionToolResult`

---

### `createStudent(params, context, client)`

Creates a new student profile and optionally enrolls in a class.

**Parameters:**

```typescript
interface CreateStudentParams {
  email: string
  password: string
  fullName: string
  organizationId?: string
  classId?: string
}
```

**Returns:** `ActionToolResult`

---

### `createTeacher(params, context, client)`

Creates a new teacher profile.

**Parameters:**

```typescript
interface CreateTeacherParams {
  email: string
  password: string
  fullName: string
  organizationId?: string
  department?: string
  bio?: string
}
```

**Returns:** `ActionToolResult`

---

## SQL Executor

### `SqlExecutor.execute(options)`

Executes a SELECT query with RLS enforcement.

**Parameters:**

```typescript
interface SqlExecutorOptions {
  query: string                    // SQL SELECT query
  context: UserContext            // User context for RLS
  client: SupabaseClient         // Supabase client
}
```

**Returns:** `SqlExecutorResult`

---

## Security

### `SecurityGuards`

- `isQuerySafe(query)`: Validates SQL query is safe (SELECT only)
- `canPerformAction(context, action, organizationId)`: Validates user permissions
- `canQueryTable(context, tableName)`: Validates table access
- `canCreateEntity(context, entityType)`: Validates creation permissions

### `RLSEnforcer`

- `injectOrganizationFilter(query, context)`: Adds organization filter to SQL
- `validateOrganizationAccess(context, targetOrganizationId)`: Validates org access
- `getOrganizationCondition(context, tableAlias)`: Gets RLS condition

### `InputValidator`

- `isValidEmail(email)`: Validates email format
- `isValidPassword(password)`: Validates password strength
- `isValidUUID(uuid)`: Validates UUID format
- `isValidClassCode(code)`: Validates class code format
- `sanitizeString(input, maxLength)`: Sanitizes string input

---

## Types

### `UserContext`

```typescript
interface UserContext {
  userId: string
  profileType: 'platform_owner' | 'school_superadmin'
  organizationId: string | null
  profile?: Profile
}
```

### `ToolCall`

```typescript
interface ToolCall {
  tool: string
  parameters: Record<string, unknown>
  result?: unknown
  error?: string
}
```

### `ActionToolResult`

```typescript
interface ActionToolResult {
  success: boolean
  data?: unknown
  error?: string
  metadata?: Record<string, unknown>
}
```

### `SqlExecutorResult`

```typescript
interface SqlExecutorResult {
  data: unknown[]
  rowCount: number
  error?: string
}
```
