import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface PublicPageShellProps {
  children: ReactNode
  accent?: 'violet' | 'green'
  className?: string
}

export function PublicPageShell({ children, accent = 'violet', className }: PublicPageShellProps) {
  const gradient =
    accent === 'green'
      ? 'bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(16,185,129,0.10),transparent)]'
      : 'bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(139,92,246,0.10),transparent)]'
  const gridColor = accent === 'green' ? '#0d9488' : '#8b5cf6'

  return (
    <div className={cn('relative min-h-screen overflow-hidden bg-[#fafafa]', className)}>
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className={cn('absolute inset-0', gradient)} />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(to right, ${gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`,
            backgroundSize: '3rem 3rem',
          }}
        />
      </div>
      {children}
    </div>
  )
}

interface PublicContainerProps {
  children: ReactNode
  className?: string
}

export function PublicContainer({ children, className }: PublicContainerProps) {
  return <div className={cn('relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>
}

interface PublicSectionHeadingProps {
  kicker?: string
  title: string
  description?: string
  align?: 'left' | 'center'
  className?: string
}

export function PublicSectionHeading({
  kicker,
  title,
  description,
  align = 'center',
  className,
}: PublicSectionHeadingProps) {
  return (
    <div className={cn(align === 'center' ? 'text-center' : 'text-left', className)}>
      {kicker ? (
        <span className="mb-2 block text-sm font-semibold uppercase tracking-widest text-violet-600">{kicker}</span>
      ) : null}
      <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">{title}</h2>
      {description ? <p className={cn('mt-3 text-gray-600', align === 'center' ? 'mx-auto max-w-2xl' : 'max-w-2xl')}>{description}</p> : null}
    </div>
  )
}
