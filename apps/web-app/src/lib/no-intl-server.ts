import { createT } from './t'
import { cookies, headers } from 'next/headers'
import { LOCALE_COOKIE_NAME, normalizeLocale } from './i18n'

export const getTranslations = async (namespace?: string) => {
  const locale = await getLocale()
  return createT(namespace, locale)
}

export const getLocale = async () => {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value
  if (cookieLocale) return normalizeLocale(cookieLocale)
  const acceptLanguage = (await headers()).get('accept-language')
  return normalizeLocale(acceptLanguage)
}

export const getMessages = async () => ({})

export const getRequestConfig = <T>(factory: () => T) => factory

