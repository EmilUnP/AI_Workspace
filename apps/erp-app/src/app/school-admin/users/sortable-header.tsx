'use client'

import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useTransition } from 'react'

interface SortableHeaderProps {
  label: string
  sortKey: string
  currentSortBy?: string
  currentSortOrder?: string
  className?: string
}

export function SortableHeader({ 
  label, 
  sortKey, 
  currentSortBy, 
  currentSortOrder,
  className = ''
}: SortableHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const isActive = currentSortBy === sortKey
  const isAsc = isActive && currentSortOrder === 'asc'

  const handleSort = () => {
    const params = new URLSearchParams(window.location.search)
    
    // If clicking the same column, toggle order
    if (isActive) {
      params.set('sortOrder', isAsc ? 'desc' : 'asc')
    } else {
      params.set('sortBy', sortKey)
      params.set('sortOrder', 'asc')
    }
    
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const getSortIcon = () => {
    if (!isActive) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
    }
    return isAsc 
      ? <ArrowUp className="h-3.5 w-3.5 text-gray-700" />
      : <ArrowDown className="h-3.5 w-3.5 text-gray-700" />
  }

  return (
    <th 
      scope="col" 
      className={`${className} ${isActive ? 'text-gray-900' : 'text-gray-500'} cursor-pointer select-none hover:text-gray-700 transition-colors`}
      onClick={handleSort}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
        {getSortIcon()}
        {isPending && (
          <div className="ml-1 h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
        )}
      </div>
    </th>
  )
}
