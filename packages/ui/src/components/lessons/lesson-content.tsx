'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { ChevronUp, ChevronDown, ZoomIn, AlertTriangle, X, BookMarked } from 'lucide-react'
import { renderLatexInHtml } from '../../lib/math-render'
import type { LessonImage } from './lesson-tabs'

const SECTION_OBSERVER_OPTIONS: IntersectionObserverInit = {
  rootMargin: '-80px 0px -65% 0px',
  threshold: 0,
}

export interface ContentSection {
  id: string
  label: string
  level: 1 | 2 | 3
}

export interface LessonContentLabels {
  contentsLabel?: string
  expand?: string
  collapse?: string
  fullScreen?: string
}

interface LessonContentProps {
  content: string
  images: LessonImage[]
  /** When true, wrap content in a centered block (used for API/in-app generated lessons that opted for center text). */
  centerText?: boolean
  labels?: LessonContentLabels
}

// Generate a stable key from image properties (without index to prevent hydration mismatch)
function getImageKey(image: LessonImage): string {
  // Use URL if available (most stable), otherwise combine properties
  if (image.url) {
    // Create a simple hash from the URL
    const urlHash = image.url.split('/').pop() || image.url.slice(-20)
    return `img-${urlHash}`
  }
  // Fallback: use alt text or description
  const altHash = (image.alt || image.description || 'unknown').slice(0, 30).replace(/\s+/g, '-')
  return `img-${altHash}`
}

/**
 * Escapes HTML to prevent XSS attacks
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

/**
 * Restore safe <sub> and <sup> tags in already-escaped HTML so subscripts/superscripts
 * (e.g. from math content like a_n, x^n) display correctly. Inner content stays escaped.
 */
function restoreSubSupTags(html: string): string {
  if (!html || typeof html !== 'string') return html
  return html
    .replace(/&lt;sub&gt;(.*?)&lt;\/sub&gt;/g, '<sub>$1</sub>')
    .replace(/&lt;sup&gt;(.*?)&lt;\/sup&gt;/g, '<sup>$1</sup>')
}

/** Split a markdown table row into cell strings (by |, trimmed, no empty from edges). */
function parseTableRow(line: string): string[] {
  const cells = line.split('|').map((c) => c.trim())
  const start = cells[0] === '' ? 1 : 0
  const end = cells[cells.length - 1] === '' ? cells.length - 1 : cells.length
  return cells.slice(start, end)
}

/** True if line looks like a GFM table row (starts with | and has at least one more |). */
function isTableRow(trimmed: string): boolean {
  return trimmed.length > 2 && trimmed.startsWith('|') && trimmed.includes('|', 1)
}

/** True if parsed cells look like a separator row (only dashes, colons, spaces). */
function isTableSeparator(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^[\s\-:]+$/.test(c))
}

/** Create a URL-safe id from heading text (strip markdown, lowercase, hyphenate). */
function createHeadingId(raw: string): string {
  const stripped = raw
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim()
  return stripped
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'section'
}

/**
 * Converts markdown content to properly formatted HTML
 * Handles headers, bold, italic, lists, tables, and paragraphs
 */
