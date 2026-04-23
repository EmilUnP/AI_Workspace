'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

export interface PublicProcessStep {
  title: string
  description: string
  icon: ReactNode
}

interface PublicProcessFlowProps {
  steps: PublicProcessStep[]
  accent?: 'violet' | 'green'
  className?: string
}

export function PublicProcessFlow({ steps, accent = 'violet', className }: PublicProcessFlowProps) {
  const accentRing = accent === 'green' ? 'ring-emerald-200' : 'ring-violet-200'
  const accentBg = accent === 'green' ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'
  const lineBg = accent === 'green' ? 'from-emerald-300 to-teal-300' : 'from-violet-300 to-fuchsia-300'

  return (
    <div className={cn('grid gap-4 md:grid-cols-4', className)}>
      {steps.map((step, index) => (
        <motion.div
          key={step.title}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, delay: index * 0.08 }}
          className="relative rounded-2xl border border-gray-200 bg-white/90 p-5 shadow-sm backdrop-blur-sm"
        >
          {index < steps.length - 1 ? (
            <div className="pointer-events-none absolute right-[-16px] top-1/2 hidden h-[2px] w-8 -translate-y-1/2 md:block">
              <div className={cn('h-full w-full rounded-full bg-gradient-to-r', lineBg)} />
            </div>
          ) : null}
          <div className="flex items-center gap-3">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', accentBg)}>{step.icon}</div>
            <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold text-gray-600 ring-1', accentRing)}>
              Step {index + 1}
            </span>
          </div>
          <h3 className="mt-3 text-base font-bold text-gray-900">{step.title}</h3>
          <p className="mt-1 text-sm text-gray-600">{step.description}</p>
        </motion.div>
      ))}
    </div>
  )
}
