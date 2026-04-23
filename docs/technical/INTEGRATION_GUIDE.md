# Eduator AI - Integration Guide

## Overview

This document describes how to integrate Eduator AI with external applications. Choose the method that best fits your needs.

---

## Integration Methods

| Method | Best For | Complexity | Features |
|--------|----------|------------|----------|
| **REST API** | Full control, custom apps | Medium | All features |
| **AI Agent** | Natural language queries & actions | Low | SQL queries, admin actions |
| **Embeddable Widget** | Quick add to existing sites | Low | Limited features |
| **Database Bridge** | Legacy systems, same DB tech | High | Full data sync |
| **SSO/OAuth** | Enterprise, user management | Medium | Auth only |
| **Webhook Events** | Real-time notifications | Low | Event-driven |

---

## Method 1: REST API Integration

### How It Works
Your app calls our API endpoints with authentication tokens.

```
[Your App] → HTTP Request → [Eduator API] → ResponseQ
```

### Steps
1. Get API credentials from Eduator admin
2. Authenticate to get JWT token
3. Call endpoints with `Authorization: Bearer <token>`
4. Handle JSON responses
5. **Token balance (AI features):** Exam/lesson/course generation and chat consume tokens. Check balance via `GET /api/v1/teacher/tokens` (or `overview.token_balance` in the dashboard) before calling generate endpoints. If balance is too low, the API returns **402 Payment Required** with a message like *"Not enough tokens. This action requires X tokens. Your balance: Y."* — handle 402 in your client and prompt users to top up. See [API.md](../API.md) for full details.

### Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Get access token |
| `/api/teacher/exams` | GET | List exams |
| `/api/teacher/exams` | POST | Create exam |
| `/api/teacher/exams/:id` | GET | Get exam details |
| `/api/teacher/lessons` | GET | List lessons |
| `/api/teacher/lessons/generate` | POST | Generate lesson with AI (RAG). Optional: `objectives` (manual learning objectives), `gradeLevel`, `documentIds` for multi-doc RAG — see [API.md](../API.md#post-apiv1teacherlessonsgenerate). |
| `/api/teacher/documents` | GET | List documents |
| `/api/teacher/classes` | GET | List classes |
| `/api/v1/teacher/tokens` | GET | Get token balance (check before AI generation) |

### Example Flow
```
1. POST /api/auth/login { email, password }
   → Returns: { token: "eyJ..." }

2. GET /api/teacher/exams
   Headers: Authorization: Bearer eyJ...
   → Returns: { exams: [...] }
```

### Pros & Cons
| Pros | Cons |
|------|------|
| Full feature access | Requires development work |
| Your UI, our backend | Need to handle auth tokens |
| Real-time data | API rate limits apply |

---

## Method 2: AI Agent Integration

### How It Works
Use natural language to query data and perform administrative actions through the AI Agent system.

```
[Your App] → Natural Language → [AI Agent] → SQL/Actions → [Database] → Formatted Response
```

### Available in Package
The AI Agent is available as `@eduator/agent` package in the monorepo.

### Steps
1. Import the agent package
2. Create agent instance with user context
3. Send natural language queries
4. Receive formatted responses

### Basic Usage

```typescript
import { createAgent } from '@eduator/agent'
import { createAdminClient } from '@eduator/auth/supabase/admin'

// Create agent for Platform Owner
const agent = createAgent({
  userId: 'user-uuid',
  profileType: 'platform_owner',
  organizationId: null,
})

// Query data
const response = await agent.process({
  message: 'How many users are in Test organization?',
})

console.log(response.text)
// Output: "There are 9 users in the Test organization."
```

### Available Capabilities

#### Data Queries
- Count users, teachers, students by organization
- List classes, exams, lessons
- Filter by organization, class, teacher
- Complex queries with JOINs

#### Administrative Actions
- Create organizations
- Create users (teachers, students, admins)
- Create classes
- Enroll students in classes
- Multi-step actions (e.g., create org + admin)

### Example Queries

```typescript
// Query examples
await agent.process({ message: 'Show me all teachers in Test organization' })
await agent.process({ message: 'How many students are in Math 101 class?' })
await agent.process({ message: 'List all exams created by teacher John Doe' })

// Action examples
await agent.process({ 
  message: 'Create a new organization called "Demo School" and assign a school admin to it' 
})
await agent.process({ 
  message: 'Create a class "Biology 101" with teacher Sarah Smith and add 10 students' 
})
```

### API Endpoint

If using via REST API:

```http
POST /api/v1/platform-owner/agent/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "How many users are in Test organization?",
  "showSql": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "text": "There are 9 users in the Test organization.",
    "toolCalls": [...],
    "rawData": [...],
    "rowCount": 1
  }
}
```

### Security Features
- **RLS Enforcement**: All queries respect Row-Level Security
- **Context Isolation**: Platform Owners see all data, School Admins see only their organization
- **SQL Injection Prevention**: Only SELECT queries allowed, all inputs validated
- **Permission Checks**: Actions validated against user permissions

### Pros & Cons

| Pros | Cons |
|------|------|
| Natural language interface | Requires AI model access |
| Automatic query optimization | Response time depends on AI |
| Human-readable results | Limited to supported query patterns |
| Multi-language support | |

### Documentation
- **Quick Start**: See `packages/agent/docs/QUICK_START.md`
- **API Reference**: See `packages/agent/docs/API_REFERENCE.md`
- **Architecture**: See `packages/agent/docs/ARCHITECTURE.md`
- **Example Queries**: See `packages/agent/docs/POSSIBLE_QUESTIONS.md` (200+ examples)

---

## Method 3: Embeddable Widget

### How It Works
Embed our UI components directly into your website using iframe or JavaScript widget.

```html
<!-- Option A: iframe -->
<iframe src="https://eduator.ai/embed/exam-creator?token=xxx" />

<!-- Option B: JavaScript Widget -->
<script src="https://eduator.ai/widget.js"></script>
<div id="eduator-exam-creator"></div>
<script>
  Eduator.init({ token: 'xxx', container: '#eduator-exam-creator' });
</script>
```

### Available Widgets

| Widget | Description |
|--------|-------------|
| `exam-creator` | AI exam generation interface |
| `exam-viewer` | Display exam to students |
| `lesson-viewer` | Display AI-generated lesson |
| `ai-chat` | AI teaching assistant |

### Communication
Widgets can send events to your parent page:

| Event | When |
|-------|------|
| `exam:created` | New exam generated |
| `exam:submitted` | Student finished exam |
| `lesson:completed` | Student finished lesson |

### Pros & Cons
| Pros | Cons |
|------|------|
| Quick to implement | Limited customization |
| No backend needed | Our UI in your app |
| Auto-updates | iframe security concerns |

---

## Method 3: Database Bridge (Your Scenario)

### Your Idea
```
[External App] ←→ [Bridge DB] ←→ [Eduator]
     ↓                 ↓              ↓
 PostgreSQL    Shared Users     PostgreSQL
```

### Improved Architecture

Instead of 3 separate databases, use a **Foreign Data Wrapper (FDW)** or **Sync Service**:

#### Option A: PostgreSQL FDW (Recommended)

```
┌─────────────────┐     ┌─────────────────┐
│  External App   │     │   Eduator AI   │
│   PostgreSQL    │     │   PostgreSQL    │
│                 │     │                 │
│  users table    │────▶│ external_users  │
│  (original)     │ FDW │   (foreign)     │
└─────────────────┘     └─────────────────┘
```

**How FDW Works:**
1. Eduator connects to your external DB as "foreign server"
2. Creates foreign table pointing to your users
3. Queries user data in real-time (no duplication)
4. Your app stays unchanged

**Setup in Eduator PostgreSQL:**
```sql
-- 1. Enable extension
CREATE EXTENSION postgres_fdw;

-- 2. Create foreign server (your external DB)
CREATE SERVER external_app
  FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host 'your-db-host', dbname 'your_db', port '5432');

-- 3. Create user mapping
CREATE USER MAPPING FOR eduator_user
  SERVER external_app
  OPTIONS (user 'readonly_user', password 'xxx');

-- 4. Import your users table
CREATE FOREIGN TABLE external_users (
  id UUID,
  email VARCHAR(255),
  name VARCHAR(255),
  role VARCHAR(50),
  created_at TIMESTAMP
) SERVER external_app
  OPTIONS (table_name 'users');

-- 5. Create view for Eduator to use
CREATE VIEW synced_users AS
SELECT id, email, name, 
  CASE role 
    WHEN 'instructor' THEN 'teacher'
    WHEN 'learner' THEN 'student'
    ELSE role
  END as eduator_role
FROM external_users;
```

#### Option B: Sync Service (Your Original Idea, Improved)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  External App   │     │   Bridge DB     │     │   Eduator AI   │
│   PostgreSQL    │────▶│   PostgreSQL    │◀────│   PostgreSQL    │
│                 │sync │                 │sync │                 │
│  users (source) │     │ unified_users   │     │ profiles (uses) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                       │
         └──────────────────────┴───────────────────────┘
                    Sync Service (runs every X minutes)
```

**Bridge DB Schema:**
```sql
-- Unified users from both systems
CREATE TABLE unified_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source tracking
  source_system VARCHAR(50) NOT NULL, -- 'external_app' or 'eduator'
  source_id VARCHAR(255) NOT NULL,
  
  -- Common fields
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  
  -- Role mapping
  external_role VARCHAR(50),
  eduator_role VARCHAR(50),
  
  -- Sync metadata
  synced_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(source_system, source_id)
);