function formatMarkdownToHtml(content: string): string {
  if (!content) return ''

  // Normalize line breaks
  let formatted = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  // Split into lines for processing
  const lines = formatted.split('\n')
  const processedLines: string[] = []
  let inList = false
  let listType: 'ul' | 'ol' | null = null
  let listItems: string[] = []

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const tag = listType === 'ul' ? 'ul' : 'ol'
      const listClass = listType === 'ul'
        ? 'list-disc list-outside pl-6 my-4 space-y-2'
        : 'list-decimal list-outside pl-6 my-4 space-y-2'
      const listHtml = `<${tag} class="${listClass}">${listItems.join('')}</${tag}>`
      processedLines.push(listHtml)
      listItems = []
      inList = false
      listType = null
    }
  }

  /** Ensure heading ids are unique (createHeadingId can return "section" for empty headings). */
  const usedHeadingIds = new Map<string, number>()
  const ensureUniqueId = (id: string): string => {
    const count = usedHeadingIds.get(id) ?? 0
    usedHeadingIds.set(id, count + 1)
    return count === 0 ? id : `${id}-${count + 1}`
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Fenced code blocks (```lang ... ```)
    if (trimmed.startsWith('```')) {
      flushList()
      const language = trimmed.substring(3).trim().toLowerCase()
      const codeLines: string[] = []
      let j = i + 1
      while (j < lines.length && lines[j].trim() !== '```') {
        codeLines.push(lines[j])
        j++
      }
      const code = codeLines.join('\n').trim()

      if (language === 'mermaid') {
        const encoded = encodeURIComponent(code)
        processedLines.push(
          `<div class="my-6 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
            <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">Diagram</div>
            <div class="mermaid-block overflow-x-auto" data-mermaid="${encoded}">
              <div class="text-sm text-blue-700">Rendering diagram...</div>
            </div>
          </div>`
        )
      } else {
        const safeCode = escapeHtml(code)
        processedLines.push(
          `<pre class="my-4 overflow-x-auto rounded-lg border border-gray-200 bg-gray-900 p-4 text-sm text-gray-100"><code>${safeCode}</code></pre>`
        )
      }

      i = j < lines.length ? j : lines.length - 1
      continue
    }

    // Empty line - flush list
    if (!trimmed) {
      flushList()
      continue
    }

    // Headers (must be at start of line) — add id for section navigation (unique per page)
    if (trimmed.startsWith('### ')) {
      flushList()
      const raw = trimmed.substring(4).trim()
      const id = ensureUniqueId(createHeadingId(raw))
      const text = escapeHtml(raw)
      processedLines.push(`<h3 id="${id}" class="text-xl font-bold text-gray-900 mt-6 mb-3 scroll-mt-24">${formatInlineMarkdown(text)}</h3>`)
      continue
    }
    if (trimmed.startsWith('## ')) {
      flushList()
      const raw = trimmed.substring(3).trim()
      const id = ensureUniqueId(createHeadingId(raw))
      const text = escapeHtml(raw)
      processedLines.push(`<h2 id="${id}" class="text-2xl font-bold text-gray-900 mt-8 mb-4 scroll-mt-24">${formatInlineMarkdown(text)}</h2>`)
      continue
    }
    if (trimmed.startsWith('# ')) {
      flushList()
      const raw = trimmed.substring(2).trim()
      const id = ensureUniqueId(createHeadingId(raw))
      const text = escapeHtml(raw)
      processedLines.push(`<h1 id="${id}" class="text-3xl font-bold text-gray-900 mt-8 mb-4 scroll-mt-24">${formatInlineMarkdown(text)}</h1>`)
      continue
    }

    // Numbered list (1. 2. etc.) - must start with number and dot
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/)
    if (numberedMatch) {
      if (!inList || listType !== 'ol') {
        flushList()
        inList = true
        listType = 'ol'
      }
      const itemText = escapeHtml(numberedMatch[2].trim())
      listItems.push(`<li class="text-gray-700 leading-relaxed">${formatInlineMarkdown(itemText)}</li>`)
      continue
    }

    // Bullet list (* or - or bullet character) - must start with bullet
    const bulletMatch = trimmed.match(/^[\*\-\u2022\u25CF]\s+(.+)$/)
    if (bulletMatch) {
      if (!inList || listType !== 'ul') {
        flushList()
        inList = true
        listType = 'ul'
      }
      const itemText = escapeHtml(bulletMatch[1].trim())
      listItems.push(`<li class="text-gray-700 leading-relaxed">${formatInlineMarkdown(itemText)}</li>`)
      continue
    }

    // GFM-style table: consecutive lines that look like | a | b |
    if (isTableRow(trimmed)) {
      flushList()
      const tableRows: string[][] = []
      let j = i
      while (j < lines.length && isTableRow(lines[j].trim())) {
        tableRows.push(parseTableRow(lines[j].trim()))
        j++
      }
      const numCols = Math.max(...tableRows.map((r) => r.length), 1)
      const padCells = (cells: string[]) => {
        const out = [...cells]
        while (out.length < numCols) out.push('')
        return out
      }
      const headerCells = padCells(tableRows[0] ?? [])
      const secondRow = tableRows[1]
      const isSep = secondRow && isTableSeparator(secondRow)
      const bodyRows = isSep ? tableRows.slice(2) : tableRows.slice(1)

      const tableClass =
        'w-full min-w-[280px] border-collapse my-4 text-left text-sm shadow-sm rounded-lg overflow-hidden'
      const thClass =
        'border border-gray-200 bg-gray-100 px-4 py-3 font-semibold text-gray-800'
      const tdClass = 'border border-gray-200 px-4 py-2.5 text-gray-700'

      let tableHtml =
        '<div class="my-4 overflow-x-auto rounded-lg border border-gray-200"><table class="' +
        tableClass +
        '"><thead><tr>'
      for (const cell of headerCells) {
        const safe = formatInlineMarkdown(escapeHtml(cell))
        tableHtml += `<th class="${thClass}">${safe}</th>`
      }
      tableHtml += '</tr></thead><tbody>'
      for (const row of bodyRows) {
        tableHtml += '<tr>'
        for (const cell of padCells(row)) {
          const safe = formatInlineMarkdown(escapeHtml(cell))
          tableHtml += `<td class="${tdClass}">${safe}</td>`
        }
        tableHtml += '</tr>'
      }
      tableHtml += '</tbody></table></div>'
      processedLines.push(tableHtml)
      i = j - 1
      continue
    }

    // Regular paragraph
    flushList()
    const escapedText = escapeHtml(trimmed)
    processedLines.push(`<p class="text-gray-700 leading-relaxed mb-4">${formatInlineMarkdown(escapedText)}</p>`)
  }

  // Flush any remaining list
  flushList()

  return processedLines.join('')
}

