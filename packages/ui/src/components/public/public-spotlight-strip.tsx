import Link from 'next/link'
import { cn } from '../../lib/utils'

interface PublicSpotlightStripProps {
  kicker: string
  title: string
  description: string
  ctaLabel: string
  ctaHref: string
  accent?: 'violet' | 'green'
  className?: string
}

export function PublicSpotlightStrip({
  kicker,
  title,
  description,
  ctaLabel,
  ctaHref,
  accent = 'violet',
  className,
}: PublicSpotlightStripProps) {
  const bg = accent === 'green' ? 'from-emerald-600 via-teal-600 to-cyan-700' : 'from-violet-600 via-purple-600 to-fuchsia-700'
  const text = accent === 'green' ? 'text-emerald-100' : 'text-violet-100'

  return (
    <section className={cn('relative overflow-hidden rounded-2xl px-5 py-8 text-white shadow-xl sm:px-8', `bg-gradient-to-br ${bg}`, className)}>
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
        aria-hidden
      />
      <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest">{kicker}</p>
          <h3 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h3>
          <p className={cn('mt-2 max-w-2xl text-sm sm:text-base', text)}>{description}</p>
        </div>
        <Link
          href={ctaHref}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100"
        >
          {ctaLabel}
        </Link>
      </div>
    </section>
  )
}
