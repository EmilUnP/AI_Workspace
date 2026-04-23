# Quick Start Guide

## Overview

The agent supports **Think Mode** (read-only) and **Agent Mode** (full CRUD). For data questions, it uses agentic improvements: reflection/retry on SQL errors, critic review before execution, schema-aware SQL generation, and "think first" question understanding. See [ARCHITECTURE.md](./ARCHITECTURE.md) and `packages/agent/docs/` for implementation details.

## Installation

The agent package is already part of the monorepo. Just ensure dependencies are installed:

```bash
npm install
```

## Agent Modes

The agent system supports two modes:

- **Think Mode**: Read-only operations for viewing and querying data
- **Agent Mode**: Full CRUD operations for creating and managing entities

See [MODES.md](./MODES.md) for detailed information about each mode.

## Basic Usage

### 1. Create an Agent Instance

#### Think Mode (Read-Only)

```typescript
import { createThinkAgent } from '@eduator/agent'

// For Platform Owner
const thinkAgent = createThinkAgent({
  userId: 'user-uuid-here',
  profileType: 'platform_owner',
  organizationId: null,
})

// For School Admin
const thinkAgent = createThinkAgent({
  userId: 'user-uuid-here',
  profileType: 'school_superadmin',
  organizationId: 'org-uuid-here',
})
```

#### Agent Mode (Full CRUD)

```typescript
import { createAgent } from '@eduator/agent'

// For Platform Owner
const agent = createAgent({
  userId: 'user-uuid-here',
  profileType: 'platform_owner',
  organizationId: null, // Platform owners don't have org restriction
  supabaseClient: createAdminClient(), // Optional, uses admin client by default
})

// For School Admin
const agent = createAgent({
  userId: 'user-uuid-here',
  profileType: 'school_superadmin',
  organizationId: 'org-uuid-here',
})
```

### 2. Process Queries

```typescript
// Data query
const response = await agent.process({
  message: 'How many students are in our organization?',
})

console.log(response.text)
// Output: "I found 245 results..."
```

### 3. Perform Actions

```typescript
// Create a class
const response = await agent.process({
  message: 'Create a class called "Math 101" with teacher John Doe',
})

console.log(response.text)
// Output: "✅ Successfully created class "Math 101" with code "CLS-ABC12345"."
```

## Example Scenarios

### Scenario 1: Query Student Data

```typescript
const response = await agent.process({
  message: 'Show me all active students in Grade 10',
  showSql: false, // Set to true to see SQL query
})
```

### Scenario 2: Create Multiple Students

```typescript
const response = await agent.process({
  message: 'Create 10 new students for the Biology class. Use email format: student1@school.com, student2@school.com, etc.',
})
```

### Scenario 3: Complex Multi-Step Action

```typescript
const response = await agent.process({
  message: `
    Create a new class "Advanced Mathematics" for teacher "Sarah Smith",
    then add 15 students to it. Student names: Student1 through Student15,
    emails: student1@school.com through student15@school.com
  `,
  includeMetadata: true, // Include tool execution details
})

// Response includes progress information for multi-step operations
console.log(response.progress)
// {
//   steps: [
//     { tool: 'create_class', description: 'Create class', status: 'completed' },
//     { tool: 'create_student', description: 'Create student', status: 'executing' },
//     ...
//   ],
//   currentStep: 1,
//   totalSteps: 16,
//   inProgress: true
// }
```

### Scenario 4: Voice Input

```typescript
// Process audio input
const audioBuffer = fs.readFileSync('recording.wav')
const response = await agent.process({
  audio: audioBuffer,
  audioMimeType: 'audio/wav',
  audioLanguageCode: 'en-US', // Optional, auto-detects if not provided
})

// The audio is automatically transcribed before processing
console.log(response.text)
```

## Integration with API Server

### Example API Route

```typescript
// packages/api-server/src/routes/v1/admin/agent.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import { createAgent } from '@eduator/agent'
import { authMiddleware } from '../../../middleware/auth'

export async function agentRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/agent/chat',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user
      if (!user || !user.profile) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }

      // Only allow platform owners and school admins
      if (!['platform_owner', 'school_superadmin'].includes(user.profile.profile_type)) {
        return reply.code(403).send({ error: 'Access denied' })
      }

      const { message, conversationId, showSql } = request.body as any

      const agent = createAgent({
        userId: user.id,
        profileType: user.profile.profile_type as any,
        organizationId: user.profile.organization_id,
      })

      const response = await agent.process({
        message,
        conversationId,
        showSql,
      })

      return reply.send(response)
    }
  )
}
```

## Integration with Next.js App

### Server Action Example

```typescript
// app/platform-owner/agent/actions.ts
'use server'

import { createAgent } from '@eduator/agent'
import { createServerClient } from '@eduator/auth/supabase/server'

export async function processAgentMessage(message: string) {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_type, organization_id')
    .eq('user_id', user.id)
    .single()

  if (!profile || !['platform_owner', 'school_superadmin'].includes(profile.profile_type)) {
    return { error: 'Access denied' }
  }

  const agent = createAgent({
    userId: user.id,
    profileType: profile.profile_type as any,
    organizationId: profile.organization_id,
  })

  const response = await agent.process({ message })
  return response
}
```

### React Component with Voice Input Example

```typescript
// app/platform-owner/agent/page.tsx
'use client'

import { AIAgentWidget } from '@eduator/ui'
import { processAgentMessage, transcribeAudioOnly } from './actions'

export default function AgentPage() {
  return (
    <AIAgentWidget
      processMessage={processAgentMessage}
      transcribeAudio={async (audio: string, options?: { audioMimeType?: string; audioLanguageCode?: string }) => {
        return await transcribeAudioOnly(audio, options)
      }}
      title="AI Assistant"
    />
  )
}
```

The `AIAgentWidget` component includes:
- **Text Input**: Type your questions
- **Voice Input**: Click microphone button to record
- **Recording**: Visual feedback with timer
- **Transcription Preview**: Review transcribed text before sending
- **Send**: Process through agent after review

## Security Considerations

1. **RLS Enforcement**: All queries automatically respect Row-Level Security
2. **Context Isolation**: Each agent instance is bound to a specific user and organization
3. **SQL Injection Prevention**: Only SELECT queries allowed, all inputs validated
4. **Permission Checks**: Actions are validated against user permissions before execution

## Troubleshooting

### Common Issues

1. **"Query execution failed"**
   - Check that user has proper RLS policies set up
   - Verify organization_id is correct for school admins

2. **"Access denied"**
   - Ensure user has platform_owner or school_superadmin role
   - Check that organization_id matches for school admins

3. **"Tool execution failed"**
   - Verify all required parameters are provided
   - Check that referenced entities (teachers, classes) exist
   - Ensure user has permission for the action

## Next Steps

- Read [README.md](../../README.md) for full documentation
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Review example implementations in the codebase
