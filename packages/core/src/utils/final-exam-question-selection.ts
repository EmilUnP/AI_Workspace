export type FinalExamQuestionMode = 'fixed_selection' | 'random_pool'

type SelectQuestionIdsParams = {
  examQuestionIds: string[]
  selectedQuestionIds?: string[] | null
  mode?: FinalExamQuestionMode | null
  questionsPerAttempt?: number | null
  studentId: string
  finalExamId: string
}

const toUnique = (ids: string[]) => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of ids) {
    const id = String(raw || '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

function xmur3(str: string) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return (h ^= h >>> 16) >>> 0
  }
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const deterministicShuffle = (items: string[], seedKey: string): string[] => {
  const seed = xmur3(seedKey)()
  const rng = mulberry32(seed)
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export const selectFinalExamQuestionIds = ({
  examQuestionIds,
  selectedQuestionIds,
  mode,
  questionsPerAttempt,
  studentId,
  finalExamId,
}: SelectQuestionIdsParams): string[] => {
  const allIds = toUnique(examQuestionIds)
  if (allIds.length === 0) return []

  const selectedSet = new Set(toUnique(selectedQuestionIds ?? []))
  const pool = selectedSet.size > 0 ? allIds.filter((id) => selectedSet.has(id)) : allIds
  if (pool.length === 0) return []

  const resolvedMode: FinalExamQuestionMode = mode === 'random_pool' ? 'random_pool' : 'fixed_selection'
  if (resolvedMode !== 'random_pool') return pool

  const limitRaw = Math.floor(Number(questionsPerAttempt) || 0)
  const limit = Math.max(1, Math.min(limitRaw > 0 ? limitRaw : pool.length, pool.length))
  if (limit >= pool.length) return pool

  const shuffled = deterministicShuffle(pool, `${finalExamId}:${studentId}`)
  return shuffled.slice(0, limit)
}
