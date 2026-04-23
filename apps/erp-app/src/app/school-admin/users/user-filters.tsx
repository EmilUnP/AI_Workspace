'use client'

import { Search, X } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'

interface UserFiltersProps {
  currentParams: {
    search?: string
    status?: string
    role?: string
  }
}

export function UserFilters({ currentParams }: UserFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(currentParams.search || '')

  const updateFilters = (key: string, value: string) => {
    // Start with current URL params to preserve all existing params (including sort)
    const params = new URLSearchParams(window.location.search)
    
    // Update or remove the filter being changed
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    
    const queryString = params.toString()
    startTransition(() => {
      router.push(queryString ? `${pathname}?${queryString}` : pathname)
    })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters('search', search)
  }

  const clearSearch = () => {
    setSearch('')
    updateFilters('search', '')
  }

  const activeFiltersCount = [
    currentParams.status,
    currentParams.role,
  ].filter(Boolean).length

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Search */}
      <form onSubmit={handleSearch} className="relative max-w-sm flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-9 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {search && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {activeFiltersCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
            {activeFiltersCount}
          </span>
        )}
        
        <select
          value={currentParams.status || 'all'}
          onChange={(e) => updateFilters('status', e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={currentParams.role || 'all'}
          onChange={(e) => updateFilters('role', e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Roles</option>
          <option value="teacher">Teacher</option>
        </select>

        {isPending && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        )}
      </div>
    </div>
  )
}
