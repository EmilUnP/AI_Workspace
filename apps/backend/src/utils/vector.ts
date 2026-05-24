/** Fixed dimension for pgvector storage (Gemini MRL truncation). */
export const EMBEDDING_DIMENSIONS = 768

/** Truncate to target dims and L2-normalize for cosine similarity via pgvector. */
export function prepareEmbedding(values: number[]): number[] {
  const truncated =
    values.length > EMBEDDING_DIMENSIONS ? values.slice(0, EMBEDDING_DIMENSIONS) : values.slice()
  let sumSq = 0
  for (const value of truncated) {
    sumSq += value * value
  }
  const norm = Math.sqrt(sumSq) || 1
  return truncated.map((value) => value / norm)
}

/** Format a float array for PostgreSQL `vector` type casts. */
export function toPgVector(values: number[]): string {
  return `[${values.join(',')}]`
}