-- Access permissions
CREATE TABLE user_permissions (
  user_id UUID REFERENCES unified_users(id),
  feature VARCHAR(100), -- 'exams', 'lessons', 'ai_chat'
  can_access BOOLEAN DEFAULT false,
  granted_at TIMESTAMP DEFAULT NOW()
);
```

**Sync Service Logic:**
```
Every 5 minutes:
1. Fetch new/updated users from External App
2. For each user:
   - If exists in Bridge DB: update fields
   - If new: create in Bridge DB
   - Map roles: instructor→teacher, learner→student
3. Sync Bridge DB → Eduator profiles table
4. Log sync results
```

### Pros & Cons

| Method | Pros | Cons |
|--------|------|------|
| **FDW** | Real-time, no duplication | Read-only, needs DB access |
| **Bridge DB** | Full control, works offline | Sync delays, data duplication |

---

## Method 5: SSO / OAuth Integration

### How It Works
Users log in once in your app, automatically authenticated in Eduator.

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Your App    │───▶│ Identity     │◀───│  Eduator    │
│  (Login)     │    │ Provider     │    │  (Trusts)    │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Options

| Provider | Description |
|----------|-------------|
| **Your Auth** | We trust your JWT tokens |
| **SAML 2.0** | Enterprise SSO standard |
| **OAuth 2.0** | Modern auth protocol |
| **OpenID Connect** | Identity layer on OAuth |

### JWT Trust Configuration
If your app issues JWTs, Eduator can validate them:

```
Eduator Config:
- trusted_issuer: "https://your-app.com"
- public_key: "your-jwt-public-key"
- user_claim: "email"
- role_claim: "role"
```

### User Auto-Provisioning
When user logs in via SSO for first time:
1. Eduator receives user info from your token
2. Creates profile automatically
3. Assigns role based on claim mapping
4. User can immediately use Eduator features

---

## Method 6: Webhook Events

### How It Works
Eduator notifies your app when things happen.

```
[Eduator] ─── Event ───▶ [Your Webhook URL]
                              │
                              ▼
                         [Your App Handles]
```

### Available Events

| Event | Payload |
|-------|---------|
| `exam.created` | exam_id, title, teacher_id |
| `exam.published` | exam_id, class_ids |
| `exam.submitted` | exam_id, student_id, score |
| `lesson.created` | lesson_id, topic, teacher_id |
| `user.registered` | user_id, email, role |
| `class.enrollment` | class_id, student_id |

### Configuration
Register webhook in Eduator dashboard:
- URL: `https://your-app.com/webhooks/eduator`
- Secret: For signature verification
- Events: Select which to receive

