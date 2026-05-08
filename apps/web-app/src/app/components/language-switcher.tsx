'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { getClientLocale, setClientLocale, type AppLocale } from '@/lib/i18n'

interface LanguageSwitcherProps {
  compact?: boolean
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const router = useRouter()
  const t = useTranslations('common')
  const initialLocale = useLocale()
  const [locale, setLocale] = useState<AppLocale>(initialLocale)

  useEffect(() => {
    setLocale(getClientLocale())
  }, [])

  const handleSwitch = (nextLocale: AppLocale) => {
    if (nextLocale === locale) return
    setLocale(nextLocale)
    setClientLocale(nextLocale)
    router.refresh()
  }

  return (
    <div className={`inline-flex items-center rounded-lg border border-gray-200 bg-white p-1 ${compact ? 'gap-1' : 'gap-2'}`}>
      {!compact && <span className="px-2 text-xs font-medium text-gray-600">{t('language')}</span>}
      <button
        type="button"
        onClick={() => handleSwitch('en')}
        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
          locale === 'en' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
        }`}
        aria-label={t('english')}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => handleSwitch('az')}
        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
          locale === 'az' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
        }`}
        aria-label={t('azerbaijani')}
      >
        AZ
      </button>
    </div>
  )
}

