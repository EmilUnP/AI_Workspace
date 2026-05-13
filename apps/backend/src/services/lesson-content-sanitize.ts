/**
 * Shared helpers for lesson markdown: strip LLM-broken table rows and
 * build excerpts for image-prompt generation (avoid junk drowning context).
 */

const FIGURE_HEADING = /^#{1,4}\s*(?:Şəkil|Shekil|Şekil|Figure|Fig\.|Рисунок|сурət)\s*\d+/i

/** Count letters and digits (any script) — separator-only rows stay low. */
export function countRealTextChars(line: string): number {
  return (line.match(/[\p{L}\p{N}]/gu) || []).length
}

function shouldDropAbsurdMarkdownLine(line: string): boolean {
  const len = line.length
  if (len < 200) return false
  const real = countRealTextChars(line)
  if (real >= 50) return false
  const dashes = (line.match(/-/g) || []).length
  if (len >= 400 && dashes >= 120 && dashes / len > 0.15) return true
  if (len >= 280 && real < 30 && line.includes('|')) return true
  return false
}

/** Remove single-line markdown junk (e.g. huge |---...---| separator rows). */
export function sanitizeBrokenMarkdownTableLines(text: string): string {
  if (!text || typeof text !== 'string') return text
  const lines = text.split('\n')
  const out: string[] = []
  for (const line of lines) {
    if (shouldDropAbsurdMarkdownLine(line)) continue
    out.push(line)
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n')
}

function extractFigureSnippets(content: string): string {
  const lines = content.split('\n')
  const blocks: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!FIGURE_HEADING.test(trimmed)) continue
    const buf: string[] = [lines[i]]
    for (let j = i + 1; j < lines.length && j < i + 35; j++) {
      const tr = lines[j].trim()
      if (/^##\s+/.test(tr) && !FIGURE_HEADING.test(tr)) break
      buf.push(lines[j])
    }
    blocks.push(buf.join('\n'))
    i += buf.length - 1
  }
  return blocks.join('\n\n')
}

/**
 * Prefer intro + figure-titled sections so image prompts align with "Şəkil 1" etc.,
 * without substring(0, 2000) landing inside a megabyte of dashes.
 */
export function buildImagePromptContentExcerpt(content: string, maxLen = 3200): string {
  const cleaned = sanitizeBrokenMarkdownTableLines(content)
  const head = cleaned.slice(0, 1600)
  const figureSnips = extractFigureSnippets(cleaned)
  let combined = figureSnips
    ? `${head}\n\n--- FIGURE SECTIONS (use for image order and captions) ---\n${figureSnips}`
    : head
  if (combined.length > maxLen) combined = combined.slice(0, maxLen)
  return combined
}
