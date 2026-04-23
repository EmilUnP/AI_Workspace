# Agent Modes

The AI Agent system operates in two distinct modes to provide flexibility and security for different use cases. For **inquiries** (data questions), both modes use agentic behavior: reflection/retry loop, critic step, schema-awareness, and "think first" SQL generation. See [ARCHITECTURE.md](./ARCHITECTURE.md) for details.

## Think Mode (Read-Only)

**Purpose**: View and retrieve information only

### Capabilities
- ✅ Execute SELECT queries
- ✅ Answer data questions
- ✅ Provide insights and analytics
- ✅ View existing data

### Restrictions
- ❌ Cannot create, update, or delete data
- ❌ Blocks all write operations
- ❌ Provides friendly error messages directing users to Agent Mode

### Use Cases
- "How many teachers are there?"
- "Show all students in my organization"
- "What are the statistics for this month?"
- "List all active classes"

### Error Handling
When a user tries to perform an action in Think Mode, they receive a friendly message:

```
I can only view and answer questions about your data in Think Mode.

To creating an organization, please switch to **Agent Mode** using the toggle button above.
```

### Implementation

```typescript
import { createThinkAgent } from '@eduator/agent'

const thinkAgent = createThinkAgent({
  userId: 'user-uuid',
  profileType: 'platform_owner',
  organizationId: null,
})

const response = await thinkAgent.process({
  message: 'How many users are there?',
})
```

---

## Agent Mode (Full CRUD)

**Purpose**: Complete administrative operations

### Capabilities
- ✅ All Think Mode capabilities
- ✅ Create organizations, users, classes, students, teachers
- ✅ Update and manage entities
- ✅ Multi-step operations with progress tracking

### Progress Tracking
For multi-step operations, Agent Mode provides real-time progress information:

```typescript
{
  progress: {
    steps: [
      { tool: 'create_organization', description: 'Create organization', status: 'executing' },
      { tool: 'create_user', description: 'Create user', status: 'pending' }
    ],
    currentStep: 0,
    totalSteps: 2,
    inProgress: true
  }
}
```

The UI displays this progress showing:
- All steps that will be executed
- Current step being processed (with spinner)
- Completed steps (with checkmark)
- Failed steps (with error message)

### Use Cases
- "Create organization named Demo and assign new admin"
- "Create a new teacher named John Doe"
- "Create class Math 101 and enroll 10 students"
- "Create organization with demo users"

### Implementation

```typescript
import { createAgent } from '@eduator/agent'

const agent = createAgent({
  userId: 'user-uuid',
  profileType: 'platform_owner',
  organizationId: null,
})

const response = await agent.process({
  message: 'Create organization named Demo and assign new admin',
})

// Response includes progress information
console.log(response.progress)
```

---

## Mode Switching

Users can switch between modes using the toggle button in the UI:

- **Think Mode**: Brain icon (gray when active)
- **Agent Mode**: Lightning bolt icon (blue when active)

The mode determines which handler processes the message:
- Think Mode → `processThinkMessage()`
- Agent Mode → `processAgentMessage()`

---

## API Handlers

### Server Actions (Next.js)

```typescript
// apps/erp-app/src/app/api/agent/actions.ts

// Think Mode handler
export async function processThinkMessage(
  message?: string,
  options?: { ... }
): Promise<AgentResponse>

// Agent Mode handler
export async function processAgentMessage(
  message?: string,
  options?: { ... }
): Promise<AgentResponse>
```

### Frontend Usage

```typescript
// apps/erp-app/src/app/components/ai-agent-client.tsx

<AIAgentWidget
  processThinkMessage={processThinkMessage}
  processAgentMessage={processAgentMessage}
  transcribeAudio={transcribeAudioOnly}
/>
```

---

## Benefits of Dual Mode System

1. **Security**: Think Mode prevents accidental data modifications
2. **User Experience**: Clear separation between viewing and acting
3. **Error Control**: Easier to identify issues (think vs agent)
4. **Code Organization**: Separate handlers for different capabilities
5. **Performance**: Think Mode can be optimized for read-only operations

---

## Migration Notes

If you're using the legacy `processMessage` handler, it will work for both modes but won't provide mode-specific behavior. For best results, use:
- `processThinkMessage` for Think Mode
- `processAgentMessage` for Agent Mode
