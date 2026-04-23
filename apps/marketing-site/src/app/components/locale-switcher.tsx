'use client'

import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { LanguageSwitcher, type LocaleOption } from '@eduator/ui'

const LOCALE_OPTIONS: LocaleOption[] = [
  { code: 'en', label: 'English', countryCode: 'gb' },
  { code: 'az', label: 'Azərbaycan', countryCode: 'az' },
  { code: 'ru', label: 'Русский', countryCode: 'ru' },
  { code: 'tr', label: 'Türkçe', countryCode: 'tr' },
]

export function LocaleSwitcher({ accent = 'violet' }: { accent?: 'green' | 'violet' }) {
  const locale = useLocale()
  const router = useRouter()

  function handleChange(newLocale: string) {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;SameSite=Lax`
    router.refresh()
  }

  return (
    <LanguageSwitcher
      currentLocale={locale}
      locales={LOCALE_OPTIONS}
      onLocaleChange={handleChange}
      accent={accent}
    />
  )
}

