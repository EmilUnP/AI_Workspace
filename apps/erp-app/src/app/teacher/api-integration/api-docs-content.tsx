'use client'

import { FileText, Sparkles, GraduationCap, BookOpen, Upload, CheckCircle, Coins, AlertCircle } from 'lucide-react'
import { SUPPORTED_LANGUAGES, QUESTION_TYPES } from '@eduator/config'

interface ApiDocsContentProps {
  apiBaseUrl: string
}

export function ApiDocsContent({ apiBaseUrl }: ApiDocsContentProps) {
  const examGenerateUrl = `${apiBaseUrl}/exams/generate`
  const documentsUrl = `${apiBaseUrl}/documents`
  const languagesList = SUPPORTED_LANGUAGES.map((l) => `"${l.code}"`).join(', ')
  const questionTypesList = Object.values(QUESTION_TYPES).map((q) => `"${q}"`).join(', ')

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">
        API documentation
      </h2>
      <p className="text-sm text-gray-600 mb-2">
        Use the <strong>API key</strong> you created above and the <strong>base URL</strong> below. Every request must include <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">Authorization: Bearer YOUR_API_KEY</code>. Keep your key secret.
      </p>
      <p className="text-sm text-gray-600 mb-6">
        Base URL: <code className="rounded bg-gray-100 px-2 py-1 font-mono text-sm">{apiBaseUrl}</code>
      </p>

      {/* Token balance */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 flex items-start gap-3 mb-8">
        <Coins className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900 flex-1">
          <p className="font-semibold">Token balance (AI features)</p>
          <p className="mt-1 text-amber-800">
            Exam generation, lesson generation, course generation, and teacher chat consume <strong>tokens</strong> from your balance. Check balance before calling generate endpoints and handle <strong>402 Payment Required</strong> when balance is too low.
          </p>
          <p className="mt-2 text-amber-800">
            <strong>GET /tokens</strong> — Returns <code className="rounded bg-amber-100 px-1 font-mono">&#123; success: true, data: &#123; balance: number &#125; &#125;</code>. Use this or the dashboard <code className="bg-amber-100 px-1">overview.token_balance</code> to show users their balance. On insufficient balance, generate endpoints return <strong>402</strong> with a message like: &quot;Not enough tokens. This action requires X tokens. Your balance: Y. Please buy more tokens or contact your administrator.&quot;
          </p>
          <pre className="mt-3 rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto">
{`curl -X GET "${apiBaseUrl}/tokens" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
          </pre>
        </div>
      </div>

      {/* Document flow (recommended) */}
      <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-5 flex items-start gap-3 mb-8">
        <div className="flex items-center gap-2 text-violet-700 shrink-0 mt-0.5">
          <Upload className="h-5 w-5" />
          <CheckCircle className="h-5 w-5" />
        </div>
        <div className="text-sm text-violet-900">
          <p className="font-semibold">Recommended: Document flow (upload → RAG → exams &amp; lessons)</p>
          <p className="mt-1 text-violet-700">Use the base URL and your API key from this page for all requests. The <strong>Usage</strong> tab above shows requests per key and per endpoint.</p>
          <ol className="mt-2 list-decimal list-inside space-y-1 text-violet-800">
            <li><strong>Upload</strong> — <code className="rounded bg-violet-100 px-1 font-mono">POST /documents/upload</code> with your PDF, Word (.doc/.docx), text, or markdown file (multipart). Max 15MB. You get a <code className="bg-violet-100 px-1">document_id</code> and <code className="bg-violet-100 px-1">processing_status: &quot;processing&quot;</code>.</li>
            <li><strong>Wait for RAG</strong> — Poll <code className="rounded bg-violet-100 px-1 font-mono">GET /documents/:id</code> until <code className="bg-violet-100 px-1">processing_status</code> is <code className="bg-violet-100 px-1">completed</code>. Then the document is ready for exam/lesson generation.</li>
            <li><strong>Exams</strong> — Call <code className="rounded bg-violet-100 px-1 font-mono">POST /exams/generate</code> with <code className="bg-violet-100 px-1">document_id</code> or <code className="bg-violet-100 px-1">document_ids</code> (multi-doc RAG), or raw <code className="bg-violet-100 px-1">document_text</code>. The API uses RAG when using document IDs.</li>
            <li><strong>Lessons</strong> — Call <code className="rounded bg-violet-100 px-1 font-mono">POST /lessons/generate</code> with <code className="bg-violet-100 px-1">document_id</code> (one document) and <code className="bg-violet-100 px-1">topic</code>. Optionally set <code className="bg-violet-100 px-1">include</code> to <code className="bg-violet-100 px-1">&quot;text_and_images&quot;</code>, <code className="bg-violet-100 px-1">&quot;text_and_audio&quot;</code>, or <code className="bg-violet-100 px-1">&quot;full&quot;</code> for images and TTS audio.</li>
            <li><strong>Get lesson images &amp; audio</strong> — Call <code className="rounded bg-violet-100 px-1 font-mono">GET /lessons/:id</code> with the <code className="bg-violet-100 px-1">lesson_id</code> from the generate response. Returns full lesson with <code className="bg-violet-100 px-1">images</code> (public URLs) and <code className="bg-violet-100 px-1">audio_url</code> (when TTS is ready). Poll this after generating with audio if <code className="bg-violet-100 px-1">audio_url</code> was null.</li>
          </ol>
          <p className="mt-2 text-violet-700">For exams you can also send raw <code className="bg-violet-100 px-1">document_text</code> instead of uploading files.</p>
          <p className="mt-2 flex items-start gap-2 text-violet-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
            <span>AI operations (exams, lessons, courses) consume tokens. Check <strong>GET /tokens</strong> first and handle <strong>402</strong> responses when balance is insufficient.</span>
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Documents: upload, list, get */}
        <article className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-violet-50 to-white px-6 py-4">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-violet-600" />
              <h3 className="text-lg font-semibold text-gray-900">Documents (upload &amp; list)</h3>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Upload PDF, Word (.doc, .docx), text, or markdown (max 15MB); the API stores the file and runs RAG processing in the background. Use the returned <code className="bg-gray-100 px-1">document_id</code> in exam and lesson generation.
            </p>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">POST /documents/upload</h4>
              <p className="text-sm text-gray-600 mb-2">Send a file as <code className="bg-gray-100 px-1">multipart/form-data</code> (field name: <code className="bg-gray-100 px-1">file</code>). Allowed: PDF, Word (.doc, .docx), Markdown (.md), Text (.txt). Max 15MB. Response includes <code className="bg-gray-100 px-1">document_id</code> and <code className="bg-gray-100 px-1">processing_status</code>.</p>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`curl -X POST ${documentsUrl}/upload \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@/path/to/your.pdf"`}
              </pre>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">GET /documents</h4>
              <p className="text-sm text-gray-600">List your documents (paginated). Query: <code className="bg-gray-100 px-1">page</code>, <code className="bg-gray-100 px-1">per_page</code>. Use each item’s <code className="bg-gray-100 px-1">id</code> as <code className="bg-gray-100 px-1">document_id</code> in exams/lessons.</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">GET /documents/:id</h4>
              <p className="text-sm text-gray-600">Get one document. Check <code className="bg-gray-100 px-1">processing_status</code> (e.g. <code className="bg-gray-100 px-1">completed</code>) before using the document in exam/lesson generation.</p>
            </div>
          </div>
        </article>

        {/* 1. Generate new exam */}
        <article className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">POST</span>
              <code className="text-sm font-mono text-gray-700">/exams/generate</code>
              <Sparkles className="h-4 w-4 text-amber-500" aria-hidden />
            </div>
            <h3 className="mt-2 text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Generate new exam
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Use <strong>document_id</strong> or <strong>document_ids</strong> (RAG) or <strong>document_text</strong> (raw text). The API returns AI-generated exam questions. Questions follow quality guidelines: self-contained wording, no page/section references, no references to unseen tables or figures.
            </p>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Request body — provide one of:</h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside mb-3">
                <li><code className="bg-gray-100 px-1">document_id</code> — UUID of an uploaded document (RAG). Document must be processed (<code className="bg-gray-100 px-1">processing_status: completed</code>).</li>
                <li><code className="bg-gray-100 px-1">document_ids</code> — Array of document UUIDs (RAG, multi-doc).</li>
                <li><code className="bg-gray-100 px-1">document_text</code> — Raw text (50–100,000 characters) if you don’t use stored documents.</li>
              </ul>
              <p className="text-xs font-medium text-gray-700 mt-2">Other fields:</p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside mb-3">
                <li><code className="bg-gray-100 px-1">title</code>, <code className="bg-gray-100 px-1">subject</code>, <code className="bg-gray-100 px-1">grade_level</code> — For context.</li>
                <li><code className="bg-gray-100 px-1">topics</code> — Optional. Comma-separated topics to focus RAG when using <code className="bg-gray-100 px-1">document_id</code>/<code className="bg-gray-100 px-1">document_ids</code>.</li>
                <li><code className="bg-gray-100 px-1">language</code> — 2-letter code. Supported: {languagesList}.</li>
                <li><code className="bg-gray-100 px-1">custom_instructions</code> — Extra instructions for the AI.</li>
                <li><code className="bg-gray-100 px-1">settings</code> — See below.</li>
              </ul>
              <p className="text-xs font-medium text-gray-700 mt-2">Settings object:</p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li><code className="bg-gray-100 px-1">question_count</code> — 1–50.</li>
                <li><code className="bg-gray-100 px-1">difficulty_distribution</code> — <code className="bg-gray-100 px-1">easy</code>, <code className="bg-gray-100 px-1">medium</code>, <code className="bg-gray-100 px-1">hard</code> (percentages that sum to 100).</li>
                <li><code className="bg-gray-100 px-1">question_types</code> — Array of: {questionTypesList}.</li>
                <li><code className="bg-gray-100 px-1">include_explanations</code>, <code className="bg-gray-100 px-1">include_hints</code> — Boolean.</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Example (with document_id — RAG)</h4>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`curl -X POST ${examGenerateUrl} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "document_id": "uuid-from-documents-upload",
    "title": "Quiz 1",
    "subject": "Math",
    "grade_level": "10",
    "topics": "algebra, equations",
    "language": "en",
    "settings": {
      "question_count": 10,
      "difficulty_distribution": { "easy": 30, "medium": 50, "hard": 20 },
      "question_types": ["multiple_choice", "true_false"],
      "include_explanations": true,
      "include_hints": true
    }
  }'`}
              </pre>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Example (with document_text — raw text)</h4>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`curl -X POST ${examGenerateUrl} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "document_text": "Your lesson or chapter text (at least 50 characters)...",
    "title": "Quiz 1",
    "settings": { "question_count": 10, "difficulty_distribution": { "easy": 30, "medium": 50, "hard": 20 }, "question_types": ["multiple_choice", "true_false"] }
  }'`}
              </pre>
            </div>
          </div>
        </article>

        {/* 2. Generate new lesson */}
        <article className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">POST</span>
              <code className="text-sm font-mono text-gray-700">/lessons/generate</code>
              <Sparkles className="h-4 w-4 text-amber-500" aria-hidden />
            </div>
            <h3 className="mt-2 text-lg font-semibold text-gray-900 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-emerald-600" />
              Generate new lesson
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Use a <strong>document_id</strong> and a topic; choose <strong>text only</strong>, <strong>images</strong>, <strong>audio (TTS)</strong>, or <strong>full</strong> (images + audio). Response includes <strong>images</strong> (public URLs) and <strong>audio_url</strong> (null until TTS finishes — use <code className="bg-gray-100 px-1">GET /lessons/:id</code> to poll).
            </p>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Request body</h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside mb-3">
                <li><code className="bg-gray-100 px-1">document_id</code> — Required. UUID from upload or <code className="bg-gray-100 px-1">GET /documents</code>. Document must be processed.</li>
                <li><code className="bg-gray-100 px-1">topic</code> — Required. Lesson topic (e.g. &quot;Introduction to Fractions&quot;).</li>
                <li><code className="bg-gray-100 px-1">language</code> — Optional. <strong>2-letter code</strong> (same as exam generation). Use codes only, e.g. <code className="bg-gray-100 px-1">en</code>, <code className="bg-gray-100 px-1">az</code>. Supported: {languagesList}. Default: <code className="bg-gray-100 px-1">en</code>.</li>
                <li><code className="bg-gray-100 px-1">objectives</code> — Optional. Your own learning objectives (e.g. newline-separated or comma-separated). When provided, the AI uses these instead of generating objectives; the lesson content is tailored to cover them.</li>
                <li><code className="bg-gray-100 px-1">grade_level</code> — Optional. Target grade (e.g. <code className="bg-gray-100 px-1">grade_9</code>, <code className="bg-gray-100 px-1">grade_10</code>, <code className="bg-gray-100 px-1">undergraduate</code>). The AI tailors vocabulary, complexity, and examples to this level.</li>
                <li><code className="bg-gray-100 px-1">include</code> — Optional. Choose content: <code className="bg-gray-100 px-1">text</code> (default, simple text only), <code className="bg-gray-100 px-1">text_and_images</code>, <code className="bg-gray-100 px-1">text_and_audio</code>, <code className="bg-gray-100 px-1">full</code> (images + audio).</li>
                <li><code className="bg-gray-100 px-1">options</code> — Optional. <code className="bg-gray-100 px-1">includeImages</code>, <code className="bg-gray-100 px-1">includeAudio</code> (booleans; override <code className="bg-gray-100 px-1">include</code> if set), <code className="bg-gray-100 px-1">centerText</code> (default: true), <code className="bg-gray-100 px-1">includeTables</code>, <code className="bg-gray-100 px-1">includeFigures</code>, <code className="bg-gray-100 px-1">includeCharts</code>, <code className="bg-gray-100 px-1">contentLength</code> (<code className="bg-gray-100 px-1">short</code> | <code className="bg-gray-100 px-1">medium</code> | <code className="bg-gray-100 px-1">full</code>).</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Response (201)</h4>
              <p className="text-sm text-gray-600 mb-2">
                <code className="bg-gray-100 px-1">data</code> includes: <code className="bg-gray-100 px-1">lesson_id</code>, <code className="bg-gray-100 px-1">title</code>, <code className="bg-gray-100 px-1">topic</code>, <code className="bg-gray-100 px-1">content</code> (HTML text), <code className="bg-gray-100 px-1">images</code> (array of <code className="bg-gray-100 px-1">&#123; url, alt, description &#125;</code> — use <code className="bg-gray-100 px-1">url</code> to load images in your app), <code className="bg-gray-100 px-1">audio_url</code> (public URL when TTS is ready, or <code className="bg-gray-100 px-1">null</code> if still generating), <code className="bg-gray-100 px-1">mini_test</code>, <code className="bg-gray-100 px-1">document_id</code>, <code className="bg-gray-100 px-1">created_at</code>. To get <code className="bg-gray-100 px-1">audio_url</code> when it was null, call <code className="bg-gray-100 px-1">GET /lessons/:id</code> with the returned <code className="bg-gray-100 px-1">lesson_id</code> (poll every few seconds until <code className="bg-gray-100 px-1">audio_url</code> is set).
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Example — text only (default)</h4>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`curl -X POST ${apiBaseUrl}/lessons/generate \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "document_id": "uuid-from-documents-upload",
    "topic": "Introduction to Fractions",
    "language": "en",
    "include": "text"
  }'`}
              </pre>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Example — with objectives and grade_level</h4>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`curl -X POST ${apiBaseUrl}/lessons/generate \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "document_id": "uuid-from-documents-upload",
    "topic": "Introduction to Fractions",
    "language": "en",
    "objectives": "Define numerator and denominator\\nCompare fractions with same denominator\\nAdd simple fractions",
    "grade_level": "grade_9",
    "include": "text"
  }'`}
              </pre>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Example — with images</h4>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`{ "document_id": "...", "topic": "...", "include": "text_and_images" }`}
              </pre>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Example — with audio</h4>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`{ "document_id": "...", "topic": "...", "include": "text_and_audio" }`}
              </pre>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Example — full (images + audio)</h4>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`{ "document_id": "...", "topic": "...", "include": "full", "language": "en" }`}
              </pre>
            </div>
          </div>
        </article>

        {/* Lessons: list and get (images & audio) */}
        <article className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-amber-50 to-white px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">GET</span>
              <code className="text-sm font-mono text-gray-700">/lessons</code>
              <span className="text-gray-400">·</span>
              <code className="text-sm font-mono text-gray-700">/lessons/:id</code>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-gray-900 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-amber-600" />
              List lessons &amp; get full lesson (images &amp; audio)
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              <strong>GET /lessons</strong> — List your lessons (paginated). Query: <code className="bg-gray-100 px-1">page</code>, <code className="bg-gray-100 px-1">per_page</code>, <code className="bg-gray-100 px-1">class_id</code>. Each item includes <code className="bg-gray-100 px-1">id</code>, <code className="bg-gray-100 px-1">has_images</code>, <code className="bg-gray-100 px-1">has_audio</code>.
            </p>
            <p className="mt-1 text-sm text-gray-600">
              <strong>GET /lessons/:id</strong> — Get one lesson by ID with full content, <strong>images</strong> (array of public URLs: <code className="bg-gray-100 px-1">&#123; url, alt, description &#125;</code>), and <strong>audio_url</strong> (public TTS URL when ready). Use this in third-party apps to display lesson images and play audio. Only lessons you created are accessible.
            </p>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">GET /lessons — list</h4>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`curl -X GET "${apiBaseUrl}/lessons?page=1&per_page=20" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
              </pre>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">GET /lessons/:id — get full lesson (images &amp; audio)</h4>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`curl -X GET "${apiBaseUrl}/lessons/LESSON_UUID" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
              </pre>
              <p className="mt-2 text-sm text-gray-600">
                Response <code className="bg-gray-100 px-1">data.images</code> — array of objects with <code className="bg-gray-100 px-1">url</code> (public), <code className="bg-gray-100 px-1">alt</code>, <code className="bg-gray-100 px-1">description</code>. Use <code className="bg-gray-100 px-1">url</code> in <code className="bg-gray-100 px-1">&lt;img src=&quot;...&quot; /&gt;</code>. <code className="bg-gray-100 px-1">data.audio_url</code> — public URL for TTS audio (WAV); use in <code className="bg-gray-100 px-1">&lt;audio src=&quot;...&quot;&gt;</code>. If you requested audio at generation but <code className="bg-gray-100 px-1">audio_url</code> was null, poll this endpoint until <code className="bg-gray-100 px-1">audio_url</code> is set.
              </p>
            </div>
          </div>
        </article>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5 flex items-start gap-3 mt-8">
        <BookOpen className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium">Authentication</p>
          <p className="mt-1 text-blue-800">
            Use the API key you created in the <strong>Your API keys</strong> section above. Include it in every request as <code className="rounded bg-blue-100 px-1 font-mono">Authorization: Bearer YOUR_API_KEY</code>. Do not commit the key to code or share it.
          </p>
          <p className="mt-3 font-medium text-blue-900">Third-party integration</p>
          <p className="mt-1 text-blue-800">
            External apps only need this <strong>base URL</strong> and your <strong>API key</strong>. No database or Supabase access — the Eduator API server handles auth and data. Share the base URL and a key (e.g. from a dedicated “Integration” key) so they can call exam/lesson generation and other endpoints. Usage is tracked under the <strong>Usage</strong> tab on this page.
          </p>
        </div>
      </div>
    </section>
  )
}
