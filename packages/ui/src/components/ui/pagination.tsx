'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { cn } from '../../lib/utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
  baseUrl: string
  searchParams?: Record<string, string | undefined>
  className?: string
}

function generatePageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  const pages: (number | 'ellipsis')[] = []
  
  if (totalPages <= 7) {
    // Show all pages if 7 or less
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    // Always show first page
    pages.push(1)
    
    if (currentPage > 3) {
      pages.push('ellipsis')
    }
    
    // Show pages around current page
    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    if (currentPage < totalPages - 2) {
      pages.push('ellipsis')
    }
    
    // Always show last page
    pages.push(totalPages)
  }
  
  return pages
}

function buildUrl(baseUrl: string, page: number, searchParams?: Record<string, string | undefined>): string {
  const params = new URLSearchParams()
  
  // Add existing search params
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value && key !== 'page') {
        params.set(key, value)
      }
    })
  }
  
  // Add page param
  if (page > 1) {
    params.set('page', page.toString())
  }
  
  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  baseUrl, 
  searchParams,
  className 
}: PaginationProps) {
  if (totalPages <= 1) return null
  
  const pages = generatePageNumbers(currentPage, totalPages)
  
  return (
    <nav 
      className={cn("flex items-center justify-center gap-1", className)}
      aria-label="Pagination"
    >
      {/* Previous button */}
      {currentPage > 1 ? (
        <Link
          href={buildUrl(baseUrl, currentPage - 1, searchParams)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed">
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}
      
      {/* Page numbers - hidden on mobile */}
      <div className="hidden items-center gap-1 sm:flex">
        {pages.map((page, index) => {
          if (page === 'ellipsis') {
            return (
              <span 
                key={`ellipsis-${index}`}
                className="inline-flex h-9 w-9 items-center justify-center text-gray-400"
              >
                <MoreHorizontal className="h-4 w-4" />
              </span>
            )
          }
          
          const isActive = page === currentPage
          
          return (
            <Link
              key={page}
              href={buildUrl(baseUrl, page, searchParams)}
              className={cn(
                "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {page}
            </Link>
          )
        })}
      </div>
      
      {/* Mobile page indicator */}
      <span className="inline-flex items-center px-3 text-sm text-gray-500 sm:hidden">
        Page {currentPage} of {totalPages}
      </span>
      
      {/* Next button */}
      {currentPage < totalPages ? (
        <Link
          href={buildUrl(baseUrl, currentPage + 1, searchParams)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed">
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  )
}

// Pagination info component
interface PaginationInfoProps {
  currentPage: number
  perPage: number
  totalItems: number
  className?: string
}

export function PaginationInfo({ 
  currentPage, 
  perPage, 
  totalItems,
  className 
}: PaginationInfoProps) {
  const start = (currentPage - 1) * perPage + 1
  const end = Math.min(currentPage * perPage, totalItems)
  
  return (
    <p className={cn("text-sm text-gray-500", className)}>
      Showing <span className="font-medium text-gray-900">{start}</span> to{' '}
      <span className="font-medium text-gray-900">{end}</span> of{' '}
      <span className="font-medium text-gray-900">{totalItems}</span> results
    </p>
  )
}

// Combined pagination footer
interface PaginationFooterProps {
  currentPage: number
  perPage: number
  totalItems: number
  baseUrl: string
  searchParams?: Record<string, string | undefined>
  className?: string
}

export function PaginationFooter({
  currentPage,
  perPage,
  totalItems,
  baseUrl,
  searchParams,
  className
}: PaginationFooterProps) {
  const totalPages = Math.ceil(totalItems / perPage)
  
  return (
    <div className={cn("flex flex-col items-center justify-between gap-4 sm:flex-row", className)}>
      <PaginationInfo 
        currentPage={currentPage}
        perPage={perPage}
        totalItems={totalItems}
      />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        baseUrl={baseUrl}
        searchParams={searchParams}
      />
    </div>
  )
}
