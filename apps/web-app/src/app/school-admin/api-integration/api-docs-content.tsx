'use client'

import { BookOpen, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { QUESTION_TYPES, SUPPORTED_LANGUAGES } from '@eduator/config'

interface ApiDocsContentProps {
  apiBaseUrl: string
}

export function ApiDocsContent({ apiBaseUrl }: ApiDocsContentProps) {
  const t = useTranslations('teacherApiIntegration')
  const openApiDocsUrl = `${apiBaseUrl.replace(/\/$/, '')}/docs`
  const loginUrl = `${apiBaseUrl}/auth/login`
  const documentsUrl = `${apiBaseUrl}/documents`
  const examsGenerateUrl = `${apiBaseUrl}/ai/exams/generate`
  const lessonsGenerateUrl = `${apiBaseUrl}/ai/lessons/generate`
  const plansGenerateUrl = `${apiBaseUrl}/ai/education-plans/generate`
  const plansRestUrl = `${apiBaseUrl}/education-plans`
  const languagesList = SUPPORTED_LANGUAGES.map((l) => `"${l.code}"`).join(', ')
  const questionTypesList = Object.values(QUESTION_TYPES).map((q) => `"${q}"`).join(', ')

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">
        {t('apiDocumentation')}
      </h2>
      <p className="text-sm text-gray-600 mb-2">{t('jwtAuthDescription')}</p>
      <p className="text-sm text-gray-600 mb-6">
        {t('baseUrlLabel')}: <code className="rounded bg-gray-100 px-2 py-1 font-mono text-sm">{apiBaseUrl}</code>
      </p>

      <div className="space-y-8">
        <article className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('quickStartWorkingNow')}</h3>
          </div>
          <div className="p-6 space-y-4 text-sm text-gray-700">
            <p>{t('quickStartStep1')} <code className="bg-gray-100 px-1">tokens.accessToken</code>.</p>
            <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`curl -X POST ${loginUrl} \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "admin@example.com",
    "password": "your-password"
  }'`}
            </pre>
            <p>{t('quickStartStep2')}</p>
            <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`Authorization: Bearer ACCESS_TOKEN`}
            </pre>
            <p>
              {t('interactiveBackendDocs')}:{' '}
              <a className="underline text-gray-800 hover:text-black" href={openApiDocsUrl} target="_blank" rel="noreferrer">
                {openApiDocsUrl}
              </a>
            </p>
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-violet-50 to-white px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('documents')}</h3>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">POST /documents</h4>
              <p className="text-sm text-gray-600 mb-2">
                {t('documentsPostDescription')} <code className="bg-gray-100 px-1">title</code>,
                <code className="bg-gray-100 px-1">fileName</code>, <code className="bg-gray-100 px-1">fileType</code>, <code className="bg-gray-100 px-1">fileSize</code>.
                {' '}
                {t('documentsPostOptionalFields')}
              </p>
              <p className="text-sm text-gray-600 mb-2">{t('documentsPostUploadDetail')}</p>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`curl -X POST ${documentsUrl} \\
  -H "Authorization: Bearer ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Math Chapter 1",
    "fileName": "chapter-1.pdf",
    "fileType": "application/pdf",
    "fileSize": 245760,
    "contentBase64": "<BASE64_OF_FILE_BYTES>"
  }'`}
              </pre>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">GET /documents</h4>
              <p className="text-sm text-gray-600 mb-2">{t('listDocumentsForUser')}</p>
              <p className="text-sm text-gray-600 mb-2">{t('documentsGetListIntro')}</p>
              <p className="text-sm text-gray-600 mb-2">{t('documentsGetListReturns')}</p>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`curl -X GET ${documentsUrl} \\
  -H "Authorization: Bearer ACCESS_TOKEN"`}
              </pre>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">GET /documents/:id</h4>
              <p className="text-sm text-gray-600 mb-2">{t('getDocumentById')}</p>
              <p className="text-sm text-gray-600 mb-2">{t('documentsGetByIdIntro')}</p>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`curl -X GET ${documentsUrl}/DOCUMENT_UUID \\
  -H "Authorization: Bearer ACCESS_TOKEN"`}
              </pre>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">GET /documents/:id/file</h4>
              <p className="text-sm text-gray-600 mb-2">{t('streamOriginalDocumentFile')}</p>
              <p className="text-sm text-gray-600 mb-2">{t('documentsGetFileIntro')}</p>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`curl -X GET ${documentsUrl}/DOCUMENT_UUID/file \\
  -H "Authorization: Bearer ACCESS_TOKEN" \\
  --output downloaded.pdf`}
              </pre>
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
              {t('generateExam')}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {t('realRouteLabel')} <code className="bg-gray-100 px-1">POST /v1/ai/exams/generate</code>. {t('examsGenerateRouteDescription')}
              <code className="bg-gray-100 px-1">documentId</code>, <code className="bg-gray-100 px-1">documentIds</code>,
              or <code className="bg-gray-100 px-1">documentText</code>.
            </p>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{t('mainFields')}</h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li><code className="bg-gray-100 px-1">documentId</code>, <code className="bg-gray-100 px-1">documentIds</code>, or <code className="bg-gray-100 px-1">documentText</code></li>
                <li><code className="bg-gray-100 px-1">title</code>, <code className="bg-gray-100 px-1">subject</code>, <code className="bg-gray-100 px-1">gradeLevel</code>, <code className="bg-gray-100 px-1">language</code></li>
                <li><code className="bg-gray-100 px-1">questionCount</code> (1-50), <code className="bg-gray-100 px-1">questionTypes</code> ({questionTypesList})</li>
                <li><code className="bg-gray-100 px-1">difficultyDistribution</code> with <code className="bg-gray-100 px-1">easy</code>, <code className="bg-gray-100 px-1">medium</code>, <code className="bg-gray-100 px-1">hard</code></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{t('example')}</h4>
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
    "difficultyDistribution": { "easy": 3, "medium": 5, "hard": 2 }
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
              {t('generateLesson')}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {t('realRouteLabel')} <code className="bg-gray-100 px-1">POST /v1/ai/lessons/generate</code>. {t('lessonsGenerateRouteDescription')}
            </p>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{t('requestFields')}</h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside mb-3">
                <li><code className="bg-gray-100 px-1">topic</code> (required)</li>
                <li><code className="bg-gray-100 px-1">documentId</code> (optional UUID) and/or <code className="bg-gray-100 px-1">documentIds</code> (optional UUID array)</li>
                <li><code className="bg-gray-100 px-1">language</code> (2-letter recommended: {languagesList})</li>
                <li><code className="bg-gray-100 px-1">gradeLevel</code>, <code className="bg-gray-100 px-1">objectives</code>, <code className="bg-gray-100 px-1">corePrompt</code> (optional)</li>
                <li>
                  <code className="bg-gray-100 px-1">options</code> object:
                  <code className="bg-gray-100 px-1">includeImages</code>,
                  <code className="bg-gray-100 px-1">includeAudio</code>,
                  <code className="bg-gray-100 px-1">includeTables</code>,
                  <code className="bg-gray-100 px-1">includeFigures</code>,
                  <code className="bg-gray-100 px-1">includeCharts</code>,
                  <code className="bg-gray-100 px-1">contentLength</code> (<code className="bg-gray-100 px-1">short</code> | <code className="bg-gray-100 px-1">medium</code> | <code className="bg-gray-100 px-1">full</code>)
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{t('exampleFullSettings')}</h4>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`curl -X POST ${lessonsGenerateUrl} \\
  -H "Authorization: Bearer ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "documentId": "uuid-primary-document",
    "documentIds": ["uuid-primary-document", "uuid-secondary-document"],
    "topic": "Introduction to Fractions",
    "language": "en",
    "gradeLevel": "grade_9",
    "objectives": "Define numerator and denominator\\nCompare fractions\\nAdd simple fractions",
    "corePrompt": "Keep explanations practical with real-life examples.",
    "options": {
      "includeImages": true,
      "includeAudio": true,
      "includeTables": true,
      "includeFigures": true,
      "includeCharts": false,
      "contentLength": "full"
    }
  }'`}
              </pre>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{t('generationResponseImportant')}</h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>{t('generationResponseReturnsLesson')} <code className="bg-gray-100 px-1">lesson</code> {t('generationResponseWithRichContent')} <code className="bg-gray-100 px-1">content</code>, <code className="bg-gray-100 px-1">learning_objectives</code>, <code className="bg-gray-100 px-1">mini_test</code>, <code className="bg-gray-100 px-1">examples</code>, <code className="bg-gray-100 px-1">images</code>, <code className="bg-gray-100 px-1">usage</code></li>
                <li><code className="bg-gray-100 px-1">audio_url</code> {t('audioUrlInitiallyNullTtsAsync')}</li>
                <li>{t('useLessonGetForAudioAvailability')} <code className="bg-gray-100 px-1">GET /v1/lessons/:id</code> {t('checkWhenAudioAvailable')}</li>
              </ul>
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
              {t('lessonRetrieval')}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              <strong>GET /v1/lessons</strong> {t('lessonsListMetadataDescription')} <strong>GET /v1/lessons/:id</strong> {t('lessonDetailFullPayloadDescription')}
            </p>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">GET /lessons — {t('listWithPagination')}</h4>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`curl -X GET "${apiBaseUrl}/lessons?page=1&perPage=20" \\
  -H "Authorization: Bearer ACCESS_TOKEN"`}
              </pre>
              <p className="mt-2 text-sm text-gray-600">
                {t('queryParamsLabel')} <code className="bg-gray-100 px-1">page</code>, <code className="bg-gray-100 px-1">perPage</code>, <code className="bg-gray-100 px-1">search</code>.
                {t('compactItemsNotFullBody')}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">GET /lessons/:id — {t('fullLessonPayload')}</h4>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`curl -X GET "${apiBaseUrl}/lessons/LESSON_UUID" \\
  -H "Authorization: Bearer ACCESS_TOKEN"`}
              </pre>
              <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>{t('includesFullFields')} <code className="bg-gray-100 px-1">content</code>, <code className="bg-gray-100 px-1">images</code>, <code className="bg-gray-100 px-1">mini_test</code>, <code className="bg-gray-100 px-1">learning_objectives</code>, <code className="bg-gray-100 px-1">metadata</code>, <code className="bg-gray-100 px-1">audio_url</code></li>
                <li>{t('audioUrlPopulatedWhenReady')} <code className="bg-gray-100 px-1">audio_url</code> {t('isPopulated')}</li>
                <li>{t('audioUrlRelativeMediaFetchPrefix')} <code className="bg-gray-100 px-1">GET /v1/lessons/:id/media/:file</code></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{t('lessonMediaContract')}</h4>
              <p className="text-sm text-gray-600 mb-2">
                {t('thirdPartyAppsMediaRender')} <code className="bg-gray-100 px-1">audio_url</code> {t('treatAudioUrlAsAsync')}
              </p>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`{
  "lesson": {
    "id": "lesson-uuid",
    "title": "Fractions Basics",
    "content": { "text": "..." },
    "images": [
      {
        "url": "http://127.0.0.1:4000/v1/lessons/lesson-uuid/media/image_0.png",
        "alt": "Fractions pie chart",
        "description": "Educational image prompt",
        "position": "top"
      }
    ],
    "audio_url": "http://127.0.0.1:4000/v1/lessons/lesson-uuid/media/audio.wav"
  }
}`}
              </pre>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white px-6 py-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">{t('educationPlans')}</h3>
            </div>
            <p className="mt-1 text-sm text-gray-600">{t('educationPlansDocIntro')}</p>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                {t('educationPlansRestHeading')}
              </h4>
              <p className="text-sm text-gray-600 mb-2">{t('plansRestGetList')}</p>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words mb-3">
{`curl -X GET "${plansRestUrl}" \\
  -H "Authorization: Bearer ACCESS_TOKEN"`}
              </pre>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words mb-2">
{`curl -X GET "${plansRestUrl}?search=math&shared=shared" \\
  -H "Authorization: Bearer ACCESS_TOKEN"`}
              </pre>
              <p className="text-sm text-gray-600 mb-2">{t('plansRestGetStats')}</p>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words mb-3">
{`curl -X GET "${plansRestUrl}/stats" \\
  -H "Authorization: Bearer ACCESS_TOKEN"`}
              </pre>
              <p className="text-sm text-gray-600 mb-2">{t('plansRestGetById')}</p>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words mb-3">
{`curl -X GET "${plansRestUrl}/PLAN_UUID" \\
  -H "Authorization: Bearer ACCESS_TOKEN"`}
              </pre>
              <p className="text-sm text-gray-600 mb-2">{t('plansRestWriteNote')}</p>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words mb-2">
{`curl -X DELETE "${plansRestUrl}/PLAN_UUID" \\
  -H "Authorization: Bearer ACCESS_TOKEN"`}
              </pre>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                {t('educationPlansAiHeading')}
              </h4>
              <p className="text-sm text-gray-600 mb-1">
                {t('realRouteLabel')} <code className="bg-gray-100 px-1">POST /v1/ai/education-plans/generate</code>
              </p>
              <p className="text-sm text-gray-600 mb-2">
                {t('requiredLabel')} <code className="bg-gray-100 px-1">documentId</code>, <code className="bg-gray-100 px-1">name</code>. {t('optionalLabel')}
                <code className="bg-gray-100 px-1">language</code> (same as <code className="bg-gray-100 px-1">outputLanguage</code>), <code className="bg-gray-100 px-1">periodMonths</code>,
                <code className="bg-gray-100 px-1">sessionsPerWeek</code>, <code className="bg-gray-100 px-1">hoursPerSession</code>.
              </p>
              <p className="text-sm text-gray-600 mb-2">{t('plansGenerateLanguageNote')}</p>
              <p className="text-sm text-gray-600 mb-2">{t('plansGenerateResponseNote')}</p>
              <pre className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
{`curl -X POST ${plansGenerateUrl} \\
  -H "Authorization: Bearer ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "documentId": "uuid-from-documents",
    "name": "Grade 10 Math Plan",
    "language": "az",
    "periodMonths": 3,
    "sessionsPerWeek": 3,
    "hoursPerSession": 1
  }'`}
              </pre>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('reference')}</h3>
          </div>
          <div className="p-6 text-sm text-gray-600 space-y-2">
            <p>{t('supportedLanguageCodes')}: {languagesList}</p>
            <p>
              API docs UI: <a className="underline text-gray-800 hover:text-black" href={openApiDocsUrl} target="_blank" rel="noreferrer"><code className="bg-gray-100 px-1">/v1/docs</code></a> ({openApiDocsUrl})
            </p>
            <p>
              {t('fieldNamingCamelCaseAiRoutesPrefix')} <strong>camelCase</strong> {t('fieldNamingCamelCaseAiRoutesSuffix')}
            </p>
            <p>{t('geminiKeyEndpointsUnder')} <code className="bg-gray-100 px-1">/v1/users/me/ai-keys/gemini</code>.</p>
          </div>
        </article>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5 flex items-start gap-3 mt-8">
        <BookOpen className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium">{t('authentication')}</p>
          <p className="mt-1 text-blue-800">
            {t('sendAuthorizationHeader')} <code className="rounded bg-blue-100 px-1 font-mono">Authorization: Bearer ACCESS_TOKEN</code> {t('onEveryProtectedRoute')}
            {t('accessTokenComesFrom')} <code className="rounded bg-blue-100 px-1 font-mono">POST /v1/auth/login</code>.
          </p>
        </div>
      </div>
    </section>
  )
}