### Security
All webhooks include signature header:
```
X-Eduator-Signature: sha256=abc123...
```
Verify this matches your secret + payload.

---

## Recommended Integration Path

### For Quick Start
1. **API Integration** - Start with REST API
2. Add **Widgets** for specific features
3. Implement **Webhooks** for real-time updates

### For Enterprise / Legacy Systems
1. Set up **SSO** for unified login
2. Use **Database Bridge** for user sync
3. Call **API** for feature access

### Your Specific Scenario

**Recommended Approach:**

```
Phase 1: Authentication Bridge
┌─────────────────────────────────────────────────────┐
│                                                     │
│  [External App]  ──SSO──▶  [Eduator]              │
│       │                         │                   │
│       └────── Shared JWT ───────┘                   │
│                                                     │
└─────────────────────────────────────────────────────┘

Phase 2: Data Sync (if needed)
┌─────────────────────────────────────────────────────┐
│                                                     │
│  [External DB] ──FDW──▶ [Eduator DB]              │
│                    (read user data)                 │
│                                                     │
└─────────────────────────────────────────────────────┘

Phase 3: Feature Access
┌─────────────────────────────────────────────────────┐
│                                                     │
│  [External App] ──API──▶ [Eduator Features]       │
│       │              ◀── Webhooks ───┘              │
│       │                                             │
│       └──── Embed Widgets (optional) ───────▶      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Why This Is Better Than 3 DBs:**
1. Less complexity - no sync service to maintain
2. Real-time data - FDW queries live data
3. Single source of truth - users stay in original system
4. Easier security - fewer systems to secure

---

## User Sync: No Re-Registration Required

### The Problem
```
Your App: user_emil, user_anna, user_john (existing users)
Eduator: (no users yet)

Goal: Users access Eduator WITHOUT creating new account
```

### Solution Options

#### Option A: Same Credentials (Simple)

When user registers in your app, also create them in Eduator:

```
Your App Registration Flow:
1. User submits registration form
2. Your app creates user locally
3. Your app calls Eduator API:
   POST /api/auth/register
   { email, password, name, role }
4. User now exists in both systems
5. User logs into Eduator with same email/password
```

#### Option B: SSO Token Link (Better UX)

Generate auto-login link when user wants to access Eduator:

```
Your App → Generate Link:
1. User clicks "Open Eduator"
2. Your app creates signed token with user info
3. Redirect to: eduator.ai/auth/sso?token=xxx
4. Eduator validates token, creates session
5. User is logged in automatically
```

Token payload:
```json
{
  "email": "user_emil@example.com",
  "name": "Emil",
  "role": "teacher",
  "exp": 1234567890,
  "iat": 1234567800
}
```

#### Option C: Shared Session Database (Best UX)

Both apps check same session storage:

```sql
-- Shared session table (accessible by both apps)
CREATE TABLE shared_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_email)
);
```

Flow:
```
1. User logs into Your App
2. Your App saves session to shared_sessions
3. User opens Eduator
4. Eduator checks shared_sessions by email
5. If valid session exists → user is logged in
6. If expired → refresh or redirect to login
```

### Comparison

| Aspect | Option A | Option B | Option C |
|--------|----------|----------|----------|
| **Complexity** | Low | Medium | High |
| **User clicks** | Login again | One click | Zero clicks |
| **Security** | Good | Good | Best |
| **Setup time** | 1 day | 3-5 days | 1-2 weeks |

### Recommended Implementation Path

```
Week 1: Option A (Same Credentials)
├── Create users in Eduator when they register in your app
├── Users can access Eduator with same login
└── Working integration achieved

Week 2-3: Option B (SSO Links)
├── Add "Open Eduator" button in your app
├── Generate signed tokens for auto-login
└── Better user experience

Later: Option C (Shared Sessions)
├── Set up shared session database
├── Modify both apps to use it
└── Seamless experience
```

---

## ⚠️ CRITICAL: API Key vs User Token

### The Problem: One API Key = Data Mixing

**WARNING:** If you use ONE API key for ALL users, ALL data will be saved under the same user!

```
❌ WRONG APPROACH:

