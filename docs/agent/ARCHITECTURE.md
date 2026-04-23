# AI Agent Architecture

## Overview

The AI Agent system is built on a **ReAct (Reasoning + Acting)** pattern, where the agent reasons about user intent and then executes appropriate tools to fulfill requests. The agent includes **agentic improvements** (reflection loop, critic step, schema-awareness, enhanced intent classification) for self-correction and consistent query generation.

## Agentic Improvements (Current Release)

Inquiry handling uses an **agentic loop** instead of a single generate-and-execute pass:

- **Reflection/retry loop** (`src/core/reflection.ts`): When SQL execution fails, the error is fed back to the LLM; the LLM produces corrected SQL. Up to 3 retries with full error history.
- **Critic/review step**: Before execution, SQL is validated (quick checks and optional LLM review) to catch schema, safety, and logic issues.
- **Schema-awareness**: Database schema (DDL) is injected into prompts. Optional dynamic schema loader (`src/core/schema-loader.ts`) fetches and validates tables from the live database (with fallback to static schema).
- **Enhanced intent classification**: Broader inquiry/action patterns and "think first" question understanding so semantically equivalent questions are handled consistently.
- **"Think first" SQL generation**: The agent analyzes the question (synonyms, intent, filters) before generating SQL so that same question phrased differently yields the same SQL.
- **Business rules in tools**: Tool definitions include **BUSINESS RULES** in their descriptions so the LLM respects constraints during planning.
- **Security**: Word-boundary keyword detection (e.g. `created_by` does not trigger CREATE block); SELECT-only enforcement.

**Flow (inquiry)**: Intent classification → Think (understand question) → Generate SQL → Critic review → Execute → on error: Reflect → retry (up to 3 times) → Format results.

For full implementation details, see `packages/agent/docs/AGENTIC_IMPROVEMENTS.md` and `packages/agent/docs/IMPLEMENTATION_SUMMARY.md`.

## Core Components

### 1. Agent Core (`src/core/agent.ts`)

The main agent orchestrator for **Agent Mode** (full CRUD operations) that:
- Parses user messages
- Determines intent (inquiry vs action)
- Selects appropriate tools
- Executes tools with proper context
- Formats responses
- Tracks progress for multi-step operations

### 1b. Think Agent Core (`src/core/think-agent.ts`)

The read-only agent for **Think Mode** that:
- Only handles inquiries (data questions)
- Executes SELECT queries only
- Blocks create/update/delete operations
- Provides user-friendly error messages when actions are attempted
- Redirects users to Agent Mode for write operations

### 2. Reflection & Schema (`src/core/reflection.ts`, `src/core/schema-loader.ts`)

Agentic inquiry handling:
- **SQLReflection**: Reflection/retry loop (up to 3 retries), critic/review step, error categorization
- **SchemaLoader**: Optional dynamic schema fetch from database (cached), fallback to static schema
- Used by both Agent and Think Agent for SELECT/inquiry flows

### 3. SQL Executor (`src/executor/sql.ts`)

Handles SQL query execution:
- Validates SQL (SELECT only)
- Injects RLS context (organization_id filters)
- Executes via Supabase
- Formats results

### 4. Action Tools (`src/tools/`)

Pre-defined tools for administrative actions:
- `create_user.ts` - User creation
- `create_class.ts` - Class creation
- `create_student.ts` - Student creation
- `create_teacher.ts` - Teacher creation
- `enroll_student.ts` - Enrollment management

### 5. Security Layer (`src/security/`)

Security enforcement:
- `rls.ts` - RLS policy enforcement
- `guards.ts` - Access control guards
- `validator.ts` - Input validation

### 6. Prompt System (`src/prompts/`)

AI prompts for:
- Intent classification
- SQL generation
- Response formatting

### 7. Speech-to-Text (STT) Integration (`@eduator/ai/stt-generator`)

Handles audio transcription:
- Google Cloud Speech-to-Text API integration
- Automatic language detection
- Support for multiple audio formats (WAV, FLAC, OGG, MP3, WebM)
- Fallback to Gemini audio understanding if available

## Agent Modes

The agent system operates in two distinct modes:

### Think Mode (Read-Only)
- **Purpose**: View and retrieve information only
- **Capabilities**: 
  - Execute SELECT queries
  - Answer data questions
  - Provide insights and analytics
- **Restrictions**: 
  - Cannot create, update, or delete data
  - Blocks all write operations
  - Provides friendly error messages directing users to Agent Mode

### Agent Mode (Full CRUD)
- **Purpose**: Complete administrative operations
- **Capabilities**:
  - All Think Mode capabilities
  - Create organizations, users, classes, students, teachers
  - Update and manage entities
  - Multi-step operations with progress tracking
- **Progress Tracking**: 
  - Shows real-time progress for multi-step operations
  - Displays todo list of steps to be executed
  - Updates status as each step completes

## Data Flow

### Text Input Flow (Agent Mode)

```
User Message (Text)
    ↓
Agent.process()
    ↓
Intent Classification (AI)
    ↓
├─ Inquiry → Think → Generate SQL → Critic Review → Execute (or Reflect/Retry) → Format Results
└─ Action → Build Progress List → Execute Tools → Update Progress → Confirm Result
    ↓
Formatted Response (with Progress Info)
```

### Text Input Flow (Think Mode)

