# Eduator AI Platform — Delivery Report (RAG & pgvector Upgrade)

**Report:** 3 (infrastructure + backend focus)  
**Reporting period:** **May 2026** (follow-up after Report 2)  
**Release:** **0.3.0** (22 May 2026)  
**Version span for this report:** **0.2.9 → 0.3.0**

**Companion docs:**

| Part | File | Focus |
|------|------|--------|
| **1** | [PROJECT_OVERVIEW_AND_REPORT 1.md](./PROJECT_OVERVIEW_AND_REPORT%201.md) | Full platform map, roles, flows |
| **2** | [PROJECT_OVERVIEW_AND_REPORT 2.md](./PROJECT_OVERVIEW_AND_REPORT%202.md) | Third-party API, HTTP keys, Usage, AI Tutor (0.2.5–0.2.9) |
| **3** | *This file* | **pgvector RAG**, split-server deployment, manual migration |

> **Deployment note:** Release **0.3.0** was applied **manually** on the production-style split environment (application server + database server). Steps below reflect what was done in that manual rollout—not an automated CI/CD pipeline.

---

## Executive summary

After Report 2 (integrations and AI Tutor), concurrent use of **lessons**, **exams**, **education plans**, and **AI Tutor chat** exposed a bottleneck: document RAG stored all embeddings as **JSONB** on each `documents` row and ran **cosine similarity in Node.js** for every query. Under multi-user load this would not scale.

**Release 0.3.0** moves vector search into **PostgreSQL pgvector**:

1. New **`document_chunks`** table with **`vector(768)`** and **HNSW** index  
2. Similarity search in **SQL** (not in-memory JavaScript)  
3. **Batch multi-document** retrieval (one query embedding + one SQL search)  
4. **AI Tutor** uses batch `retrieveMany()` instead of three separate retrieve pipelines  
5. **Manual deployment** on DB server (pgvector + migration 015) and app server (backend deploy + restart)

Deep technical reference: [RAG_AND_VECTOR_SEARCH.md](./RAG_AND_VECTOR_SEARCH.md).

---

## 1. Problem we solved

| Symptom (≤ 0.2.9) | Root cause |
|-------------------|------------|
| Slow lesson/exam generation when many documents attached | Each doc: load full JSONB embeddings → JS loop over all chunks |
| AI Tutor lag with 2–3 core documents | 3× parallel `retrieve()` = 3× embed + 3× load + 3× JS scan |
| Growing `documents` row size | 3072-dim Gemini vectors stored as nested JSONB arrays |
| No vector index | Every query scanned 100% of chunks (O(n) per document) |
| Risk under concurrent school admins | Node event loop blocked by similarity math + large JSON parses |

**Strategic choice:** stay on **PostgreSQL + pgvector** (no Qdrant/Weaviate/Pinecone yet). Same DB, unified backups, owner-scoping in SQL. See [DECISIONS.md](./DECISIONS.md) §10.

---

## 2. Before vs after (0.2.9 → 0.3.0)

```mermaid
flowchart TB
  subgraph old [Legacy RAG ≤ 0.2.9]
    D1[documents.row]
    J[chunk_embeddings JSONB]
    N[Node.js cosineSimilarity loop]
    D1 --> J --> N
  end
  subgraph new [Current RAG 0.3.0+]
    DC[document_chunks table]
    V[vector 768 + HNSW index]
    S[PostgreSQL ORDER BY embedding <=> query]
    DC --> V --> S
  end
```

| Area | ≤ 0.2.9 | 0.3.0+ |
|------|---------|--------|
| **Vector store** | JSONB on `documents` | `document_chunks.embedding` (`vector(768)`) |
| **Index** | None | HNSW (`vector_cosine_ops`) |
| **Search** | In-memory in `DocumentRagService` | pgvector SQL `<=>` |
| **Embedding dims** | Full Gemini output (~3072), stored raw | Truncated to **768**, L2-normalized |
| **Multi-doc RAG** | N sequential `getRelevantChunks()` | One SQL with `ROW_NUMBER() OVER (PARTITION BY document_id …)` |
| **AI Tutor (3 docs)** | 3× `retrieve()` | 1× `retrieveMany()` |
| **New uploads** | Write `chunk_embeddings` JSONB | Write `document_chunks` only; `chunk_embeddings = NULL` |
| **Legacy docs** | N/A | Lazy backfill JSONB → `document_chunks` on first RAG access |

