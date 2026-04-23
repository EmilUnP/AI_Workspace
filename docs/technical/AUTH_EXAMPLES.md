# Authentication Examples: Backend, ERP, and ERP Integration

This document provides practical examples of how authentication works across the Eduator AI system, including interactions with the backend API, ERP app, and ERP app.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Client-Side Authentication (Browser)](#client-side-authentication-browser)
3. [Server-Side Authentication (Next.js)](#server-side-authentication-nextjs)
4. [Backend API Authentication](#backend-api-authentication)
5. [ERP App Flow](#erp-app-flow)
6. [ERP App Flow](#erp-app-flow)
7. [Complete Integration Example](#complete-integration-example)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Eduator AI Authentication                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │   ERP App    │    │   ERP App   │    │  API Server  │    │
│  │ (localhost:  │    │ (localhost:  │    │ (localhost:  │    │
│  │    3000)     │    │    3001)     │    │    4000)     │    │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘    │
│         │                   │                   │            │
│         └───────────────────┴───────────────────┘            │
│                            │                                   │
│                            ▼                                   │
│                  ┌──────────────────┐                          │
│                  │   Supabase Auth  │                          │
│                  │   (JWT Tokens)   │                          │
│                  └────────┬─────────┘                          │
│                           │                                    │
│                           ▼                                    │
│                  ┌──────────────────┐                          │
│                  │  PostgreSQL DB   │                          │
│                  │  (profiles, etc) │                          │
│                  └──────────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Components:**
- **ERP App**: Admin interface for platform owners and school admins
- **ERP App**: Self-service interface for teachers and students
- **API Server**: RESTful backend API (Fastify)
- **Supabase**: Authentication provider and database
- **Shared Database**: Single source of truth for users and profiles

---

## Client-Side Authentication (Browser)

### Example 1: User Login in ERP App

```typescript
// File: apps/erp-app/src/app/auth/login/page.tsx
'use client'

import { signInWithPassword } from '@eduator/auth'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Use client-side auth function
    const { data, error: authError } = await signInWithPassword(email, password)

    if (authError) {
      setError(authError.message)
      return
    }

    if (data?.user) {
      // Redirect based on user role (handled by middleware)
      router.push('/dashboard')
    }
  }

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      {error && <p className="error">{error}</p>}
      <button type="submit">Login</button>
    </form>
  )
}
```

**What happens:**
1. User enters credentials
2. `signInWithPassword` calls Supabase Auth API
3. Supabase validates credentials and returns JWT token
4. Token is stored in browser cookies (via `@supabase/ssr`)
5. User is redirected based on profile type

---

### Example 2: Getting Current User (Client-Side)

```typescript
// File: apps/erp-app/src/components/user-profile.tsx
'use client'

import { getUser, getSession } from '@eduator/auth'
import { useEffect, useState } from 'react'

export default function UserProfile() {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)

  useEffect(() => {
    async function loadUser() {
      // Get current user
      const currentUser = await getUser()
      setUser(currentUser)

      // Get current session
      const currentSession = await getSession()
      setSession(currentSession)
    }

    loadUser()
  }, [])

  if (!user) {
    return <div>Not logged in</div>
  }

  return (
    <div>
      <h2>Welcome, {user.email}</h2>
      <p>User ID: {user.id}</p>
      <p>Session expires: {session?.expires_at}</p>
    </div>
  )
}
```

---

### Example 3: OAuth Login (Google/GitHub)

```typescript
// File: apps/erp-app/src/components/oauth-login.tsx
'use client'

import { signInWithOAuth } from '@eduator/auth'

export default function OAuthLogin() {
  const handleGoogleLogin = async () => {
    const { data, error } = await signInWithOAuth('google', 
      `${window.location.origin}/auth/callback`
    )

    if (error) {
      console.error('OAuth error:', error)
      return
    }

    // Redirect to OAuth provider
    if (data?.url) {
      window.location.href = data.url
    }
  }

  const handleGitHubLogin = async () => {
    const { data, error } = await signInWithOAuth('github',
      `${window.location.origin}/auth/callback`
    )

    if (error) {
      console.error('OAuth error:', error)
      return
    }

    if (data?.url) {
      window.location.href = data.url
    }
  }

  return (
    <div>
      <button onClick={handleGoogleLogin}>Login with Google</button>
      <button onClick={handleGitHubLogin}>Login with GitHub</button>
    </div>
  )
}
```

---

## Server-Side Authentication (Next.js)

### Example 4: Server Action Login (ERP App)

```typescript
// File: apps/erp-app/src/app/auth/login/actions.ts
'use server'

import { createServerClient, getServerUser } from '@eduator/auth'
import { redirect } from 'next/navigation'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Create server client (handles cookies automatically)
  const supabase = await createServerClient()

  // Sign in user
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  if (!data.user) {
    return { error: 'Login failed' }
  }

  // Get user profile to determine redirect
  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_type, approval_status, organization_id, source')
    .eq('user_id', data.user.id)
    .single()

  if (!profile) {
    return { error: 'Profile not found' }
  }

  // Check approval status
  if (profile.approval_status === 'pending') {
    redirect('/auth/pending-approval')
  }

  if (profile.approval_status === 'rejected') {
    redirect('/auth/access-denied')
  }

  // Demo organization ID for ERP self-registered users
  const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001'
  
  // Check if user is from ERP (self-registered) or ERP (organization-created)
  const isSaasUser = profile.source === 'ERP' || 
                     profile.organization_id === DEMO_ORG_ID || 
                     !profile.organization_id

  // Redirect based on role and source
  switch (profile.profile_type) {
    case 'teacher':
      if (isSaasUser) {
        redirect('/teacher') // Stay in ERP app
      } else {
        const erpBaseUrl = (process.env.NEXT_PUBLIC_ERP_URL || 'http://localhost:3001').replace(/\/+$/, '')
        redirect(`${erpBaseUrl}/teacher`) // Go to ERP app
      }
    case 'student':
      if (isSaasUser) {
        redirect('/student') // Stay in ERP app
      } else {
        const erpBaseUrl = (process.env.NEXT_PUBLIC_ERP_URL || 'http://localhost:3001').replace(/\/+$/, '')
        redirect(`${erpBaseUrl}/student`) // Go to ERP app
      }
    default:
      redirect('/')
  }
}
```

**Key Points:**
- Server actions run on the server, so cookies are handled securely
- Profile is checked to determine user type and redirect destination
- ERP users (self-registered) stay in ERP app
- ERP users (created by organization) are redirected to ERP app

---

### Example 5: Protected Server Component

```typescript
// File: apps/erp-app/src/app/teacher/dashboard/page.tsx
import { getServerUser, getUserProfileWithOrganization } from '@eduator/auth'
import { redirect } from 'next/navigation'

export default async function TeacherDashboard() {
  // Get current user (server-side)
  const user = await getServerUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile with organization details
  const profile = await getUserProfileWithOrganization()

  if (!profile) {
    redirect('/auth/login')
  }

  // Verify user is a teacher
  if (profile.profile_type !== 'teacher') {
    redirect('/unauthorized')
  }

  // Check approval status
  if (profile.approval_status !== 'approved') {
    redirect('/auth/pending-approval')
  }

  return (
    <div>
      <h1>Teacher Dashboard</h1>
      <p>Welcome, {profile.full_name}</p>
      {profile.organization && (
        <div>
          <h2>Organization: {profile.organization.name}</h2>
          <p>Plan: {profile.organization.subscription_plan}</p>
        </div>
      )}
    </div>
  )
}
```

---

### Example 6: API Route with Authentication

```typescript
// File: apps/erp-app/src/app/api/teacher/exams/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, verifyAuth } from '@eduator/auth'
import { createServerClient } from '@eduator/auth'

export async function GET(request: NextRequest) {
  // Verify authentication
  const { user, error } = await verifyAuth()

  if (error || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Get user profile
  const supabase = await createServerClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_type, organization_id')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.profile_type !== 'teacher') {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }

  // Fetch exams for this teacher
  const { data: exams, error: examsError } = await supabase
    .from('exams')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  if (examsError) {
    return NextResponse.json(
      { error: examsError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ exams })
}
```

---

## Backend API Authentication

### Example 7: Calling Backend API from Frontend

```typescript
// File: apps/erp-app/src/lib/api-client.ts
import { getSession } from '@eduator/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get current session to extract JWT token
  const session = await getSession()

  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }

  // Make request with JWT token in Authorization header
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'API request failed')
  }

  return response
}

// Usage example
export async function getTeacherExams() {
  const response = await apiRequest('/api/v1/teacher/exams')
  const data = await response.json()
  return data
}

export async function createExam(examData: any) {
  const response = await apiRequest('/api/v1/teacher/exams', {
    method: 'POST',
    body: JSON.stringify(examData),
  })
  const data = await response.json()
  return data
}
```

**Usage in Component:**

```typescript
// File: apps/erp-app/src/components/exam-list.tsx
'use client'

import { getTeacherExams } from '@/lib/api-client'
import { useEffect, useState } from 'react'

export default function ExamList() {
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadExams() {
      try {
        const data = await getTeacherExams()
        setExams(data.exams || [])
      } catch (error) {
        console.error('Failed to load exams:', error)
      } finally {
        setLoading(false)
      }
    }

    loadExams()
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h2>My Exams</h2>
      {exams.map((exam: any) => (
        <div key={exam.id}>
          <h3>{exam.title}</h3>
          <p>{exam.description}</p>
        </div>
      ))}
    </div>
  )
}
```

---

### Example 8: Backend API Route (Fastify)

```typescript
// File: packages/api-server/src/routes/v1/teacher/exams.ts
import { FastifyInstance } from 'fastify'
import { authMiddleware, requireRole } from '../../middleware/auth'

export async function teacherRoutes(fastify: FastifyInstance) {
  // Apply authentication middleware to all routes
  fastify.addHook('preHandler', authMiddleware)

  // Get all exams for authenticated teacher
  fastify.get('/exams', {
    preHandler: requireRole('teacher'),
  }, async (request, reply) => {
    const userId = request.user!.id
    const supabase = getSupabaseAdmin()

    // Fetch exams created by this teacher
    const { data: exams, error } = await supabase
      .from('exams')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return reply.code(500).send({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: error.message,
        },
      })
    }

    return reply.send({
      success: true,
      data: { exams },
    })
  })

  // Create new exam
  fastify.post('/exams', {
    preHandler: requireRole('teacher'),
  }, async (request, reply) => {
    const userId = request.user!.id
    const { title, description, class_id } = request.body as any
    const supabase = getSupabaseAdmin()

    const { data: exam, error } = await supabase
      .from('exams')
      .insert({
        title,
        description,
        class_id,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      return reply.code(500).send({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: error.message,
        },
      })
    }

    return reply.code(201).send({
      success: true,
      data: { exam },
    })
  })
}
```

**What happens:**
1. Client sends request with `Authorization: Bearer <jwt_token>`
2. `authMiddleware` validates JWT token with Supabase
3. User profile is fetched and attached to request
4. `requireRole('teacher')` checks if user is a teacher
5. Route handler executes with authenticated user context

---

## ERP App Flow

### Example 9: ERP Login and Redirect

```typescript
// File: apps/erp-app/src/app/(auth)/auth/login/actions.ts
'use server'

import { createServerClient } from '@eduator/auth'
import { redirect } from 'next/navigation'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createServerClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  if (!data.user) {
    return { error: 'Login failed' }
  }

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_type, approval_status, organization_id')
    .eq('user_id', data.user.id)
    .single()

  if (!profile) {
    return { error: 'Profile not found' }
  }

  // Check approval
  if (profile.approval_status === 'pending') {
    redirect('/auth/pending-approval')
  }

  if (profile.approval_status === 'rejected') {
    redirect('/auth/access-denied')
  }

  // ERP app redirects based on role
  switch (profile.profile_type) {
    case 'platform_owner':
      redirect('/platform-owner')
    case 'school_superadmin':
      redirect('/school-admin')
    case 'teacher':
    case 'student':
      // Teachers and students should use ERP app
      redirect((process.env.NEXT_PUBLIC_ERP_URL || 'http://localhost:3002').replace(/\/+$/, ''))
    default:
      redirect('/')
  }
}
```

**Key Differences from ERP:**
- ERP app is for admin roles (platform_owner, school_superadmin)
- Teachers and students are redirected to ERP app
- ERP handles organization management and user creation

---

### Example 10: Creating User in ERP (Admin Function)

```typescript
// File: apps/erp-app/src/app/platform-owner/users/actions.ts
'use server'

import { adminCreateUser, adminCreateProfile } from '@eduator/auth'
import { createServerClient } from '@eduator/auth'

export async function createUserAction(formData: FormData) {
  // Verify current user is platform owner
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_type')
    .eq('user_id', user.id)
    .single()

  if (profile?.profile_type !== 'platform_owner') {
    return { error: 'Unauthorized' }
  }

  // Create user with admin privileges
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const profileType = formData.get('profileType') as string
  const organizationId = formData.get('organizationId') as string

  // Create auth user
  const { data: newUser, error: userError } = await adminCreateUser(
    email,
    password,
    {
      full_name: fullName,
    },
    true // email_confirm = true (skip email verification)
  )

  if (userError || !newUser.user) {
    return { error: userError?.message || 'Failed to create user' }
  }

  // Create profile
  const { data: newProfile, error: profileError } = await adminCreateProfile({
    user_id: newUser.user.id,
    profile_type: profileType,
    organization_id: organizationId || null,
    full_name: fullName,
    email: email,
    approval_status: 'approved', // Auto-approve admin-created users
  })

  if (profileError) {
    return { error: profileError.message }
  }

  return { success: true, user: newUser.user, profile: newProfile }
}
```

---

## ERP App Flow

### Example 11: Self-Registration in ERP

```typescript
// File: apps/erp-app/src/app/auth/register/actions.ts
'use server'

import { signUp } from '@eduator/auth'
import { createServerClient } from '@eduator/auth'
import { redirect } from 'next/navigation'

export async function registerAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const profileType = formData.get('profileType') as 'teacher' | 'student'

  // Sign up user
  const { data, error } = await signUp(email, password, {
    full_name: fullName,
    profile_type: profileType,
  })

  if (error) {
    return { error: error.message }
  }

  if (!data.user) {
    return { error: 'Registration failed' }
  }

  // Create profile (using admin client to bypass RLS)
  const supabase = await createServerClient()
  
  // Use service role for profile creation (admin function)
  const { createAdminClient, adminCreateProfile } = await import('@eduator/auth')
  const adminClient = createAdminClient()

  // Demo organization ID for self-registered users
  const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001'

  const { data: profile, error: profileError } = await adminCreateProfile({
    user_id: data.user.id,
    profile_type: profileType,
    organization_id: DEMO_ORG_ID, // Assign to demo organization
    full_name: fullName,
    email: email,
    approval_status: 'pending', // Requires approval
    source: 'ERP', // Mark as self-registered
  })

  if (profileError) {
    return { error: profileError.message }
  }

  // Redirect to pending approval page
  redirect('/auth/pending-approval')
}
```

**Key Points:**
- ERP users self-register
- They're assigned to a demo organization
- Approval status is 'pending' (requires admin approval)
- Source is marked as 'ERP' to distinguish from ERP-created users

---

## Complete Integration Example

### Example 12: Full Flow - Teacher Creates Exam

This example shows the complete flow from login to creating an exam:

```typescript
// ============================================
// STEP 1: User logs in (ERP App)
// ============================================
// File: apps/erp-app/src/app/auth/login/page.tsx
'use client'

import { signInWithPassword } from '@eduator/auth'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  const handleLogin = async (email: string, password: string) => {
    // Client-side login
    const { data, error } = await signInWithPassword(email, password)
    
    if (error) {
      console.error('Login error:', error)
      return
    }

    // Redirect to dashboard (middleware handles role-based routing)
    router.push('/teacher/dashboard')
  }

  // ... rest of component
}

// ============================================
// STEP 2: Dashboard loads (Server Component)
// ============================================
// File: apps/erp-app/src/app/teacher/dashboard/page.tsx
import { getServerUser, getUserProfileWithOrganization } from '@eduator/auth'
import { redirect } from 'next/navigation'
import ExamList from '@/components/exam-list'

export default async function TeacherDashboard() {
  // Verify authentication
  const user = await getServerUser()
  if (!user) redirect('/auth/login')

  // Get profile
  const profile = await getUserProfileWithOrganization()
  if (!profile || profile.profile_type !== 'teacher') {
    redirect('/unauthorized')
  }

  return (
    <div>
      <h1>Welcome, {profile.full_name}</h1>
      <ExamList />
    </div>
  )
}

// ============================================
// STEP 3: Load exams (Client Component)
// ============================================
// File: apps/erp-app/src/components/exam-list.tsx
'use client'

import { getTeacherExams, createExam } from '@/lib/api-client'
import { useState, useEffect } from 'react'

export default function ExamList() {
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadExams()
  }, [])

  async function loadExams() {
    try {
      // Calls backend API with JWT token
      const data = await getTeacherExams()
      setExams(data.exams || [])
    } catch (error) {
      console.error('Failed to load exams:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateExam() {
    try {
      // Create exam via backend API
      const newExam = await createExam({
        title: 'Math Quiz',
        description: 'Basic math questions',
        class_id: 'class-uuid',
      })
      
      // Reload exams
      await loadExams()
    } catch (error) {
      console.error('Failed to create exam:', error)
    }
  }

  return (
    <div>
      <button onClick={handleCreateExam}>Create Exam</button>
      {exams.map((exam: any) => (
        <div key={exam.id}>{exam.title}</div>
      ))}
    </div>
  )
}

// ============================================
// STEP 4: API Client (Handles Auth)
// ============================================
// File: apps/erp-app/src/lib/api-client.ts
import { getSession } from '@eduator/auth'

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '')

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  // Get JWT token from session
  const session = await getSession()
  
  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }

  // Make authenticated request
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Request failed')
  }

  return response.json()
}

export async function getTeacherExams() {
  return apiRequest('/api/v1/teacher/exams')
}

export async function createExam(examData: any) {
  return apiRequest('/api/v1/teacher/exams', {
    method: 'POST',
    body: JSON.stringify(examData),
  })
}

// ============================================
// STEP 5: Backend API Route
// ============================================
// File: packages/api-server/src/routes/v1/teacher/exams.ts
import { FastifyInstance } from 'fastify'
import { authMiddleware, requireRole } from '../../middleware/auth'

export async function teacherRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authMiddleware)

  // GET /api/v1/teacher/exams
  fastify.get('/exams', {
    preHandler: requireRole('teacher'),
  }, async (request, reply) => {
    // request.user is set by authMiddleware
    const userId = request.user!.id
    
    // Fetch exams from database
    const { data: exams } = await supabase
      .from('exams')
      .select('*')
      .eq('created_by', userId)

    return reply.send({ success: true, data: { exams } })
  })

  // POST /api/v1/teacher/exams
  fastify.post('/exams', {
    preHandler: requireRole('teacher'),
  }, async (request, reply) => {
    const userId = request.user!.id
    const { title, description, class_id } = request.body as any

    // Create exam
    const { data: exam } = await supabase
      .from('exams')
      .insert({
        title,
        description,
        class_id,
        created_by: userId, // Automatically set from authenticated user
      })
      .select()
      .single()

    return reply.code(201).send({ success: true, data: { exam } })
  })
}
```

**Complete Flow:**
1. User logs in → JWT token stored in cookies
2. Dashboard loads → Server verifies auth, gets profile
3. Component loads → Client fetches exams via API
4. API client → Adds JWT token to Authorization header
5. Backend API → Validates token, checks role, returns data
6. Component → Displays exams

---

## Key Takeaways

### Authentication Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    Authentication Flow                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User Login                                              │
│     └─► Supabase Auth → JWT Token → Cookies                │
│                                                             │
│  2. Client-Side Requests                                    │
│     └─► getSession() → Extract Token → API Request          │
│                                                             │
│  3. Server-Side Requests                                    │
│     └─► createServerClient() → Auto-reads Cookies          │
│                                                             │
│  4. Backend API Requests                                    │
│     └─► Authorization: Bearer <token> → Validate → Process  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### ERP vs ERP Differences

| Aspect | ERP App | ERP App |
|--------|---------|----------|
| **Users** | Platform owners, School admins | Teachers, Students |
| **User Creation** | Admin creates users | Self-registration |
| **Organization** | Required (assigned by admin) | Demo org (self-registered) |
| **Approval** | Auto-approved | Pending (requires approval) |
| **Source** | `source: 'erp'` | `source: 'ERP'` |
| **Redirect** | Stays in ERP | Stays in ERP (or redirects to ERP) |

### Security Best Practices

1. **Always verify authentication** on server-side
2. **Use role-based authorization** (`requireRole`)
3. **Check approval status** before allowing access
4. **Validate JWT tokens** on every API request
5. **Use admin client** only for server-side operations
6. **Never expose service role key** to client-side code

---

## Environment Variables

```bash
# Required for all apps
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Required for server-side/admin operations
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Required for API server
API_PORT=4000
API_HOST=0.0.0.0
```

---

## Testing Authentication

### Test Login Flow

```typescript
// Test file: apps/erp-app/__tests__/auth.test.ts
import { signInWithPassword, getUser } from '@eduator/auth'

describe('Authentication', () => {
  it('should login user', async () => {
    const { data, error } = await signInWithPassword(
      'teacher@example.com',
      'password123'
    )

    expect(error).toBeNull()
    expect(data?.user).toBeDefined()
  })

  it('should get current user', async () => {
    const user = await getUser()
    expect(user).toBeDefined()
    expect(user?.email).toBe('teacher@example.com')
  })
})
```

---

## Troubleshooting

### Common Issues

1. **"Missing Supabase environment variables"**
   - Check `.env` file has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **"Unauthorized" errors**
   - Verify JWT token is included in Authorization header
   - Check token hasn't expired
   - Ensure user profile exists and is approved

3. **"Forbidden" errors**
   - Check user has correct `profile_type` for the route
   - Verify `approval_status` is 'approved'

4. **Cookies not persisting**
   - Ensure `@supabase/ssr` is configured correctly
   - Check cookie settings (domain, secure, sameSite)

---

For more information, see:
- [API Documentation](../API.md)
- [Integration Guide](./INTEGRATION_GUIDE.md)
- Auth package implementation in `packages/auth/src`
