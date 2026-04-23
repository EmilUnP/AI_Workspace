'use client'

import * as React from 'react'
import { cn } from '../../lib/utils'

export interface DashboardCardProps {
  title: string
  description?: string
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
  contentClassName?: string
}

export function DashboardCard({
  title,
  description,
  children,
  actions,
  className,
  contentClassName,
}: DashboardCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className={cn('p-6', contentClassName)}>{children}</div>
    </div>
  )
}
