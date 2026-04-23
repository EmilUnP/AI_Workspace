# Eduator AI - Technical Overview

## What We Built

An AI-powered educational platform for schools and universities. Teachers create exams and lessons using AI, get assistance from an AI Teaching Assistant (EduBot), and students learn with an AI Tutor.

---

## Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.x | React framework, App Router, Server Components |
| **React** | 19.x | UI library, hooks, state management |
| **TypeScript** | 5.7 | Type-safe JavaScript |
| **TailwindCSS** | 3.x | Utility-first CSS styling |
| **Headless UI** | 2.x | Accessible UI components |
| **Lucide React** | - | Icon library |
| **Zustand** | - | State management |
| **React Query** | - | Server state, caching |
| **Zod** | - | Schema validation |

---

## Backend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Fastify** | 4.x | REST API server |
| **Node.js** | 20.x | Runtime environment |
| **TypeScript** | 5.7 | Type-safe code |
| **Supabase** | - | Backend-as-a-Service |
| **PostgreSQL** | 15.x | Relational database |
| **JWT** | - | Authentication tokens |

---

## AI Stack

| Technology | Model | Purpose |
|------------|-------|---------|
| **Google Gemini** | 2.5 Flash | Text generation, exam questions, translations, AI Teaching Assistant/Tutor |
| **Google Gemini** | 2.5 Flash | Fallback text model |
| **Google Imagen** | 3.0 Pro / 2.5 Flash | Image generation for lessons |
| **Gemini TTS** | 2.5 Flash Preview | Text-to-speech audio |
| **Text Embedding** | text-embedding-004 | RAG embeddings for document-based context |

---

## UI Components & Styling

| Component | Style |
|-----------|-------|
| **Buttons** | Rounded, gradient backgrounds, hover effects |
| **Cards** | White background, border, shadow, rounded-xl |
| **Dialogs** | Gradient headers, backdrop blur, animations |
| **Forms** | Focus rings, validation states |
| **Tables** | Striped rows, hover highlights |
| **Badges** | Color-coded by status/role |

