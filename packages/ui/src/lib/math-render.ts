/**
 * Renders LaTeX math in HTML or plain text.
 * Supports inline $...$ and block $$...$$ (and \(...\) \[...\]).
 * Used across lessons, exams, and chat to display formulas clearly.
 */
import katex from 'katex'
import 'katex/dist/katex.min.css'

const MATH_PH_START = '\u0000M\u0001'
const MATH_PH_END = '\u0001'

/** Renders a LaTeX string to HTML. Returns escaped text on parse error. */
function renderLatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex.trim(), {
      displayMode,
      throwOnError: false,
      output: 'html',
      strict: false,
    })
  } catch {
    return escapeHtml(latex)
  }
}

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
 * Replaces LaTeX in a string with KaTeX-rendered HTML.
 * Supports: $$...$$ (block), $...$ (inline), \[...\] (block), \(...\) (inline).
 * Use for content that is already HTML (e.g. lesson content, question_html).
 */
export function renderLatexInHtml(html: string): string {
  if (!html || typeof html !== 'string') return html

  const rendered: string[] = []

  const makePlaceholder = (idx: number) => `${MATH_PH_START}${idx}${MATH_PH_END}`

  let result = html

  // Block math: \[ ... \] and $$ ... $$
  const blockRegex = /\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$/g
  result = result.replace(blockRegex, (_, backslashContent, dollarContent) => {
    const latex = (backslashContent ?? dollarContent ?? '').trim()
    const idx = rendered.length
    rendered.push(renderLatex(latex, true))
    return makePlaceholder(idx)
  })

  // Inline math: \( ... \) and $ ... $ (single $, content must not contain $)
  const inlineRegex = /\\\(([\s\S]*?)\\\)|\$(?!\$)([^$\n]+?)\$/g
  result = result.replace(inlineRegex, (_, parenContent, dollarContent) => {
    const latex = (parenContent ?? dollarContent ?? '').trim()
    const idx = rendered.length
    rendered.push(renderLatex(latex, false))
    return makePlaceholder(idx)
  })

  // Restore placeholders with rendered HTML (\u0000M\u0001N\u0001)
  result = result.replace(/\u0000M\u0001(\d+)\u0001/g, (_, i) => rendered[parseInt(i, 10)] ?? '')

  return result
}

/**
 * Renders plain text that may contain LaTeX. Returns HTML string.
 * Preserves newlines as <br>. Use for chat, option labels, etc.
 */
export function renderPlainTextWithMath(text: string): string {
  if (!text || typeof text !== 'string') return ''
  const escaped = escapeHtml(text).replace(/\n/g, '<br />')
  return renderLatexInHtml(escaped)
}
