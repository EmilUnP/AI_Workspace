'use client'

import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

export interface PublicMetricItem {
  label: string
  value: string
  hint?: string
}

interface PublicMetricCardsProps {
  items: PublicMetricItem[]
  accent?: 'violet' | 'green'
  className?: string
}

export function PublicMetricCards({ items, accent = 'violet', className }: PublicMetricCardsProps) {
  const gradient = accent === 'green' ? 'from-emerald-50 to-teal-50' : 'from-violet-50 to-fuchsia-50'
  const valueColor = accent === 'green' ? 'text-emerald-700' : 'text-violet-700'

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {items.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.35, delay: index * 0.06 }}
          whileHover={{ y: -3 }}
          className={cn('rounded-2xl border border-gray-200 bg-gradient-to-br p-4 shadow-sm', gradient)}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{item.label}</p>
          <p className={cn('mt-1 text-2xl font-bold tabular-nums', valueColor)}>{item.value}</p>
          {item.hint ? <p className="mt-1 text-xs text-gray-600">{item.hint}</p> : null}
        </motion.div>
      ))}
    </div>
  )
}