Your External App: User_A, User_B, User_C
                         │
                         ▼
              ONE API Key (belongs to: admin_user)
                         │
                         ▼
Eduator Database:

| exam_id | title      | created_by    |
|---------|------------|---------------|
| ex1     | Math       | admin_user    | ← User_A created this
| ex2     | History    | admin_user    | ← User_B created this
| ex3     | Science    | admin_user    | ← User_C created this

ALL DATA BELONGS TO SAME USER!
After re-login: Everyone sees ALL exams! 😱
```

### Why This Happens

```
One API Key = One User Identity in Eduator

User_A creates exam → saved as admin_user's exam
User_B creates exam → saved as admin_user's exam
User_C creates exam → saved as admin_user's exam

All mixed together! ❌
```

### The Solution

**Each user needs their OWN Eduator account and token:**

```
✅ CORRECT APPROACH:

External App          Eduator
─────────────         ─────────────
User_A      ────────► user_a@... (own account, own token, own data)
User_B      ────────► user_b@... (own account, own token, own data)
User_C      ────────► user_c@... (own account, own token, own data)

Each user → own token → own data ✅
```

### Implementation Options

#### Option 1: Per-User Authentication (Recommended)

When user opens Eduator from your app:
1. Check if user has Eduator account (by email)
2. If not: create account via API
3. Authenticate as THAT user
4. User gets their own token
5. All data saved under their user ID

```
Your App                          Eduator
────────                          ─────────
User clicks "Open Eduator"
     │
     ├─► Check: Does user exist?
     │        GET /api/users?email=user@...
     │
     ├─► If No: Create user
     │        POST /api/auth/register
     │        { email, password, name, role }
     │
     ├─► Authenticate AS that user
     │        POST /api/auth/login
     │        { email, password }
     │        → Returns: user_token
     │
     └─► Use user_token for all requests
              (NOT shared API key!)
```

#### Option 2: External User ID Field (If you MUST use one API key)

Add extra field to track real owner:

```sql
-- Modified table structure
| exam_id | title   | created_by  | external_user_id |
|---------|---------|-------------|------------------|
| ex1     | Math    | admin_user  | User_A           | ← Now we know!
| ex2     | History | admin_user  | User_B           |
| ex3     | Science | admin_user  | User_C           |
```

API calls include external_user_id:
```
POST /api/exams
{
  "title": "Math Exam",
  "external_user_id": "User_A"  ← Track real owner
}

GET /api/exams?external_user_id=User_A  ← Filter by real owner
```

**Note:** This requires database schema changes in Eduator.

#### Option 3: On-Behalf-Of Header (Enterprise)

API Key has permission to act on behalf of users:

```
POST /api/exams
Headers:
  Authorization: Bearer YOUR_API_KEY
  X-On-Behalf-Of: user_a@email.com  ← Acting as this user

Eduator creates exam as user_a, not as API key owner
```

### Comparison Table

| Approach | Complexity | Data Separation | Best For |
|----------|------------|-----------------|----------|
| ❌ One API Key | Low | No separation | DON'T USE |
| ✅ Per-User Auth | Medium | Perfect | Most cases |
| ⚠️ External ID | Medium | Manual filter | Legacy systems |
| ✅ On-Behalf-Of | High | Perfect | Enterprise |

### Summary

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  One API Key for All Users = DATA DISASTER            │
│                                                        │
│  ✅ Solution: Each user needs their own account       │
│              and their own authentication token        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Security Considerations

| Area | Recommendation |
|------|----------------|
| **API Keys** | Rotate every 90 days |
| **JWT Tokens** | Short expiry (1 hour) |
| **Webhooks** | Always verify signatures |
| **FDW** | Use read-only DB user |
| **Data** | Encrypt in transit (HTTPS/SSL) |
| **SSO Tokens** | Sign with RSA, expire in 5 minutes |
| **Shared Sessions** | Encrypt tokens at rest |

---

## Support

For integration assistance:
- Technical docs: `/docs/TECHNICAL.md`
- API reference: `/docs/API.md`
- Contact: integration@eduator.ai
