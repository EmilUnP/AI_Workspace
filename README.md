# 🎓 Eduator AI v2.1

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/your-repo)
[![Status](https://img.shields.io/badge/status-stable-green.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-20+-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.7-blue.svg)](https://www.typescriptlang.org)

> **AI-Powered Educational Platform** - Transforming learning through intelligent automation

## 🚀 Quick Start

```bash
# Clone and install dependencies
git clone <repository-url>
cd eduator-ai-v2
npm install

# Configure environment
# Copy the example env file and add your keys
# See .env.example for required variables

# Launch development servers
npm run dev:api    # API Server → http://localhost:4000
npm run dev:erp    # ERP App → http://localhost:3001
npm run dev:ERP   # ERP App → http://localhost:3002
```

## 📚 Project Structure

```
eduator-ai-v2/
├── apps/
│   ├── erp-app/          # Platform Owner & School Admin UI (Next.js)
│   └── erp-app/         # Teacher & Student UI (Next.js)
├── packages/
│   ├── api-server/       # Fastify REST API
│   ├── api-client/       # HTTP Client & React Query hooks
│   ├── core/             # Types, validation, stores, utilities
│   ├── auth/             # Supabase authentication
│   ├── db/               # Database repositories
│   ├── ai/               # Google Gemini AI services
│   ├── ui/               # React component library
│   └── config/           # Shared configuration
└── docs/                 # Documentation
```

## 🛠️ Tech Stack

| Category | Technologies |
|----------|--------------|
| **Frontend** | Next.js 15, React 19, TypeScript 5.7, TailwindCSS |
| **Backend** | Fastify 4.x, Node.js 20 |
| **Database** | Supabase (PostgreSQL) |
| **AI** | Google Gemini 1.5 Pro/Flash |
| **State** | TanStack Query, Zustand |
| **Auth** | Supabase Auth (JWT) |

## 📦 Packages Overview

### `@eduator/api-server`
High-performance Fastify REST API with:
- JWT authentication via Supabase tokens
- Role-based access control (RBAC)
- OpenAPI 3.0 documentation at `/docs`
- Rate limiting and structured logging

### `@eduator/api-client`
Type-safe HTTP client with React Query integration:
```typescript
import { apiClient, useOrganizations } from '@eduator/api-client'

// Direct API calls
const { data } = await apiClient.get('/api/v1/profile')

// React Query hooks
const { data: orgs, isLoading } = useOrganizations()
```

### `@eduator/core`
Shared business logic:
- TypeScript interfaces for all entities
- Zod validation schemas
- Zustand stores (auth, exam, UI)
- Custom React hooks
- Utility functions

### `@eduator/auth`
Supabase authentication layer:
```typescript
// Client-side
import { signInWithPassword } from '@eduator/auth'

// Server-side (SSR)
import { createServerClient } from '@eduator/auth/supabase/server'

// Admin operations
import { adminCreateUser } from '@eduator/auth/supabase/admin'
```

### `@eduator/ai`
Google Gemini AI integration:
```typescript
import { questionGenerator, createChatbot } from '@eduator/ai'

// Generate exam questions from document
const result = await questionGenerator.generateFromDocument({
  documentText: 'Your content...',
  settings: { question_count: 10, ... }
})

// AI Teaching Assistant
const chatbot = createChatbot({ student_grade_level: 'grade_9' })
const response = await chatbot.sendMessage('Explain photosynthesis')
```

### `@eduator/ui`
React component library with:
- Base components (Button, Card, Input, Dialog)
- Navigation (Sidebar, Navbar)
- Analytics (StatCard, DashboardCard)
- Exam components (QuestionCard)

## 🔑 Environment Variables

Create a `.env.local` file with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Google Gemini AI
GOOGLE_GENERATIVE_AI_KEY=your-gemini-key

# API
NEXT_PUBLIC_API_URL=http://localhost:4000
API_PORT=4000
```

## 🗄️ Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the migration SQL in `packages/db/src/migrations/001_initial_schema.sql`
3. Configure environment variables

## 👥 User Roles

| Role | Access | App |
|------|--------|-----|
| **Platform Owner** | Full platform access, manage all organizations | ERP App |
| **School Admin** | Manage organization users and classes | ERP App |
| **Teacher** | Create exams, manage classes, view analytics | ERP App |
| **Student** | Take exams, use AI tutor, track progress | ERP App |

## 📡 API Endpoints

### Health & Info
```
GET  /health                    # Health check
GET  /ready                     # Readiness check
GET  /api/v1                    # API information and version
```

### Profile Management
```
GET  /api/v1/profile            # Get current user profile
PUT  /api/v1/profile            # Update user profile
```

### Platform Owner
```
# Organizations
GET    /api/v1/platform-owner/organizations          # List all organizations
GET    /api/v1/platform-owner/organizations/:id      # Get organization details
POST   /api/v1/platform-owner/organizations          # Create organization
PUT    /api/v1/platform-owner/organizations/:id      # Update organization
DELETE /api/v1/platform-owner/organizations/:id      # Delete organization
PATCH  /api/v1/platform-owner/organizations/:id/status # Update organization status

# Users
GET    /api/v1/platform-owner/users                  # List all users
GET    /api/v1/platform-owner/users/pending-count    # Get pending approvals count
GET    /api/v1/platform-owner/users/search           # Search users
GET    /api/v1/platform-owner/users/:id              # Get user details
PATCH  /api/v1/platform-owner/users/:id/approve      # Approve user
PATCH  /api/v1/platform-owner/users/:id/reject       # Reject user
PATCH  /api/v1/platform-owner/users/:id/suspend      # Suspend user
DELETE /api/v1/platform-owner/users/:id              # Delete user

# Reports
GET    /api/v1/platform-owner/reports                # Get platform reports
GET    /api/v1/platform-owner/reports/analytics      # Get platform analytics
GET    /api/v1/platform-owner/reports/usage          # Get usage statistics
```

### School Admin
```
GET    /api/v1/school-admin/dashboard                # Get dashboard overview
GET    /api/v1/school-admin/users                    # List organization users
PATCH  /api/v1/school-admin/users/:id/approve        # Approve user in organization
PATCH  /api/v1/school-admin/users/:id/reject         # Reject user in organization
GET    /api/v1/school-admin/classes                  # List organization classes
GET    /api/v1/school-admin/reports                  # Get organization reports
```

### Teacher
```
# Dashboard
GET    /api/v1/teacher/dashboard                     # Get teacher dashboard

# Exams
GET    /api/v1/teacher/exams                         # List teacher exams (with pagination/filters)
GET    /api/v1/teacher/exams/:id                     # Get exam details with questions
POST   /api/v1/teacher/exams                         # Create new exam
POST   /api/v1/teacher/exams/generate                # AI-powered exam generation from documents
PUT    /api/v1/teacher/exams/:id                     # Update exam
PATCH  /api/v1/teacher/exams/:id/publish             # Publish/unpublish exam
DELETE /api/v1/teacher/exams/:id                     # Delete exam

# Classes
GET    /api/v1/teacher/classes                       # List teacher classes
POST   /api/v1/teacher/classes                       # Create new class
GET    /api/v1/teacher/classes/:id/students          # Get students in class

# Analytics
GET    /api/v1/teacher/analytics                     # Get teacher analytics
```

### Student
```
# Dashboard
GET    /api/v1/student/dashboard                     # Get student dashboard

# Classes
GET    /api/v1/student/classes                       # List enrolled classes
POST   /api/v1/student/classes/join                  # Join class by code

# Exams
GET    /api/v1/student/exams                         # List available exams
GET    /api/v1/student/exams/:id                     # Get exam details for taking
POST   /api/v1/student/exams/:id/start               # Start exam attempt
POST   /api/v1/student/exams/:id/submit              # Submit exam answers

# AI Tutor
POST   /api/v1/student/chatbot                       # Chat with AI tutor

# Progress
GET    /api/v1/student/progress                      # Get student progress and analytics
```

### Authentication
Authentication is handled via Supabase Auth. JWT tokens are obtained through:
- Client-side: `@eduator/auth` package
- Server-side: Supabase session management

All protected endpoints require the JWT token in the `Authorization` header:
```
Authorization: Bearer <your-jwt-token>
```

### Response Format
All API responses follow this structure:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

Error responses:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": []
  }
}
```

### Full API Documentation
Interactive OpenAPI/Swagger documentation available at:
- **Development**: `http://localhost:4000/docs`
- **Production**: `https://api.eduator.ai/docs`

The Swagger UI provides:
- Complete endpoint documentation
- Request/response schemas
- Interactive API testing
- Authentication token input
- Code examples

## 🎨 Theme

The platform uses a **green** color scheme [[memory:6083103]] as the primary theme:

```css
primary-500: #22c55e
primary-600: #16a34a
primary-700: #15803d
```

## 📝 Development Scripts

```bash
# Development
npm run dev:api       # Start API server
npm run dev:erp       # Start ERP app
npm run dev:ERP      # Start ERP app
npm run dev:all       # Start all services

# Build
npm run build         # Build all packages and apps

# Code Quality
npm run lint          # Run ESLint
npm run format        # Run Prettier
npm run type-check    # TypeScript check
```

## 🚀 Deployment

### Frontend (Vercel)
```bash
# ERP App
cd apps/erp-app && vercel

# ERP App  
cd apps/erp-app && vercel
```

### API Server
Deploy to Railway, Fly.io, or any Node.js hosting:
```bash
cd packages/api-server
npm run build
npm start
```

## 📚 Documentation

- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and changes
- **[docs/FEATURES.md](./docs/FEATURES.md)** - Comprehensive feature documentation
- **[docs/ROADMAP.md](./docs/ROADMAP.md)** - Product roadmap and future plans
- **[docs/APP_MAIN_PARTS.md](./docs/APP_MAIN_PARTS.md)** - Simple management overview of key app parts

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🎉 Version 1.0.5 - Current Release

Final exam quality and security upgrades with randomized question pools.

### ✨ New in 1.0.5

✅ **Randomized final exam mode**: Teachers/admins can create a question pool and set questions per attempt (e.g. pick 30 from pool 100).  
✅ **Per-student randomized delivery**: Students receive non-duplicate random subsets from the selected pool.  
✅ **Scoring/results alignment**: Score and review now use the same effective question set shown to that student.  
✅ **Final exam UX improvements**: Select-all now toggles to unselect-all; list/detail pages show question mode and questions-per-attempt.  
✅ **Post-generation exam title editing**: Exam title can now be edited after AI generation.

### ✨ Previous release (1.0.4)

✅ **Prompt engineering hardening**: Stronger quality rules across lesson/exam/question/course/plan/chatbot generation for direct, professional educational writing.  
✅ **Anti-filler safeguards**: Added explicit prompt constraints and explanation sanitization to remove low-value source-referencing intros in any language.  
✅ **Explanation quality upgrades**: Cleaner mini-test/exam explanation style and more professional fallback phrasing.  
✅ **Roadmap refresh**: Future plans section was rebuilt to reflect practical near-term priorities.

### ✨ Earlier release (1.0.3)

✅ **Exam generation accuracy**: Stronger topic parsing and stricter topic/count enforcement in generated exams.  
✅ **Course Step 3 UX refresh**: Cleaner final exam settings UI with compact/collapsible controls and clearer summaries.  
✅ **Lesson Mermaid reliability**: Mermaid rendering support hardened with normalization/repair for malformed AI diagram output.  
✅ **Slider consistency**: Unified filled-track slider visuals in both course creation and exam creator.

### ✨ Earlier release (1.0.2)

✅ **Auth UX updates**: Improved login and forgot-password flow/messages in ERP and ERP.  
✅ **Lesson generation updates**: Prompt and behavior refinements for AI lesson generation quality.

### ✨ Earlier release (1.0.1)

✅ **Single marketing source**: ERP duplicate public pages (`/`, `/about`, `/pricing`, `/services`) removed; ERP remains the marketing home.  
✅ **ERP routing behavior**: ERP root now redirects to `/auth/login`; ERP marketing routes redirect to the main marketing domain.  
✅ **Cross-app URL helpers**: Added URL helper modules in ERP and ERP for app/ERP/API/marketing links.  
✅ **ERP i18n cleanup**: Removed unused `home/about/services/pricing` namespaces from ERP public translations.

### ✨ Previous major release (1.0.0)

✅ **Full rebrand**: EduSpace → Eduator, `eduspace.ai` → `eduator.ai` across codebase, docs, and scripts.  
✅ **Package scope migration**: Workspace imports and package names aligned to `@eduator/*`.  
✅ **Release baseline**: Monorepo versioned to `1.0.0` as the first stable major release.  
✅ **Tooling stabilization**: Monorepo ESLint/Next configuration tightened for multi-app workspace behavior.

See [CHANGELOG.md](./CHANGELOG.md) for full version history and [ROADMAP.md](./docs/ROADMAP.md) for planned work.

---

Built with ❤️ for educators and students worldwide.
