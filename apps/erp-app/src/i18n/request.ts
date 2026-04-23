import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { getMessageModule } from './module-mapping'
import { X_PATHNAME_HEADER } from './constants'
import { MESSAGES } from './messages-static'

export const locales = ['en', 'az', 'ru', 'tr'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'az'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const raw = cookieStore.get('NEXT_LOCALE')?.value
  const locale = locales.includes(raw as Locale) ? (raw as Locale) : defaultLocale

  const headerStore = await headers()
  const pathname = headerStore.get(X_PATHNAME_HEADER) ?? '/'
  const messageModule = getMessageModule(pathname)

  const publicMessages = MESSAGES.public[locale]
  const moduleMessages = MESSAGES[messageModule][locale]
  const messages =
    messageModule === 'public'
      ? publicMessages
      : { ...publicMessages, ...moduleMessages }

  return {
    locale,
    messages,
  }
})