/** Extract heading sections from HTML for table-of-contents and navigation. */
function extractSections(html: string): ContentSection[] {
  const sections: ContentSection[] = []
  const regex = /<h([123])[^>]*\sid="([^"]*)"[^>]*>([\s\S]*?)<\/h\1>/gi
  let m: RegExpExecArray | null
  while ((m = regex.exec(html)) !== null) {
    const level = Number(m[1]) as 1 | 2 | 3
    const id = m[2]
    const label = m[3].replace(/<[^>]+>/g, '').trim() || 'Section'
    if (id) sections.push({ id, label, level })
  }
  return sections
}

/**
 * Formats inline markdown (bold, italic, code) within a line
 * Note: Text should already be HTML-escaped before calling this
 */
function formatInlineMarkdown(text: string): string {
  let formatted = text
  
  // Inline code (`code`) - process first to avoid conflicts
  formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">$1</code>')
  
  // Bold text (**text** or __text__) - process before italic
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
  formatted = formatted.replace(/__([^_]+)__/g, '<strong class="font-semibold text-gray-900">$1</strong>')
  
  // Italic text (*text* or _text_) - only if not part of bold
  // Use negative lookbehind/lookahead to avoid matching bold markers
  formatted = formatted.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em class="italic">$1</em>')
  formatted = formatted.replace(/(?<!_)_([^_\n]+?)_(?!_)/g, '<em class="italic">$1</em>')
  
  return formatted
}

/**
 * Normalize common AI-produced Mermaid edge-label syntax:
 * "A --> B: label" -> "A -->|label| B"
 * This keeps diagrams renderable even when the model emits pseudo-Mermaid.
 */
function normalizeMermaidSource(source: string): string {
  if (!source || typeof source !== 'string') return source
  const lines = source.split('\n')
  const normalized = lines.map((line) => {
    // Skip already-valid edge label syntax and non-edge lines.
    if (line.includes('-->|')) return line
    const match = line.match(/^(\s*)(.+?)\s*-->\s*([^:]+?)\s*:\s*(.+)\s*$/)
    if (!match) return line
    const indent = match[1]
    const fromNode = match[2].trim()
    const toNode = match[3].trim()
    const edgeLabel = match[4].trim()
    return `${indent}${fromNode} -->|${edgeLabel}| ${toNode}`
  })
  return normalized.join('\n')
}

