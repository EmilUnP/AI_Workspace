# @eduator/agent

**Universal AI Agent for School Management System (ERP/ERP)**

A comprehensive, security-first AI agent system that provides intelligent assistance to Platform Owners and School Administrators. The agent can answer data questions via SQL queries and perform administrative actions through pre-defined tools, all while respecting Row-Level Security (RLS) policies.

## 🎯 Features

### Core Capabilities

- **Dual Mode System**: 
  - **Think Mode**: Read-only operations for viewing and querying data
  - **Agent Mode**: Full CRUD operations for creating and managing entities
- **SQL Query Execution**: Execute optimized SELECT queries with automatic RLS enforcement
- **Administrative Actions**: Create users, classes, students, and teachers via secure action tools
- **Progress Tracking**: Real-time progress display for multi-step operations
- **Voice Input (STT)**: Speech-to-Text transcription support for hands-free interaction
- **Security First**: All operations respect database RLS policies and user context
- **Context Aware**: Understands differences between Platform Owner and School Admin contexts
- **Intelligent Responses**: Natural language processing for user queries with structured tool execution

### Role-Based Access

| Role | Capabilities |
|------|-------------|
| **Platform Owner** | Full access across all organizations, can query any data, manage all entities |
| **School Admin** | Organization-scoped access, can query and manage within their organization only |

## 📦 Installation

```bash
# This package is part of the monorepo
# Install dependencies at root level
npm install
```

## 🚀 Quick Start

### Basic Usage

#### Think Mode (Read-Only)

```typescript
import { createThinkAgent } from '@eduator/agent'

// Create Think Agent instance (read-only mode)
const thinkAgent = createThinkAgent({
  userId: 'user-uuid',
  profileType: 'platform_owner', // or 'school_superadmin'
  organizationId: 'org-uuid', // null for platform owners
})

// Process a query (read-only)
const response = await thinkAgent.process({
  message: 'How many students are in our school?',
})

console.log(response.text)
// If user tries to create something, will get friendly error message
```

#### Agent Mode (Full CRUD)

```typescript
import { createAgent } from '@eduator/agent'

// Create Agent instance (full CRUD mode)
const agent = createAgent({
  userId: 'user-uuid',
  profileType: 'platform_owner', // or 'school_superadmin'
  organizationId: 'org-uuid', // null for platform owners
})

// Process a query or action
const response = await agent.process({
  message: 'Create organization named Demo and assign new admin',
  conversationId: 'conv-uuid', // optional, for context
})

console.log(response.text)
console.log(response.progress) // Progress info for multi-step operations
```

### SQL Query Example

```typescript
// The agent automatically generates and executes SQL
const response = await agent.process({
  message: 'Show me all active teachers in my organization',
})

// The agent will:
// 1. Generate SQL: SELECT * FROM profiles WHERE profile_type = 'teacher' AND organization_id = '...'
// 2. Execute with RLS context
// 3. Format results in human-readable format
```

### Action Tool Example

```typescript
// The agent can perform actions
const response = await agent.process({
  message: 'Create a new class called "Math 101" with teacher John Doe and 10 demo students',
})

// The agent will:
// 1. Identify the action intent
// 2. Use createClass tool
// 3. Use createStudentProfile tool for each student
// 4. Provide confirmation
```

### Voice Input Example

```typescript
// Process audio input (automatically transcribed)
const audioBuffer = fs.readFileSync('recording.wav')
const response = await agent.process({
  audio: audioBuffer,
  audioMimeType: 'audio/wav',
  audioLanguageCode: 'en-US', // Optional, auto-detects if not provided
})

// The agent will:
// 1. Transcribe audio to text using STT
// 2. Process the transcribed text
// 3. Return formatted response
```

### UI Widget with Voice Input

The agent widget (`AIAgentWidget`) includes built-in voice input support:

- **Microphone Button**: Click to start recording
- **Stop Button**: Click to stop recording and transcribe
- **Text Preview**: Review and edit transcribed text before sending
- **Send Button**: Send transcribed text to agent for processing

## 📚 API Reference

### `createAgent(options)`

Creates a new agent instance for **Agent Mode** (full CRUD operations).

**Parameters:**

```typescript
interface AgentOptions {
  userId: string                    // Current user's UUID
  profileType: 'platform_owner' | 'school_superadmin'
  organizationId: string | null     // null for platform owners
  supabaseClient?: SupabaseClient  // Optional, will use admin client if not provided
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
  supabaseClient?: SupabaseClient  // Optional, will use admin client if not provided
}
```