---

## 3. What we delivered (code & schema)

### 3.1 Database migration

| Item | Detail |
|------|--------|
| **File** | `apps/backend/db/migrations/015_pgvector_document_chunks.sql` |
| **Extension** | `CREATE EXTENSION vector` |
| **Table** | `document_chunks` (`document_id`, `chunk_index`, `content`, `embedding vector(768)`) |
| **Index** | `idx_document_chunks_embedding_hnsw` (HNSW, cosine) |
| **Cascade** | `ON DELETE CASCADE` from `documents` |
| **Fresh installs** | Also included in `000_full_schema.sql` |

### 3.2 Backend code changes

| File | Change |
|------|--------|
| `src/services/document-rag.service.ts` | pgvector persist/search; `retrieveMany()`; batch multi-doc; lazy legacy backfill |
| `src/utils/vector.ts` | **New** — 768-dim truncate, L2 normalize, `toPgVector()` |
| `src/ai/gemini.ts` | All embeddings pass through `prepareEmbedding()` |
| `src/services/teacher-chatbot.service.ts` | Tutor uses `retrieveMany()` instead of per-doc `retrieve()` |

### 3.3 Unchanged (by design)

- Chunking rules: **4000** chars, **400** overlap, sentence-aware splits  
- Embedding model: **`gemini-embedding-001`** (per-user Gemini key)  
- Document upload flow, text extraction (PDF/DOCX/DOC), quality fields  
- Public API shape: `POST /v1/ai/rag/retrieve` request/response unchanged  
- No new environment variables (uses existing `DATABASE_URL`)

### 3.4 Documentation & versioning

- Project version bumped to **0.3.0** (`package.json`, OpenAPI, API docs)  
- [RAG_AND_VECTOR_SEARCH.md](./RAG_AND_VECTOR_SEARCH.md) — full architecture guide  
- [CHANGELOG.md](../CHANGELOG.md) — release notes  
- [TECHNICAL_SUMMARY.md](./TECHNICAL_SUMMARY.md) — RAG section updated  

---

## 4. Production topology (split deployment)

Eduator runs on a **split layout** (documented in `apps/backend/.env.example`):

| Server | Role | Typical address (example) |
|--------|------|---------------------------|
| **Application server** | Next.js web-app + Fastify backend | `10.10.204.11` |
| **Database server** | PostgreSQL (`eduator_clean`) | `10.10.204.21` |

```mermaid
flowchart LR
  subgraph app [App server 10.10.204.11]
    WEB[web-app Next.js]
    API[backend Fastify]
  end
  subgraph db [DB server 10.10.204.21]
    PG[(PostgreSQL + pgvector)]
  end
  WEB --> API
  API -->|DATABASE_URL| PG
```

- Backend connects via **`DATABASE_URL`** pointing at the DB host (not localhost on the app box).  
- **`FILE_STORAGE=database`** — uploaded files and lesson media can live in PostgreSQL on the DB server.  
- **pgvector must be installed on the DB server**, not on the app server.

---

## 5. Manual deployment — what was done

> This section documents the **manual rollout** performed for 0.3.0. Adjust commands for your OS/PostgreSQL version if needed.

### 5.1 Database server (`10.10.204.21`)

**Step 1 — Install pgvector extension package**

On the PostgreSQL host (example: Debian/Ubuntu + PostgreSQL 16):

```bash
sudo apt update
sudo apt install postgresql-16-pgvector
sudo systemctl restart postgresql
```

**Step 2 — Enable extension in `eduator_clean`**

Connect as a superuser or DB owner (pgAdmin Query Tool or `psql`):

```sql
\c eduator_clean
CREATE EXTENSION IF NOT EXISTS vector;
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
```

**Step 3 — Apply migration 015**

Option A — from a machine with repo access and `DATABASE_URL` aimed at `10.10.204.21`:

```bash
cd apps/backend
# DATABASE_URL=postgres://USER:PASS@10.10.204.21:5432/eduator_clean
npm run db:migrate
```

Option B — run SQL manually in pgAdmin / psql:

- Paste and execute `apps/backend/db/migrations/015_pgvector_document_chunks.sql`
- Ensure `schema_migrations` contains `'015_pgvector_document_chunks.sql'` if using the migration tracker:

```sql
INSERT INTO schema_migrations (id)
VALUES ('015_pgvector_document_chunks.sql')
ON CONFLICT (id) DO NOTHING;
```

**Step 4 — Verify on DB server**

```sql
-- Table exists
\d document_chunks

-- HNSW index exists
SELECT indexname FROM pg_indexes WHERE tablename = 'document_chunks';

-- Extension active
SELECT * FROM pg_extension WHERE extname = 'vector';
```

**Step 5 — Legacy data (optional immediate backfill)**

Migration 015 creates empty `document_chunks`. Existing documents with JSONB `chunk_embeddings` are **backfilled automatically** when someone triggers RAG (lesson, tutor, exam, or `POST /ai/rag/retrieve`). No mandatory bulk script in 0.3.0—first access may be slower for old docs.

---

### 5.2 Application server (`10.10.204.11`)

**Step 1 — Deploy updated codebase (0.3.0)**

- Pull/sync repository with 0.3.0 backend changes  
- Install dependencies: `npm install` (repo root / workspace)

**Step 2 — Confirm backend environment**

In `apps/backend/.env.local` (or production env):

```env
DATABASE_URL=postgres://USER:PASS@10.10.204.21:5432/eduator_clean
FILE_STORAGE=database
# ... JWT secrets, optional GOOGLE_GEMINI_API_KEY fallback ...
```

No new env vars for pgvector.

**Step 3 — Build and restart backend**

```bash
cd apps/backend
npm run build
# restart your process manager, e.g.:
npm run start
# or pm2/systemd restart eduator-backend
```

**Step 4 — Deploy web-app** (if bundled in same release)

```bash
cd apps/web-app
npm run build
# restart Next.js process
```

Web-app had **no RAG logic changes** in 0.3.0; backend-only upgrade for vector search.

**Step 5 — Smoke test from app server**

```bash
curl http://localhost:3010/health
# Login / use school-admin: upload doc, generate lesson, AI Tutor message with documents
```

---

### 5.3 Deployment checklist (manual)

| # | Task | Server | Done |
|---|------|--------|------|
| 1 | Install `postgresql-*-pgvector` package | DB | ☐ |
| 2 | `CREATE EXTENSION vector` on `eduator_clean` | DB | ☐ |
| 3 | Run migration **015** (migrate script or SQL file) | DB | ☐ |
| 4 | Verify `document_chunks` + HNSW index | DB | ☐ |
| 5 | Deploy backend **0.3.0** code | App | ☐ |
| 6 | `DATABASE_URL` points to DB host | App | ☐ |
| 7 | Rebuild + restart backend | App | ☐ |
| 8 | Health + document upload + AI generation smoke test | App | ☐ |
| 9 | Confirm tutor chat with 2–3 documents feels responsive | App | ☐ |

---

## 6. Who uses the new RAG path

| Feature | Service | Method (0.3.0) |
|---------|---------|----------------|
| REST RAG API | `routes/ai.ts` | `retrieve()` → pgvector |
| Lesson generation | `lesson-ai.service.ts` | `getRelevantContentFromDocuments()` — single SQL |
| Exam generation | `exam-ai.service.ts` | `retrieve()` per doc (indexed search each) |
| Education plans | `education-plan-ai.service.ts` | `retrieve()` |
| AI Tutor chat | `teacher-chatbot.service.ts` | **`retrieveMany()`** — batch |

All flows still require a valid **per-user Gemini key** for embedding calls.

---

## 7. Verification & QA (post-deploy)