/**
 * Repair frequently broken AI Mermaid output:
 * - Join dangling edges where the target node is on the next line:
 *   A -->|label|
 *   B(Node)            -> A -->|label| B(Node)
 * - Trim accidental trailing pipes/spaces safely.
 */
function repairBrokenMermaidLines(source: string): string {
  if (!source || typeof source !== 'string') return source
  const lines = source.split('\n')
  const repaired: string[] = []
  for (let i = 0; i < lines.length; i++) {
    let current = lines[i]
    const trimmed = current.trim()
    const next = i + 1 < lines.length ? lines[i + 1].trim() : ''

    // Fix malformed edge labels with trailing stray ")" before closing pipe.
    // Example: C -->|İmtiyazlı Rejim)| D  -> C -->|İmtiyazlı Rejim| D
    current = current.replace(/-->\s*\|([^|]*?)\)\|/g, '-->|$1|')
    // Mermaid can choke on some punctuation combos inside edge labels.
    // Normalize edge-label payload to plain text, preserving meaning.
    current = current.replace(/(-->\s*\|)([^|]*)(\|)/g, (_m, start: string, rawLabel: string, end: string) => {
      const safeLabel = rawLabel
        .replace(/[()[\]{}]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
      return `${start}${safeLabel}${end}`
    })

    // Dangling edge arrow with optional edge label but no target node yet.
    const isDanglingEdge = /-->\s*(\|[^|]*\|)?\s*$/.test(trimmed)
    const nextLooksLikeNodeStart = /^[A-Za-z][A-Za-z0-9_]*(?:\[|\(|\{)/.test(next)
    if (isDanglingEdge && nextLooksLikeNodeStart) {
      repaired.push(`${current.trimEnd()} ${next}`)
      i++ // consume next line
      continue
    }

    repaired.push(current.replace(/\|\s*$/, '|').trimEnd())
  }
  return repaired.join('\n')
}

/**
 * Alternative Mermaid normalization for parser compatibility:
 * - Convert node labels in parentheses to quoted square labels:
 *   A(Label) -> A["Label"]
 * - Strip control characters that can break parser unexpectedly.
 */
function normalizeMermaidSourceForRetry(source: string): string {
  if (!source || typeof source !== 'string') return source
  const noControlChars = source.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  const repaired = repairBrokenMermaidLines(noControlChars)
  // Also accept missing closing ")" in AI output: A(Label  -> A["Label"]
  return repaired.replace(
    /\b([A-Za-z][A-Za-z0-9_]*)\(([^)\n]*)(?:\))?/g,
    (_m, id: string, label: string) => `${id}["${label.trim().replace(/"/g, '\\"')}"]`
  )
}

const DEFAULT_CONTENT_LABELS: LessonContentLabels = {
  contentsLabel: 'Contents',
  expand: 'Expand',
  collapse: 'Collapse',
  fullScreen: 'Full screen',
}

export function LessonContent({ content, images, centerText, labels = {} }: LessonContentProps) {
  const L = { ...DEFAULT_CONTENT_LABELS, ...labels }
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [fullScreenImage, setFullScreenImage] = useState<LessonImage | null>(null)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [mermaidHost, setMermaidHost] = useState<HTMLDivElement | null>(null)

  const scrollToSection = useCallback((id: string, index: number) => {
    setCurrentSectionIndex(index)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // Close fullscreen image on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullScreenImage(null)
    }
    if (fullScreenImage) {
      document.addEventListener('keydown', onKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [fullScreenImage])

  // Ensure images is an array - DO NOT sort to prevent hydration mismatch
  // Server and client localeCompare can behave differently
  const safeImages = useMemo(() => {
    return Array.isArray(images) ? images : []
  }, [images])

  // Get images by position - memoized
  const { topImages, middleImages, bottomImages } = useMemo(() => ({
    topImages: safeImages.filter(img => img?.position === 'top'),
    middleImages: safeImages.filter(img => img?.position === 'middle' || !img?.position),
    bottomImages: safeImages.filter(img => img?.position === 'bottom'),
  }), [safeImages])

  // Format markdown content to HTML
  const formattedContent = useMemo(() => {
    if (!content) return ''
    
    // Check if content already contains substantial HTML tags (not just <br>)
    const hasComplexHtml = /<(p|div|h[1-6]|ul|ol|li|strong|em|code)[^>]*>/i.test(content)
    
    let html: string
    if (hasComplexHtml) {
      html = content
        .replace(/<br\s*\/?>/gi, '<br>')
        .replace(/\n\n+/g, '<br><br>')
        .replace(/\n/g, '<br>')
    } else {
      html = formatMarkdownToHtml(content)
    }
    // Allow safe <sub> and <sup> so math-style subscripts/superscripts display correctly
    return restoreSubSupTags(html)
  }, [content])

  // Render LaTeX math (e.g. $x^2$, $$\frac{1}{2}$$) so formulas display clearly
  const contentWithMath = useMemo(
    () => (formattedContent ? renderLatexInHtml(formattedContent) : ''),
    [formattedContent]
  )

  // Sections for table-of-contents and prev/next (long content navigation)
  const sections = useMemo(() => extractSections(contentWithMath), [contentWithMath])
  const hasSections = sections.length > 1

  // Track which section is in view when user scrolls (first intersecting = active)
  useEffect(() => {
    if (sections.length === 0 || typeof document === 'undefined') return
    const idToIndex = new Map(sections.map((s, i) => [s.id, i]))
    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries
          .filter((e) => e.isIntersecting)
          .map((e) => idToIndex.get((e.target as HTMLElement).id))
          .filter((i): i is number => i !== undefined)
        if (intersecting.length > 0) {
          setCurrentSectionIndex(Math.min(...intersecting))
        }
      },
      SECTION_OBSERVER_OPTIONS
    )
    const observed: Element[] = []
    for (const s of sections) {
      const el = document.getElementById(s.id)
      if (el) {
        observer.observe(el)
        observed.push(el)
      }
    }
    return () => {
      observed.forEach((el) => observer.unobserve(el))
    }
  }, [sections])

  // Render Mermaid diagrams for fenced ```mermaid blocks in generated lesson content.
  useEffect(() => {
    if (!mermaidHost) return

    const blocks = Array.from(mermaidHost.querySelectorAll<HTMLDivElement>('.mermaid-block'))
    if (blocks.length === 0) return

    let cancelled = false

    const renderMermaid = async () => {
      try {
        const mermaidModule = await import('mermaid')
        const mermaid = mermaidModule.default
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          theme: 'neutral',
        })

        for (let i = 0; i < blocks.length; i++) {
          if (cancelled) return
          const block = blocks[i]
          const encoded = block.dataset.mermaid ?? ''
          const source = normalizeMermaidSource(repairBrokenMermaidLines(decodeURIComponent(encoded)))
          try {
            const id = `lesson-mermaid-${i}-${Date.now()}`
            const { svg } = await mermaid.render(id, source)
            if (!cancelled) block.innerHTML = svg
          } catch (primaryError) {
            // Retry with a stricter normalization pass for common parser edge-cases.
            const retrySource = normalizeMermaidSourceForRetry(source)
            try {
              const retryId = `lesson-mermaid-retry-${i}-${Date.now()}`
              const { svg } = await mermaid.render(retryId, retrySource)
              if (!cancelled) block.innerHTML = svg
            } catch (retryError) {
              const safeSource = escapeHtml(source)
              const errorText = escapeHtml(
                retryError instanceof Error
                  ? retryError.message
                  : primaryError instanceof Error
                    ? primaryError.message
                    : 'Unknown Mermaid error'
              )
              block.innerHTML =
                `<div class="rounded-md border border-red-200 bg-red-50 p-3">
                  <div class="text-sm font-medium text-red-700">Diagram render failed</div>
                  <div class="mt-1 text-xs text-red-700">${errorText}</div>
                  <pre class="mt-2 overflow-x-auto text-xs text-red-800"><code>${safeSource}</code></pre>
                </div>`
            }
          }
        }
      } catch {
        // Keep fallback text if Mermaid package cannot be loaded.
      }
    }

    renderMermaid()

    return () => {
      cancelled = true
    }
  }, [contentWithMath, mermaidHost])

  const inner = (
    <div className="space-y-6">
      {/* Full Screen Image Modal */}
      {fullScreenImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setFullScreenImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image fullscreen view"
        >
          <button
            className="absolute top-4 right-4 p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            onClick={() => setFullScreenImage(null)}
            aria-label="Close"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div
            className="max-w-7xl max-h-[85vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {fullScreenImage.url.startsWith('data:') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fullScreenImage.url}
                alt={fullScreenImage.alt || 'Lesson image'}
                className="max-w-full max-h-full object-contain rounded"
              />
            ) : (
              <Image
                src={fullScreenImage.url}
                alt={fullScreenImage.alt || 'Lesson image'}
                width={1920}
                height={1080}
                className="max-w-full max-h-full object-contain rounded"
                unoptimized
              />
            )}
          </div>
          {fullScreenImage.description && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-12 pb-6 px-4">
              <p className="text-sm text-white/95 max-w-3xl mx-auto text-center leading-relaxed">
                {fullScreenImage.description}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Top Images — clean grid, no captions on cards */}
      {topImages.length > 0 && (
        <div className="flex justify-center">
          <div className={`grid grid-cols-1 ${topImages.length > 1 ? 'sm:grid-cols-2' : 'max-w-2xl'} gap-5 max-w-4xl w-full`}>
            {topImages.map((img) => (
              <ImageCard 
                key={getImageKey(img)} 
                image={img} 
                expanded={expandedImage === img.url}
                onToggle={() => setExpandedImage(expandedImage === img.url ? null : img.url)}
                onFullScreen={() => setFullScreenImage(img)}
                labels={{ expand: L.expand, collapse: L.collapse, fullScreen: L.fullScreen }}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* "Contents" — sticky, one-line scrollable pills; solid background so text underneath stays readable */}
      {hasSections && (
        <div className="sticky top-20 z-10 mb-5 py-3 -mx-1 px-1 rounded-lg bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              <BookMarked className="w-3 h-3" aria-hidden />
              {L.contentsLabel}
            </span>
          </div>
          <nav
            className="flex gap-1.5 overflow-x-auto overflow-y-hidden pb-1 -mx-0.5"
            aria-label="Lesson sections"
            style={{ scrollbarWidth: 'thin' }}
          >
            {sections.map((s, i) => {
              const isActive = currentSectionIndex === i
              return (
                <button
                  key={`${s.id}-${i}`}
                  type="button"
                  onClick={() => scrollToSection(s.id, i)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-200/50'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                  } ${s.level === 2 ? 'ml-1' : s.level === 3 ? 'ml-2' : ''}`}
                >
                  <span className="whitespace-nowrap max-w-[11rem] truncate block text-left">
                    {s.label.length > 28 ? `${s.label.slice(0, 28)}…` : s.label}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>
      )}

      {/* Content: modern readable width, clean typography */}
      <div
        ref={setMermaidHost}
        className={`max-w-3xl mx-auto text-left
          prose prose-slate prose-lg max-w-none
          prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900
          prose-p:text-slate-700 prose-p:leading-[1.7] prose-p:mb-4
          prose-strong:text-slate-900 prose-strong:font-semibold
          prose-em:italic
          prose-ul:list-disc prose-ul:list-outside prose-ul:pl-6 prose-ul:my-3 prose-ul:space-y-1.5
          prose-ol:list-decimal prose-ol:list-outside prose-ol:pl-6 prose-ol:my-3 prose-ol:space-y-1.5
          prose-li:text-slate-700 prose-li:leading-relaxed prose-li:pl-0.5
          prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:text-slate-800
          [&>h1]:text-3xl [&>h1]:mt-8 [&>h1]:mb-4
          [&>h2]:text-2xl [&>h2]:mt-8 [&>h2]:mb-3 [&>h2]:pb-2 [&>h2]:border-b [&>h2]:border-slate-200
          [&>h3]:text-xl [&>h3]:mt-6 [&>h3]:mb-2
          [&>div]:text-left [&>div]:max-w-full
          ${centerText ? '[&>h1]:text-center [&>h2]:text-center [&>h3]:text-center [&>p]:text-center [&>ul]:text-left [&>ol]:text-left' : ''}`}
        dangerouslySetInnerHTML={{
          __html: contentWithMath,
        }}
      />

      {/* Middle Images */}
      {middleImages.length > 0 && (
        <div className="flex justify-center">
          <div className={`grid grid-cols-1 ${middleImages.length > 1 ? 'sm:grid-cols-2' : 'max-w-2xl'} gap-5 max-w-4xl w-full my-6`}>
            {middleImages.map((img) => (
              <ImageCard 
                key={getImageKey(img)} 
                image={img}
                expanded={expandedImage === img.url}
                onToggle={() => setExpandedImage(expandedImage === img.url ? null : img.url)}
                onFullScreen={() => setFullScreenImage(img)}
                labels={{ expand: L.expand, collapse: L.collapse, fullScreen: L.fullScreen }}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Bottom Images */}
      {bottomImages.length > 0 && (
        <div className="flex justify-center">
          <div className={`grid grid-cols-1 ${bottomImages.length > 1 ? 'sm:grid-cols-2' : 'max-w-2xl'} gap-5 max-w-4xl w-full mt-6`}>
            {bottomImages.map((img) => (
              <ImageCard 
                key={getImageKey(img)} 
                image={img}
                expanded={expandedImage === img.url}
                onToggle={() => setExpandedImage(expandedImage === img.url ? null : img.url)}
                onFullScreen={() => setFullScreenImage(img)}
                labels={{ expand: L.expand, collapse: L.collapse, fullScreen: L.fullScreen }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
  return inner
}

function ImageCard({ 
  image, 
  expanded, 
  onToggle,
  onFullScreen,
  labels = {}
}: { 
  image: LessonImage
  expanded: boolean
  onToggle: () => void
  onFullScreen: () => void
  labels?: { expand?: string; collapse?: string; fullScreen?: string }
}) {
  const expandLabel = labels.expand ?? 'Expand'
  const collapseLabel = labels.collapse ?? 'Collapse'
  const fullScreenLabel = labels.fullScreen ?? 'Full screen'
  const [hasError, setHasError] = useState(false)
  
  // Check if it's a valid image
  if (!image || !image.url) {
    return (
      <div className="rounded-lg border border-red-200 overflow-hidden bg-red-50 p-4">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">Invalid image data</span>
        </div>
      </div>
    )
  }
  
  const isBase64 = image.url.startsWith('data:')
  
  return (
    <div className="group rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
      <div
        className={`relative cursor-pointer transition-all min-h-[200px] ${expanded ? 'h-80' : 'h-52'}`}
        onClick={onFullScreen}
      >
        {hasError ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-50">
            <div className="text-center text-slate-500">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Image failed to load</p>
              <p className="text-xs mt-1 max-w-[200px] truncate">{image.url.substring(0, 50)}...</p>
            </div>
          </div>
        ) : isBase64 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={image.alt || 'Lesson image'}
            className="w-full h-full object-contain bg-slate-50"
            onError={() => setHasError(true)}
          />
        ) : (
          <Image
            src={image.url}
            alt={image.alt || 'Lesson image'}
            fill
            className="object-contain bg-slate-50"
            unoptimized
            onError={() => setHasError(true)}
          />
        )}
        {!hasError && (
          <div
            className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-white/95 shadow-md border border-slate-200/80 p-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onToggle()
              }}
              title={expanded ? collapseLabel : expandLabel}
              aria-label={expanded ? collapseLabel : expandLabel}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onFullScreen()
              }}
              title={fullScreenLabel}
              aria-label={fullScreenLabel}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