```
User Message (Text)
    ↓
ThinkAgent.process()
    ↓
Intent Classification (AI)
    ↓
├─ Inquiry → Think → Generate SQL → Critic Review → Execute (or Reflect/Retry) → Format Results
└─ Action → Block & Redirect Message
    ↓
Formatted Response (or Error Message)
```

### Audio Input Flow

```
Audio Input
    ↓
Agent.process({ audio: ... })
    ↓
STT Transcription (Google Cloud Speech-to-Text)
    ↓
Transcribed Text
    ↓
Intent Classification (AI)
    ↓
├─ Inquiry → SQL Executor → Format Results
└─ Action → Action Tool → Confirm Result
    ↓
Formatted Response
```

## Security Architecture

### Row-Level Security (RLS)

```typescript
// Platform Owner Context
SELECT * FROM profiles  // Can see all

// School Admin Context  
SELECT * FROM profiles 
WHERE organization_id = 'user-org-id'  // Auto-injected
```

### SQL Validation

- Only SELECT statements allowed
- Blocked keywords (word-boundary checks): INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE, EXEC, etc.
- Column names like `created_by` do not trigger CREATE block (false-positive prevention)
- Parameterized queries only (no raw string interpolation)

### Context Isolation

Each agent instance maintains:
- User ID
- Profile type
- Organization ID (if applicable)
- Supabase client with user context

## Tool Execution Flow

### Single-Step Operations

1. **Parse Intent**: Determine if user wants data or action
2. **Select Tool**: Choose appropriate tool based on intent
3. **Validate Context**: Ensure user has permission
4. **Execute**: Run tool with user context
5. **Format**: Convert result to human-readable format
6. **Respond**: Return formatted response to user

### Multi-Step Operations (Agent Mode)

1. **Parse Intent**: Detect multiple tools needed
2. **Build Progress List**: Create todo list of all steps
3. **Initialize Progress**: Mark first step as "executing"
4. **Execute Steps Sequentially**:
   - Update step status to "executing"
   - Execute tool with user context
   - Update step status to "completed" or "failed"
   - Move to next step
5. **Track Progress**: Return progress information in response
6. **Format**: Convert results to human-readable format
7. **Respond**: Return formatted response with progress details

### Progress Tracking

Multi-step operations include progress information:

```typescript
interface ProgressInfo {
  steps: Array<{
    tool: string
    description: string
    status: 'pending' | 'executing' | 'completed' | 'failed'
    error?: string
  }>
  currentStep?: number
  totalSteps: number
  inProgress: boolean
}
```

The UI displays this progress in real-time, showing:
- All steps that will be executed
- Current step being processed (with spinner)
- Completed steps (with checkmark)
- Failed steps (with error message)

## STT Integration

### Audio Format Support

- **WAV** (LINEAR16) - Recommended for best quality
- **FLAC** - Lossless compression
- **OGG/Opus** - Good compression with quality
- **MP3** - Widely supported
- **WebM/Opus** - Web-friendly format

### Language Detection

The STT system supports automatic language detection or explicit language hints:

```typescript
// Auto-detect language
await agent.process({
  audio: audioBuffer,
  audioMimeType: 'audio/wav',
  // audioLanguageCode omitted - will auto-detect
})

// Explicit language
await agent.process({
  audio: audioBuffer,
  audioMimeType: 'audio/wav',
  audioLanguageCode: 'en-US', // or 'az-AZ', 'ru-RU', etc.
})
```

### UI Widget Integration

The `AIAgentWidget` component provides:

1. **Recording Interface**:
   - Microphone button to start recording
   - Stop button with visual feedback
   - Recording timer display
   - Pulsing indicator during recording

2. **Transcription Flow**:
   - Audio recorded via MediaRecorder API
   - Converted to base64 for server transmission
   - Transcribed on server using Google Cloud Speech-to-Text
   - Text displayed in input field for review

3. **User Review**:
   - Transcribed text appears in input field
   - User can edit before sending
   - Send button processes text through agent

### Configuration

Set environment variables for STT:

```bash
GOOGLE_CLOUD_SPEECH_API_KEY=your_api_key
# OR
GOOGLE_GEMINI_API_KEY=your_api_key  # Falls back to this if SPEECH_API_KEY not set
```

## Error Handling

- **SQL Errors**: Caught, sanitized, and returned as user-friendly messages
- **Permission Errors**: Clear messages about access restrictions
- **Validation Errors**: Specific field-level error messages
- **Tool Errors**: Rollback support for multi-step operations
- **STT Errors**: Fallback messages if transcription fails, suggestions to try typing instead

## Performance Considerations

- **Query Optimization**: Agent generates optimized queries
- **Connection Pooling**: Reuses Supabase client connections
- **Caching**: (Future) Cache common queries
- **Rate Limiting**: (Future) Limit tool execution frequency

## Extensibility

### Adding New Tools

1. Create tool in `src/tools/`
2. Define tool schema with parameters
3. Register in `src/tools/index.ts`
4. Update prompt to include tool description
5. Test with various scenarios

### Custom Prompts

Prompts are modular and can be customized:
- Modify `src/prompts/system.ts` for agent personality
- Update `src/prompts/sql.ts` for SQL generation style
- Adjust `src/prompts/actions.ts` for action descriptions

## Testing Strategy

- Unit tests for each tool
- Integration tests for SQL executor
- Security tests for RLS enforcement
- E2E tests for complete workflows

## Monitoring

- Log all tool executions
- Track SQL query performance
- Monitor permission denials
- Alert on security violations
