'use client'

import { useMemo } from 'react'
import { renderLatexInHtml, renderPlainTextWithMath } from '../../lib/math-render'
import { cn } from '../../lib/utils'

export interface RichTextWithMathProps {
  /** Raw content: may contain LaTeX via $...$, $$...$$, \(...\), \[...\] */
  content: string
  /** When true, content is treated as HTML (e.g. question_html). When false, content is plain text (escaped first). */
  asHtml?: boolean
  className?: string
  /** Root element. Default 'span'. Use 'div' for block-level (e.g. question text). */
  as?: 'span' | 'div'
}

/**
 * Renders text with LaTeX math (KaTeX). Use in lessons, exams, and chat
 * so formulas (e.g. square, log, fractions) display clearly.
 */
export function RichTextWithMath({
  content,
  asHtml = false,
  className,
  as: Component = 'span',
}: RichTextWithMathProps) {
  const html = useMemo(() => {
    if (!content) return ''
    return asHtml ? renderLatexInHtml(content) : renderPlainTextWithMath(content)
  }, [content, asHtml])

  if (!html) return null

  return (
    <Component
      className={cn('rich-text-with-math', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
