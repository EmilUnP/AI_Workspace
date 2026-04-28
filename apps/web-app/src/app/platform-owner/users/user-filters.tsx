'use client'

import { Search, X } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'

interface UserFiltersProps {
  currentParams: {
    search?: string
    status?: string
    role?: string
    source?: string
  }
}

export function UserFilters({ currentParams }: UserFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(currentParams.search || '')

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams()
    
    if (currentParams.search && key !== 'search') params.set('search', currentParams.search)
    if (currentParams.status && key !== 'status') params.set('status', currentParams.status)
    if (currentParams.role && key !== 'role') params.set('role', currentParams.role)
    if (currentParams.source && key !== 'source') params.set('source', currentParams.source)
    
    if (value && value !== 'all') {
      params.set(key, value)
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
    currentParams.source
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
          className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-9 text-sm placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
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
      <div className="flex flex-wrap items-center gap-2">
        {activeFiltersCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-xs font-medium text-green-700">
            {activeFiltersCount}
          </span>
        )}
        
        {/* Source Filter - ERP vs ERP */}
        <select
          value={currentParams.source || 'all'}
          onChange={(e) => updateFilters('source', e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        >
          <option value="all">All Sources</option>
          <option value="erp">🏢 ERP Users</option>
          <option value="api">🔗 API Users</option>
        </select>
        
        <select
          value={currentParams.status || 'all'}
          onChange={(e) => updateFilters('status', e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={currentParams.role || 'all'}
          onChange={(e) => updateFilters('role', e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        >
          <option value="all">All Roles</option>
          <option value="platform_owner">Platform Owner</option>
          <option value="school_superadmin">School Admin</option>
          <option value="teacher">Teacher</option>
        </select>

        {isPending && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
        )}
      </div>
    </div>
  )
}