**Returns:** `ThinkAgent` instance

**Note**: Think Mode only allows SELECT queries and blocks all write operations.

### `agent.process(options)`

Processes a user message and returns a response. Supports both text and audio input.

**Parameters:**

```typescript
interface ProcessOptions {
  message?: string                  // User's query/message (text input)
  audio?: Buffer | string | ArrayBuffer  // Audio input (automatically transcribed)
  audioMimeType?: string           // Audio MIME type (e.g., 'audio/wav', 'audio/webm')
  audioLanguageCode?: string       // Language code for STT (e.g., 'en-US', 'az-AZ')
  conversationId?: string          // Optional conversation ID for context
  includeMetadata?: boolean        // Include tool execution metadata
  showSql?: boolean                // Include SQL query in response
}
```

**Returns:**

```typescript
interface AgentResponse {
  text: string                      // Human-readable response
  rawData?: unknown[]               // Raw JSON data from database (for charts/tables)
  rowCount?: number                 // Number of rows returned
  toolCalls?: ToolCall[]           // Tools that were executed
  sqlQuery?: string                // SQL query if executed (if requested)
  error?: string                   // Error message if any
  progress?: ProgressInfo          // Progress information for multi-step operations (Agent Mode only)
}
```

### Progress Information

For multi-step operations in Agent Mode:

```typescript
interface ProgressInfo {
  steps: Array<{
    tool: string                   // Tool name (e.g., 'create_organization')
    description: string            // Human-readable description
    status: 'pending' | 'executing' | 'completed' | 'failed'
    error?: string                 // Error message if step failed
  }>
  currentStep?: number             // Index of currently executing step
  totalSteps: number               // Total number of steps
  inProgress: boolean             // Whether operation is still in progress
}
```

## 🛠️ Available Tools

### SQL Executor

- **Tool Name**: `execute_sql`
- **Description**: Executes SELECT queries on the database
- **Security**: Automatically enforces RLS based on user context
- **Restrictions**: Only SELECT queries allowed (INSERT/UPDATE/DELETE blocked)

### Action Tools

#### `create_user`

Creates a new user with profile.

**Parameters:**

```typescript
{
  email: string
  password: string
  fullName: string
  profileType: 'teacher' | 'student' | 'school_superadmin'
  organizationId?: string  // Required for non-platform-owner users
}
```

#### `create_class`

Creates a new class.

**Parameters:**

```typescript
{
  name: string
  description?: string
  subject?: string
  gradeLevel?: string
  academicYear?: string
  semester?: string
  teacherId: string
  organizationId: string
}
```

#### `create_student_profile`

Creates a student and optionally enrolls in a class.

**Parameters:**

```typescript
{
  email: string
  password: string
  fullName: string
  organizationId: string
  classId?: string  // Optional, enrolls student if provided
}
```

#### `create_teacher_profile`

Creates a teacher profile.

**Parameters:**

```typescript
{
  email: string
  password: string
  fullName: string
  organizationId: string
  department?: string
  bio?: string
}
```

#### `enroll_student_in_class`

Enrolls a student in a class.

**Parameters:**

```typescript
{
  studentId: string
  classId: string
}
```

## 📊 Progress Tracking

For multi-step operations in Agent Mode, the system provides real-time progress tracking:

### Features

- **Immediate Display**: Progress list appears as soon as a multi-step action is detected
- **Step-by-Step Status**: Each step shows its current status:
  - `pending`: Not yet started
  - `executing`: Currently being processed (with spinner)
  - `completed`: Successfully finished (with checkmark)
  - `failed`: Encountered an error (with error message)
- **Visual Indicators**: 
  - Spinner animation for executing steps
  - Checkmark for completed steps
  - Error icon for failed steps
  - Empty circle for pending steps
- **Progress Counter**: Shows "X / Y" completed steps

### Example

When you say: "Create organization named Demo and assign new admin"

The progress list will show:
1. ✅ Create organization (completed)
2. ⏳ Create user (executing) ← Current
3. ⭕ Assign to organization (pending)

### UI Integration

The `AIAgentWidget` automatically:
- Detects multi-step actions from message text
- Shows placeholder progress immediately
- Updates progress as steps complete
- Hides redundant "Thinking..." indicators when progress is shown