### Role-Based Color Themes
| Role | Color |
|------|-------|
| Platform Owner | Red (#dc2626) |
| School Admin | Orange (#ea580c) |
| Teacher | Blue (#2563eb) |
| Student | Blue accents |

---

## Database Structure

### Main Tables

| Table | Stores |
|-------|--------|
| **organizations** | Schools, universities (multi-tenant) |
| **profiles** | User accounts with roles |
| **classes** | Class groups with students |
| **documents** | Uploaded files (PDF, MD, TXT) |
| **exams** | AI-generated exams with translations |
| **lessons** | AI-generated lessons with images/audio, scheduling (start_time/end_time) |
| **courses** | Multi-lesson courses with final exams |
| **chat** | AI Teaching Assistant/Tutor conversations |
| **teacher_chat** | Teacher conversations with class assignments |
| **class_teachers** | Teacher-class assignments (simplified, no role distinction) |
| **class_email_invitations** | Secure class invite tokens, invited email, expiry, status, and redemption metadata |
| **feature_visibility_rules** | Global feature/page visibility toggles by app source (`erp`/`ERP`) and role (`teacher`/`student`) |

### Security
- Row-Level Security (RLS) on all tables
- Users only see data from their organization
- Teachers only see their own content

---

## How Authentication Works

1. User logs in with email/password
2. Supabase creates a JWT token
3. Token stored in browser cookies
4. All requests include this token
5. Server verifies token before responding

---

## Class Invitation Flow (Email + Share Link)

Teachers can invite students directly from class pages using secure, expiring links.

1. Teacher creates invite for a target email (`existing_only` or `allow_unregistered` mode).
2. System creates a random token, stores only SHA-256 hash in DB, and sets a short expiry window.
3. Invite link is sent by email when `RESEND_API_KEY` is configured; otherwise teacher gets a copyable share link.
4. Student opens `/invite/class/[token]`:
   - if not authenticated: redirected to login/signup with `next` preserved
   - if authenticated: server action redeems invite and enrolls student in class
5. Invite status is updated to prevent replay (expired/revoked/redeemed links are blocked).

**Key implementation files:**
- `apps/erp-app/src/lib/class-invite.ts` (token generation, hashing, expiry, link builder)
- `apps/erp-app/src/lib/invite-email.ts` (Resend email delivery + fallback behavior)
- `apps/erp-app/src/app/invite/class/[token]/page.tsx` (invite landing and redeem UX)
- `apps/erp-app/src/app/teacher/classes/invite-students-section.tsx` (teacher-side invite management UI)

## Feature Visibility Control (Platform Owner)

Platform Owner can control whether specific Teacher/Student pages are visible in ERP or ERP without code changes or rebuilds.

1. Owner configures toggles in ERP page: `/platform-owner/feature-visibility`.
2. Rules are stored in `feature_visibility_rules` with `(app_source, role, feature_key, enabled)`.
3. Teacher/Student layouts filter sidebar navigation from these rules.
4. Middleware blocks direct URL access to disabled features and redirects to role home.
5. Core routes like role dashboard/settings remain always enabled.

**Key implementation files:**
- `packages/core/src/utils/feature-visibility.ts` (feature registry + route matching helpers)
- `packages/db/src/repositories/feature-visibility.ts` (read/update/seed visibility rules)
- `apps/erp-app/src/app/platform-owner/feature-visibility/page.tsx` (owner control UI)
- `apps/erp-app/src/middleware.ts` and `apps/erp-app/src/middleware.ts` (URL blocking guard)

## AI Features

### Universal AI Agent (`@eduator/agent`)
- **Model**: Gemini 2.0 Flash
- **Purpose**: Intelligent assistant for Platform Owners and School Admins
- **Capabilities**:
  - SQL query execution with automatic RLS enforcement
  - Administrative actions (create users, classes, organizations)
  - Multi-step action orchestration
  - Automatic language detection and response matching
  - AI-powered result formatting
- **Architecture**: ReAct pattern (Reasoning + Acting) with **agentic improvements** (from v0.9.0)
- **Agentic behavior**:
  - **Reflection/retry loop**: On SQL errors, the agent analyzes the error and generates corrected SQL; up to 3 retries with full error history
  - **Critic/review step**: SQL is validated (and optionally reviewed by LLM) before execution to catch schema and logic issues
  - **Schema-awareness**: Database schema (DDL) is injected into prompts; optional dynamic schema loader validates tables against the live database
  - **Enhanced intent classification**: Broader inquiry/action patterns ("show", "list", "get", "create", "add", etc.) and "think first" question understanding
  - **"Think first" SQL generation**: Understands synonyms and variations so semantically equivalent questions produce consistent SQL
  - **Business rules in tools**: Tool descriptions include BUSINESS RULES so the LLM respects constraints during planning
  - **Security**: Word-boundary keyword detection (e.g. `created_by` no longer triggers CREATE block), SELECT-only enforcement
- **Security**: Row-Level Security (RLS) enforcement, SQL injection prevention
- **Details**: See [docs/agent](./agent/ARCHITECTURE.md) and `packages/agent/docs/AGENTIC_IMPROVEMENTS.md`, `IMPLEMENTATION_SUMMARY.md`

### AI Teaching Assistant (EduBot)
- **Teacher Assistant**:
  - **Model**: Gemini 2.5 Flash
  - **Input**: Teacher questions, uploaded documents (optional), subject/grade context
  - **Process**: Document-based RAG for context-aware responses, automatic language detection
  - **Capabilities**: Lesson planning, exam creation help, teaching strategies, curriculum development, student assessment guidance, differentiation ideas, educational technology recommendations
  - **Output**: Contextual teaching advice with document citations

- **Student AI Tutor**:
  - **Model**: Gemini 2.5 Flash
  - **Input**: Student questions, teacher-assigned documents, grade level, subject
  - **Process**: Socratic teaching methods, step-by-step explanations, understanding verification
  - **Capabilities**: Personalized learning, concept explanations, problem-solving guidance, real-world connections
  - **Output**: Guided learning responses that help students discover answers

### Exam Generation
- **Model**: Gemini 2.5 Flash
- **Input**: Upload documents (PDF, text)
- **Process**: AI reads content using RAG, generates questions with specified types and difficulty
- **Output**: Multiple choice, true/false, short answer, fill-blank questions with answer keys

### Document Processing
- **RAG Pattern**: Use text-embedding-004 for document embeddings
- **PDF Extraction**: Extract text from PDF files for lesson generation and RAG
- **Content Processing**: Intelligent content extraction and formatting
- **Document-Based Context**: Retrieve relevant content for AI Teaching Assistant and lesson generation

### Lesson Generation
- **Model**: Gemini 2.5 Flash (text), Imagen 3.0/2.5 Flash (images), Gemini TTS (audio)
- **Input**: Topic, grade level, language, document (optional)
- **Process**: 
  - RAG (Retrieval Augmented Generation) when document provided
  - AI extracts content from documents (PDF, MD, TXT)
  - AI creates educational content based on document context
  - Background audio processing for performance
- **Output**: HTML content + images + audio + quiz
- **Audio Regeneration**: Regenerate audio for existing lessons without full regeneration

### Course Generation (AI Curriculum Architect)
- **Model**: Gemini 2.5 Flash (structure & content), Imagen 3.0/2.5 Flash (images), Gemini TTS (audio)
- **Input**: Documents, number of lessons, difficulty level, course style, language, optional course topic, optional lesson topics, exam settings
- **Process**: 
  - Agentic AI with ReAct pattern for reasoning and acting
  - Document-based RAG for context-aware content generation
  - Multi-step generation: course structure → lessons → final exam
  - Automatic lesson ordering and prerequisites
  - Visual gap detection for learning materials
  - Background TTS audio generation for all lessons
  - Enhanced JSON parsing with error recovery
- **Output**: Complete course with multiple sequential lessons, final exam, audio narration
- **UI**: 5-step wizard (Documents → Blueprint → Options → Generation → Summary); see [FEATURES.md](./FEATURES.md)
- **Features**: 
  - Configurable exam parameters (question count, types, difficulty distribution)
  - Optional lesson topics for controlled generation
  - Multi-lingual support
  - Automatic pedagogy adaptation

### Translation
- **Model**: Gemini 2.5 Flash
- **Input**: Exam questions, lesson content in any language
- **Process**: AI translates preserving context, formatting, and technical accuracy
- **Output**: Same content in target language (8+ languages supported)

---

## File Storage

| Bucket | Content |
|--------|---------|
| `documents` | Teacher uploads (private, used for RAG) |
| `lesson-images` | AI-generated images (public) |
| `lesson-audio` | TTS-generated audio (public) |
| `exam-images` | Exam-related images (if any) |

---

## User Roles

| Role | Can Do |
|------|--------|
| **Platform Owner** | Manage everything |
| **School Admin** | Manage their school |
| **Teacher** | Create content (exams, lessons, courses), manage classes, use AI Teaching Assistant (EduBot), run courses, schedule materials via Smart Calendar Hub |
| **Student** | Take exams, view lessons, use AI Tutor (EduBot), take courses |

---

## Supported Languages

Storage and API use **2-letter codes** (see `@eduator/config` — `normalizeLanguageCode`, `getLanguageNameForPrompt`). Supported:

| Code | Language | Flag |
|------|----------|------|
| en | English | 🇬🇧 |
| az | Azerbaijani | 🇦🇿 |
| ru | Russian | 🇷🇺 |
| tr | Turkish | 🇹🇷 |
| de | German | 🇩🇪 |
| fr | French | 🇫🇷 |
| es | Spanish | 🇪🇸 |
| ar | Arabic | 🇸🇦 |

---

## Apps

| App | URL | Users |
|-----|-----|-------|
| **ERP App** | localhost:3001 | Platform Owner, School Admin, Teachers |
| **ERP App** | localhost:3002 | Teachers, Students |
| **API Server** | localhost:4000 | All (backend) |

---

## Package Structure

| Package | Purpose |
|---------|---------|
| `@eduator/config` | Settings, AI model names |
| `@eduator/core` | Types, validation rules |
| `@eduator/auth` | Login/logout helpers |
| `@eduator/db` | Database queries |
| `@eduator/ai` | AI service calls (exam/lesson/course generation, TTS, translations) |
| `@eduator/ui` | Shared UI components (including Smart Calendar Hub components) |
| `@eduator/agent` | Universal AI Agent (SQL queries, administrative actions) |

---

## Calendar System (v0.7.5)

### Smart Calendar Hub Architecture
- **Component Structure**:
  - `TeacherCalendarHub`: Main orchestrator component
  - `SmartCalendar`: Weekly grid view with drag-and-drop
  - `DraftsSidebar`: Draft materials library with pagination
  - `QuickEditPanel`: Event editing interface
- **Data Flow**:
  - Server-side data fetching (classes, drafts, scheduled events)
  - Client-side state management for calendar interactions
  - Real-time updates via Next.js Server Actions
- **Scheduling**:
  - Drag-and-drop from drafts sidebar to calendar slots
  - Drag existing events to reschedule
  - Automatic class selection dialog
  - Support for both exams and lessons
- **Database Schema**:
  - `lessons` table: Added `start_time` and `end_time` columns (TIMESTAMP WITH TIME ZONE)
  - `exams` table: Already had `start_time` and `end_time` columns
  - Both tables support calendar scheduling
- **Class Management**:
  - Fetches classes where teacher is primary (direct `teacher_id`)
  - Fetches classes assigned via `class_teachers` junction table
  - Handles NULL `teacher_id` correctly
  - Simplified teacher role (no primary/assistant distinction)

---

## Integration Options

1. **REST API** - Call our Fastify endpoints with JWT token
2. **Direct Database** - Connect to Supabase with your own client
3. **AI Package** - Import `@eduator/ai` for AI features

---

## Required Environment

- Node.js 20+
- Supabase project (URL + keys)
- Google AI API key (Gemini)

---

**Document applies to:** v0.11.0. For version history see [CHANGELOG](../CHANGELOG.md) and [ROADMAP](./ROADMAP.md).
