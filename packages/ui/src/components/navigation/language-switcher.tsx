'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Globe } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface LocaleOption {
  code: string
  label: string
  countryCode: string
}

export interface LanguageSwitcherProps {
  currentLocale: string
  locales: LocaleOption[]
  onLocaleChange: (locale: string) => void
  accent?: 'green' | 'violet'
}

function FlagImage({ countryCode, label, size = 20 }: { countryCode: string; label: string; size?: number }) {
  return (
    <Image
      src={`https://flagcdn.com/w40/${countryCode}.png`}
      alt={label}
      width={size}
      height={Math.round(size * 0.75)}
      className="rounded-[2px] object-cover"
      unoptimized
    />
  )
}

export function LanguageSwitcher({
  currentLocale,
  locales,
  onLocaleChange,
  accent = 'violet',
}: LanguageSwitcherProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isGreen = accent === 'green'

  const current = locales.find((l) => l.code === currentLocale) ?? locales[0]

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors',
          isGreen
            ? 'border-green-200 text-green-700 hover:bg-green-50'
            : 'border-violet-200 text-violet-700 hover:bg-violet-50'
        )}
        aria-label="Change language"
      >
        <FlagImage countryCode={current?.countryCode} label={current?.label} size={18} />
        <span className="hidden sm:inline">{current?.label}</span>
        <Globe className="h-3.5 w-3.5 opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {locales.map((locale) => (
            <button
              key={locale.code}
              type="button"
              onClick={() => {
                onLocaleChange(locale.code)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors',
                locale.code === currentLocale
                  ? isGreen
                    ? 'bg-green-50 font-medium text-green-700'
                    : 'bg-violet-50 font-medium text-violet-700'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              <FlagImage countryCode={locale.countryCode} label={locale.label} size={20} />
              <span>{locale.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