## 🔒 Security

### Row-Level Security (RLS)

All SQL queries are executed with the user's context, ensuring RLS policies are enforced:

- **Platform Owners**: Can query all organizations
- **School Admins**: Can only query data from their organization
- **Teachers/Students**: (Future support) Scoped to their classes and own data

### SQL Injection Prevention

- All queries are validated before execution
- Only SELECT statements are allowed (in Think Mode)
- Destructive operations (INSERT/UPDATE/DELETE) are blocked from SQL tool
- Use action tools for data modifications (Agent Mode only)

### Context Isolation

- Each agent instance is bound to a specific user
- Organization ID is automatically included in queries for school admins
- Think Mode blocks all write operations at the intent level
- Cross-organization access is prevented for non-platform-owners

## 🧪 Example Scenarios

### Scenario 1: Data Query

```typescript
const response = await agent.process({
  message: 'How many active students do we have this semester?',
})

// Agent will:
// - Generate SQL with organization filter
// - Execute query
// - Return: "You have 245 active students this semester."
```

### Scenario 2: Create Class with Demo Data

```typescript
const response = await agent.process({
  message: 'Create a class "Biology 101" and add 2 teachers and 10 students',
})

// Agent will:
// - Create the class
// - Create 2 teacher profiles
// - Create 10 student profiles
// - Enroll students in the class
// - Return confirmation with details
```

### Scenario 3: Multi-Step Action

```typescript
const response = await agent.process({
  message: 'Show me students in Math class, then create 5 new students for it',
})

// Agent will:
// - First execute SQL query to show current students
// - Then create 5 new students
// - Enroll them in the Math class
// - Return combined results
```

## 📝 Database Schema Awareness

The agent understands the following tables:

- `organizations` - School/organization data
- `profiles` - User profiles (students, teachers, admins)
- `classes` - Class/grade information
- `class_enrollments` - Student-class relationships
- `exams` - Exam data
- `exam_submissions` - Student exam submissions
- `lessons` - Lesson content
- `chat_conversations` - Chat history
- `chat_messages` - Individual messages

## 📋 Supported Query Patterns

For a comprehensive list of all possible question types and query patterns the AI Agent can handle, see:

**[POSSIBLE_QUESTIONS.md](./docs/POSSIBLE_QUESTIONS.md)**

This document includes:
- All supported query patterns organized by category
- Examples in multiple languages
- Query pattern notes and best practices
- Instructions for adding new query patterns

**Quick Examples:**
- "How many teachers in Test organization?"
- "Show students in Math 101 class"
- "Show exams created by teacher John Doe"
- "Show lessons in Test organization"
- "Users with no organization"
- And many more...

## 🎤 Voice Input (STT)

The agent supports Speech-to-Text transcription for hands-free interaction. Audio input is automatically transcribed before processing.

### Supported Audio Formats

- **WAV** (LINEAR16)
- **FLAC**
- **OGG/Opus** (OGG_OPUS)
- **MP3**
- **WebM/Opus** (WEBM_OPUS)

### Usage

```typescript
// Audio from base64 string
const response = await agent.process({
  audio: audioBase64String,
  audioMimeType: 'audio/wav',
  audioLanguageCode: 'en-US', // Optional, auto-detects
})

// Audio from Buffer (Node.js)
const audioBuffer = fs.readFileSync('recording.wav')
const response = await agent.process({
  audio: audioBuffer,
  audioMimeType: 'audio/wav',
})
```

### Configuration

Set the following environment variables for STT:

- `GOOGLE_CLOUD_SPEECH_API_KEY` or `GOOGLE_GEMINI_API_KEY` - Required for server-side transcription

### UI Widget Features

The `AIAgentWidget` component includes:

- **Microphone Button**: Start/stop voice recording
- **Recording Timer**: Visual feedback during recording
- **Transcription Preview**: Review transcribed text before sending
- **Text Editing**: Edit transcribed text if needed
- **Auto-focus**: Input field automatically focused after transcription

## 🚧 Future Enhancements

- [ ] Support for Teacher role (scoped to their classes)
- [ ] Support for Student role (personal data only)
- [ ] Advanced analytics and reporting tools
- [ ] Batch operations support
- [ ] Natural language to complex query generation
- [ ] Conversation memory and context retention
- [ ] Multi-turn task planning
- [ ] Real-time voice streaming

## 📄 License

Private - Part of Eduator AI monorepo
