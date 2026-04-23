'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { GraduationCap, Menu, X } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface NavLink {
  href: string
  label: string
}

export interface PublicHeaderClientProps {
  navLinks: NavLink[]
  authContent: React.ReactNode
  brandName: string
  accent: 'green' | 'violet'
  borderClass?: string
  headerClass?: string
  languageSwitcher?: React.ReactNode
}

const MOBILE_MENU_Z_OVERLAY = 9998
const MOBILE_MENU_Z_DRAWER = 9999

export function PublicHeaderClient({
  navLinks,
  authContent,
  brandName,
  accent,
  borderClass: _borderClass = 'border-gray-200',
  headerClass,
  languageSwitcher,
}: PublicHeaderClientProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const isGreen = accent === 'green'

  useEffect(() => {
    setMounted(true)
  }, [])

  // When menu is open, lock body scroll so overlay/drawer sit clearly on top
  useEffect(() => {
    if (!mounted) return
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open, mounted])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm',
        isGreen ? 'border-green-100' : 'border-violet-100',
        headerClass
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2" onClick={() => setOpen(false)}>
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl shadow-lg',
              isGreen ? 'bg-gradient-to-br from-green-600 to-emerald-600' : 'bg-violet-600'
            )}
          >
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900 sm:text-xl">{brandName}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-4 md:flex">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              {label}
            </Link>
          ))}
          {languageSwitcher}
          {authContent}
        </nav>

        {/* Mobile hamburger - high contrast for visibility */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl border-2 transition-all active:scale-95 md:hidden',
            isGreen
              ? 'border-green-200 bg-green-50 text-green-700 hover:border-green-300 hover:bg-green-100'
              : 'border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300 hover:bg-violet-100'
          )}
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" strokeWidth={2.25} />
        </button>
      </div>

      {/* Mobile drawer: render in portal so it sits above everything (no z-index fighting with header) */}
      {mounted && open && typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm md:hidden"
              style={{ zIndex: MOBILE_MENU_Z_OVERLAY }}
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <div
              className={cn(
                'fixed right-0 top-0 flex h-full w-[min(20rem,88vw)] flex-col border-l bg-white shadow-2xl md:hidden',
                isGreen ? 'border-green-200' : 'border-violet-200'
              )}
              style={{ zIndex: MOBILE_MENU_Z_DRAWER }}
            >
              <div
                className={cn(
                  'flex h-16 shrink-0 items-center justify-between border-b px-4',
                  isGreen ? 'border-green-100 bg-green-50/50' : 'border-violet-100 bg-violet-50/50'
                )}
              >
                <span className="text-lg font-bold text-gray-900">{brandName}</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-xl border-2 transition-all active:scale-95',
                    isGreen
                      ? 'border-green-200 bg-white text-green-700 hover:bg-green-50'
                      : 'border-violet-200 bg-white text-violet-700 hover:bg-violet-50'
                  )}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" strokeWidth={2.25} />
                </button>
              </div>
              <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-4">
                {navLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'block rounded-xl px-4 py-3.5 text-base font-medium transition-colors',
                      isGreen
                        ? 'text-gray-700 hover:bg-green-50 hover:text-green-800'
                        : 'text-gray-700 hover:bg-violet-50 hover:text-violet-800'
                    )}
                  >
                    {label}
                  </Link>
                ))}
                {languageSwitcher && (
                  <div className="mt-2">{languageSwitcher}</div>
                )}
                <div
                  className={cn(
                    'mt-4 flex flex-col gap-2 border-t pt-4',
                    isGreen ? 'border-green-100' : 'border-violet-100'
                  )}
                >
                  {authContent}
                </div>
              </nav>
            </div>
          </>,
          document.body
        )}
    </header>
  )
}
