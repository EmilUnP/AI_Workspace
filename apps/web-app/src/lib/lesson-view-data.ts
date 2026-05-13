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

const backendBase = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '')

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

export function mapLessonToViewData(lesson: LessonLike): LessonViewData {
  const contentText =
    typeof lesson.content === 'object' && lesson.content && 'text' in (lesson.content as object)
      ? String((lesson.content as { text?: unknown }).text ?? '')
      : typeof lesson.content === 'string'
        ? lesson.content
        : ''

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
