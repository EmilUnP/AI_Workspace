export interface LessonViewData {
  contentText: string
  images: { url: string; alt: string; description: string; position?: 'top' | 'middle' | 'bottom' }[]
  miniTest: { question: string; options: string[]; correct_answer: number; explanation: string }[]
  examples: { title: string; description: string; code?: string }[]
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

export function mapLessonToViewData(lesson: LessonLike): LessonViewData {
  const contentText =
    typeof lesson.content === 'object' && lesson.content && 'text' in (lesson.content as object)
      ? String((lesson.content as { text?: unknown }).text ?? '')
      : typeof lesson.content === 'string'
        ? lesson.content
        : ''

  const images = Array.isArray(lesson.images)
    ? (lesson.images as LessonViewData['images'])
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
    examples?: unknown
    generation_options?: { centerText?: boolean }
  } | null

  const examples = Array.isArray(metadata?.examples)
    ? (metadata.examples as LessonViewData['examples'])
    : []

  const objectives = Array.isArray(lesson.learning_objectives)
    ? lesson.learning_objectives.map((o) => String(o))
    : []

  const centerText = metadata?.generation_options?.centerText ?? false

  return {
    contentText,
    images,
    miniTest,
    examples,
    objectives,
    centerText,
  }
}
