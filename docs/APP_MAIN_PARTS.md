# Eduator AI - Main Parts Overview

This document is a simple, management-level view of what exists in the app today.
Use it as a quick reference for planning, stakeholder updates, and prioritization.

---

## 1) Product At A Glance

Eduator AI is a multi-role education platform with:

- Two web apps: ERP app and ERP app
- AI-assisted content creation (exams, lessons, courses, tutoring)
- Class management and student learning workflows
- Final exams, scheduling, submissions, and results
- Token-based usage and platform-level administration

---

## 2) Main User Areas

| Role | Primary App | Main Responsibilities |
|------|-------------|-----------------------|
| Teacher | ERP | Create/share content, manage classes, run AI tools, monitor student work |
| Student | ERP | Join classes, study lessons, take exams/final exams, track progress |
| School Admin | ERP | Manage organization users/classes, oversee final exams and operations |
| Platform Owner | ERP | Global governance, analytics, token/payment settings, system-level controls |

---

## 3) Core Functional Modules

### A. Class Management
- Create classes
- Share class code and manage enrollment
- Approve/reject pending joins
- Share/unshare exams, lessons, and documents
- (ERP) Teacher can now edit class name and description

### B. Exam System
- AI exam generation from documents
- Manual exam editing and translation
- Exam attempts, submissions, and scoring
- Student review with explanations and teacher-controlled visibility

### C. Final Exam System
- Build final exams from one or multiple source exams
- Question selection per source
- Two modes:
  - `fixed_selection` (same questions for everyone)
  - `random_pool` (random subset per student from selected pool)
- Optional one-attempt policy and result-release control

### D. Lesson and Course Generation
- AI lesson generation from documents (grade/language-aware)
- AI course generation (multi-lesson + final exam integration)
- Rich lesson rendering including diagrams and formatted content

### E. AI Tutor and Chat
- Student-facing AI support
- Teacher-side assistant workflows
- Document-grounded educational guidance

### F. Platform and Operations
- Token usage metering for AI actions
- Usage/payments views and settings
- Role-based permissions with Supabase-backed data model
- Release documentation and roadmap tracking

---

## 4) Key End-to-End Flows

### Teacher Workflow
1. Upload documents
2. Generate/edit lessons or exams
3. Create class and share learning materials
4. Configure final exam (fixed or randomized pool)
5. Monitor submissions and release/hide results as needed

### Student Workflow
1. Join class
2. Consume assigned lessons/content
3. Take exams/final exams
4. View results based on teacher visibility settings
5. Continue with AI tutor support

### Admin/Owner Workflow
1. Manage users/organizations
2. Oversee final exam and class operations
3. Control token economics and platform settings
4. Track analytics and operational health

---

## 5) Current Focus Areas (High-Level)

- Improve content quality and consistency of AI output
- Strengthen final exam reliability/security (question pools, access checks, scoring alignment)
- Continue UX simplification for high-frequency teacher workflows
- Keep docs and release communication synchronized

---

## 6) Where To Go Next (Detailed Docs)

- Feature-level details: `docs/FEATURES.md`
- Release history: `CHANGELOG.md`
- Roadmap and planning: `docs/ROADMAP.md`
- API and integration details: `docs/API.md`, `docs/technical/INTEGRATION_GUIDE.md`
- Architecture/technical context: `docs/TECHNICAL.md`

---

## 7) Management Notes

- This file is intentionally concise and non-technical.
- Update this file when major product modules change, new role capabilities are added, or ownership boundaries shift between ERP and ERP.