1. **Extension:** On DB, `SELECT extversion FROM pg_extension WHERE extname = 'vector';` returns a version.  
2. **Schema:** `\d document_chunks` shows `embedding vector(768)`.  
3. **New upload:** Upload PDF → status `ready` → `SELECT COUNT(*) FROM document_chunks WHERE document_id = '<id>';` > 0.  
4. **RAG API:** `POST /v1/ai/rag/retrieve` with `documentId`, `query`, `topK` returns relevant chunks.  
5. **Lesson gen:** Generate lesson from uploaded doc — completes without timeout.  
6. **AI Tutor:** Assistant with 2–3 core docs → send message → reply uses document context.  
7. **Legacy doc:** Open old document (pre-0.3.0) → trigger lesson or tutor → chunks appear in `document_chunks` (lazy backfill).  
8. **Delete:** Delete document → `document_chunks` rows removed (cascade).

Details: [API_SUMMARY.md](./API_SUMMARY.md), [RAG_AND_VECTOR_SEARCH.md](./RAG_AND_VECTOR_SEARCH.md) §6.

---

## 8. Risks, rollback, and ops notes

| Topic | Guidance |
|-------|----------|
| **pgvector missing** | Migration 015 fails at `CREATE EXTENSION vector` — install package on DB host first |
| **Rollback code only** | Revert app to 0.2.9; legacy JSONB embeddings still on `documents` if not cleared |
| **Rollback schema** | Dropping `document_chunks` loses indexed vectors; legacy JSONB may still work on 0.2.9 code |
| **Mixed versions** | Do not run 0.3.0 backend without migration 015 — RAG queries will error |
| **DB load** | HNSW index builds at migration time; monitor disk on DB server |
| **Secrets** | Never commit `DATABASE_URL`, JWT secrets, or Gemini keys to reports or git |

---

## 9. What’s next (after 0.3.0)

Suggested follow-ups (see [RAG_AND_VECTOR_SEARCH.md](./RAG_AND_VECTOR_SEARCH.md) §9):

| Priority | Item |
|----------|------|
| High | **Bulk backfill script** for all legacy documents (avoid slow first-query backfill) |
| Medium | Drop unused `documents.chunk_embeddings` column after backfill complete |
| Medium | HNSW index tuning (`m`, `ef_construction`) if recall/latency needs adjustment |
| Low | Hybrid search (pgvector + full-text) for keyword-heavy queries |
| Future | Dedicated vector DB only if chunk count exceeds ~500K–1M or p99 latency stays high |

Report 2 “what’s next” items (API key pilots, `api_access_log` monitoring) remain valid alongside this RAG work.

---

## 10. Release timeline (this update)

| Date | Activity |
|------|----------|
| **15 May 2026** | Report 2 complete — 0.2.9 shipped (AI Tutor, API keys) |
| **May 2026** | RAG bottleneck analysis — JSONB + in-memory search not viable at scale |
| **22 May 2026** | **0.3.0** — pgvector implementation, docs, version bump |
| **22 May 2026** | **Manual deploy** — pgvector on DB server; migration 015; backend 0.3.0 on app server |

| Version | Date | Theme |
|---------|------|--------|
| **0.2.9** | 15 May | AI Tutor assistants + conversations (Report 2) |
| **0.3.0** | 22 May | pgvector RAG + split-server manual rollout (Report 3) |

---

## 11. Related files

| File | Topic |
|------|--------|
| [PROJECT_OVERVIEW_AND_REPORT 1.md](./PROJECT_OVERVIEW_AND_REPORT%201.md) | Platform overview (Part 1) |
| [PROJECT_OVERVIEW_AND_REPORT 2.md](./PROJECT_OVERVIEW_AND_REPORT%202.md) | API integration sprint (Part 2) |
| [RAG_AND_VECTOR_SEARCH.md](./RAG_AND_VECTOR_SEARCH.md) | Full RAG / vector technical guide |
| [CHANGELOG.md](../CHANGELOG.md) | 0.3.0 release notes |
| [TECHNICAL_SUMMARY.md](./TECHNICAL_SUMMARY.md) | Architecture summary |
| [DECISIONS.md](./DECISIONS.md) | ADR #10 pgvector |
| `apps/backend/db/migrations/015_pgvector_document_chunks.sql` | Migration SQL |
| `apps/backend/.env.example` | Split deployment comments |

---

*Report 3 — last updated for release **0.3.0** (pgvector RAG, manual app + DB server deployment).*
