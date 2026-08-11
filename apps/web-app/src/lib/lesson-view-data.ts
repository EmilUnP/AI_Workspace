import { getApiUrl } from '@/lib/portal-urls'
export interface LessonViewData {
  contentText: string
  images: { url: string; alt: string; description: string; position?: 'top' | 'middle' | 'bottom' }[]
  miniTest: { question: string; options: string[]; correct_answer: number; explanation: string }[]
  objectives: string[]
  centerText: boolean
}

type LessonLike = {
  content?: unknown
  images?: unknown
  mini_test?: unknown
  learning_objectives?: unknown
  metadata?: unknown
}

const backendBase = getApiUrl()

const normalizeLessonMediaProxyUrl = (raw: string): string => {
  const mediaMatch = raw.match(/^\/v1\/lessons\/([^/]+)\/media\/([^/?#]+)$/)
  if (!mediaMatch) return raw
  const [, lessonId, fileName] = mediaMatch
  return `/api/school-admin/lessons/${lessonId}/media/${fileName}`
}

const normalizeMediaUrl = (value: string): string => {
  const raw = value.trim()
  if (!raw) return raw
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw
  if (raw.startsWith('/v1/lessons/')) return normalizeLessonMediaProxyUrl(raw)
  if (raw.startsWith('/v1/')) return `${backendBase}${raw}`
  return raw
}

/** Mini-test belongs in its own tab; strip any quiz block the model pasted into content. */
const stripEmbeddedMiniTest = (content: string): string => {
  const heading =
    /(?:^|\n)#{1,3}\s*(?:mini[\s-]?test|mini[\s-]?quiz|practice\s+questions?|knowledge\s+check|comprehension\s+check|self[\s-]?check|check\s+your\s+understanding|kiçik\s+test|мини[\s-]?тест|тест|alıştırma\s+soruları)\b[^\n]*/i
  const match = heading.exec(content)
  if (match && typeof match.index === 'number') {
    return content.slice(0, match.index).trim()
  }
  return content
}

export function mapLessonToViewData(lesson: LessonLike): LessonViewData {
  const rawContentText =
    typeof lesson.content === 'object' && lesson.content && 'text' in (lesson.content as object)
      ? String((lesson.content as { text?: unknown }).text ?? '')
      : typeof lesson.content === 'string'
        ? lesson.content
        : ''
  const contentText = stripEmbeddedMiniTest(rawContentText)

  const images = Array.isArray(lesson.images)
    ? (lesson.images as LessonViewData['images']).map((img) => ({
        ...img,
        url: typeof img?.url === 'string' ? normalizeMediaUrl(img.url) : '',
      }))
    : []

  let miniTestRaw: unknown = lesson.mini_test
  if (typeof miniTestRaw === 'string') {
    try {
      miniTestRaw = JSON.parse(miniTestRaw)
    } catch {
      miniTestRaw = []
    }
  }

  const miniTestCandidates = Array.isArray(miniTestRaw)
    ? miniTestRaw
    : typeof miniTestRaw === 'object' && miniTestRaw
      ? ((miniTestRaw as { questions?: unknown; items?: unknown }).questions ||
        (miniTestRaw as { questions?: unknown; items?: unknown }).items ||
        [])
      : []

  const miniTest = Array.isArray(miniTestCandidates)
    ? (miniTestCandidates as LessonViewData['miniTest'])
    : []

  const metadata = (lesson.metadata ?? null) as {
    generation_options?: { centerText?: boolean }
  } | null

  const objectives = Array.isArray(lesson.learning_objectives)
    ? lesson.learning_objectives.map((o) => String(o))
    : []

  const centerText = metadata?.generation_options?.centerText ?? false

  return {
    contentText,
    images,
    miniTest,
    objectives,
    centerText,
  }
}
