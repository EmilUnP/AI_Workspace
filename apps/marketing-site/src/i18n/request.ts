import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { MESSAGES } from './messages-static'

export const locales = ['en', 'az'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'az'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const raw = cookieStore.get('NEXT_LOCALE')?.value
  const locale = locales.includes(raw as Locale) ? (raw as Locale) : defaultLocale

  return {
    locale,
    messages: MESSAGES.public[locale],
  }
})

