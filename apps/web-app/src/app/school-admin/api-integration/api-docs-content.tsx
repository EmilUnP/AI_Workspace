'use client'

import { BookOpen, Sparkles } from 'lucide-react'
import { QUESTION_TYPES, SUPPORTED_LANGUAGES } from '@eduator/config'

interface ApiDocsContentProps {
  apiBaseUrl: string
}

export function ApiDocsContent({ apiBaseUrl }: ApiDocsContentProps) {
  const loginUrl = `${apiBaseUrl}/auth/login`
  const documentsUrl = `${apiBaseUrl}/documents`
  const examsGenerateUrl = `${apiBaseUrl}/ai/exams/generate`
  const lessonsGenerateUrl = `${apiBaseUrl}/ai/lessons/generate`
  const plansGenerateUrl = `${apiBaseUrl}/ai/education-plans/generate`
  const languagesList = SUPPORTED_LANGUAGES.map((l) => `"${l.code}"`).join(', ')
  const questionTypesList = Object.values(QUESTION_TYPES).map((q) => `"${q}"`).join(', ')

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">
        API documentation
      </h2>
      <p className="text-sm text-gray-600 mb-2">Authentication currently uses JWT access tokens.</p>
      <p className="text-sm text-gray-600 mb-6">
        Base URL: <code className="rounded bg-gray-100 px-2 py-1 font-mono text-sm">{apiBaseUrl}</code>
      </p>

      <div className="space-y-8">
        <article className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Quick start (working now)</h3>
          </div>
          <div className="p-6 space-y-4 text-sm text-gray-700">
            <p>1) Login and get <code className="bg-gray-100 px-1">tokens.accessToken</code>.</p>
            <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`curl -X POST ${loginUrl} \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "admin@example.com",
    "password": "your-password"
  }'`}
            </pre>
            <p>2) Use the access token in every protected request:</p>
            <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`Authorization: Bearer ACCESS_TOKEN`}
            </pre>
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-violet-50 to-white px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">POST /documents</h4>
              <p className="text-sm text-gray-600 mb-2">
                Create a document record. Required fields: <code className="bg-gray-100 px-1">title</code>,
                <code className="bg-gray-100 px-1">fileName</code>, <code className="bg-gray-100 px-1">fileType</code>, <code className="bg-gray-100 px-1">fileSize</code>.
              </p>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`curl -X POST ${documentsUrl} \\
  -H "Authorization: Bearer ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Math Chapter 1",
    "fileName": "chapter-1.pdf",
    "fileType": "application/pdf",
    "fileSize": 245760,
    "localPath": "storage/docs/chapter-1.pdf"
  }'`}
              </pre>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">GET /documents</h4>
              <p className="text-sm text-gray-600">List documents for the authenticated user.</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">GET /documents/:id</h4>
              <p className="text-sm text-gray-600">Get one document by ID.</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">GET /documents/:id/file</h4>
              <p className="text-sm text-gray-600">Stream the original document file if available.</p>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">POST</span>
              <code className="text-sm font-mono text-gray-700">/ai/exams/generate</code>
              <Sparkles className="h-4 w-4 text-amber-500" aria-hidden />
            </div>
            <h3 className="mt-2 text-lg font-semibold text-gray-900 flex items-center gap-2">
              Generate exam
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Real route: <code className="bg-gray-100 px-1">POST /v1/ai/exams/generate</code>. You can provide
              <code className="bg-gray-100 px-1">documentId</code>, <code className="bg-gray-100 px-1">documentIds</code>,
              or <code className="bg-gray-100 px-1">documentText</code>.
            </p>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Main fields</h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li><code className="bg-gray-100 px-1">documentId</code>, <code className="bg-gray-100 px-1">documentIds</code>, or <code className="bg-gray-100 px-1">documentText</code></li>
                <li><code className="bg-gray-100 px-1">title</code>, <code className="bg-gray-100 px-1">subject</code>, <code className="bg-gray-100 px-1">gradeLevel</code>, <code className="bg-gray-100 px-1">language</code></li>
                <li><code className="bg-gray-100 px-1">questionCount</code> (1-50), <code className="bg-gray-100 px-1">questionTypes</code> ({questionTypesList})</li>
                <li><code className="bg-gray-100 px-1">difficultyDistribution</code> with <code className="bg-gray-100 px-1">easy</code>, <code className="bg-gray-100 px-1">medium</code>, <code className="bg-gray-100 px-1">hard</code></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Example</h4>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`curl -X POST ${examsGenerateUrl} \\
  -H "Authorization: Bearer ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "documentId": "uuid-from-documents",
    "title": "Quiz 1",
    "subject": "Math",
    "gradeLevel": "10",
    "language": "en",
    "questionCount": 10,
    "questionTypes": ["multiple_choice", "true_false"],
    "difficultyDistribution": { "easy": 30, "medium": 50, "hard": 20 }
  }'`}
              </pre>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">POST</span>
              <code className="text-sm font-mono text-gray-700">/ai/lessons/generate</code>
              <Sparkles className="h-4 w-4 text-amber-500" aria-hidden />
            </div>
            <h3 className="mt-2 text-lg font-semibold text-gray-900 flex items-center gap-2">
              Generate lesson
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Real route: <code className="bg-gray-100 px-1">POST /v1/ai/lessons/generate</code>. Uses camelCase fields.
            </p>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Required fields</h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside mb-3">
                <li><code className="bg-gray-100 px-1">documentId</code> (uuid)</li>
                <li><code className="bg-gray-100 px-1">topic</code></li>
                <li><code className="bg-gray-100 px-1">language</code>, <code className="bg-gray-100 px-1">gradeLevel</code>, <code className="bg-gray-100 px-1">subject</code> are optional</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Example</h4>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`curl -X POST ${lessonsGenerateUrl} \\
  -H "Authorization: Bearer ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "documentId": "uuid-from-documents",
    "topic": "Introduction to Fractions",
    "language": "en"
  }'`}
              </pre>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-amber-50 to-white px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">GET</span>
              <code className="text-sm font-mono text-gray-700">/lessons</code>
              <span className="text-gray-400">·</span>
              <code className="text-sm font-mono text-gray-700">/lessons/:id</code>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-gray-900 flex items-center gap-2">
              Lesson retrieval
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              <strong>GET /v1/lessons</strong> lists lessons. <strong>GET /v1/lessons/:id</strong> returns full lesson content and media fields.
            </p>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">GET /lessons — list</h4>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`curl -X GET "${apiBaseUrl}/lessons?page=1&perPage=20" \\
  -H "Authorization: Bearer ACCESS_TOKEN"`}
              </pre>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">GET /lessons/:id</h4>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`curl -X GET "${apiBaseUrl}/lessons/LESSON_UUID" \\
  -H "Authorization: Bearer ACCESS_TOKEN"`}
              </pre>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white px-6 py-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">Education plans</h3>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Real route: <code className="bg-gray-100 px-1">POST /v1/ai/education-plans/generate</code>.
            </p>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Required: <code className="bg-gray-100 px-1">documentId</code>, <code className="bg-gray-100 px-1">name</code>. Optional:
              <code className="bg-gray-100 px-1">language</code>, <code className="bg-gray-100 px-1">periodMonths</code>,
              <code className="bg-gray-100 px-1">sessionsPerWeek</code>, <code className="bg-gray-100 px-1">hoursPerSession</code>.
            </p>
            <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`curl -X POST ${plansGenerateUrl} \\
  -H "Authorization: Bearer ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "documentId": "uuid-from-documents",
    "name": "Grade 10 Math Plan",
    "language": "en",
    "periodMonths": 3,
    "sessionsPerWeek": 3,
    "hoursPerSession": 1
  }'`}
            </pre>
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Reference</h3>
          </div>
          <div className="p-6 text-sm text-gray-600 space-y-2">
            <p>Supported language codes: {languagesList}</p>
            <p>
              API docs UI: <code className="bg-gray-100 px-1">/v1/docs</code>
            </p>
            <p>
              For this backend, field naming is mostly <strong>camelCase</strong> on AI routes.
            </p>
            <p>
              Note: API key management UI is present in app, but backend route auth currently validates JWT access tokens.
            </p>
          </div>
        </article>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5 flex items-start gap-3 mt-8">
        <BookOpen className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium">Authentication</p>
          <p className="mt-1 text-blue-800">
            Send <code className="rounded bg-blue-100 px-1 font-mono">Authorization: Bearer ACCESS_TOKEN</code> on every protected route.
            Access token comes from <code className="rounded bg-blue-100 px-1 font-mono">POST /v1/auth/login</code>.
          </p>
        </div>
      </div>
    </section>
  )
}
