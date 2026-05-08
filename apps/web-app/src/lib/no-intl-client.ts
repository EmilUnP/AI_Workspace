'use client'

import type { ReactNode } from 'react' 
import { createContext, createElement, useContext } from 'react'
import { createT } from './t'
import { getClientLocale, type AppLocale } from './i18n'

const LocaleContext = createContext<AppLocale>('en')

export const NextIntlClientProvider = ({
  children,
  locale,
}: {
  children: ReactNode
  locale?: string
  messages?: Record<string, unknown>
}) => {
  const normalizedLocale = (locale === 'az' ? 'az' : 'en') as AppLocale
  return createElement(LocaleContext.Provider, { value: normalizedLocale }, children)
}

export const useTranslations = (namespace?: string) => {
  const contextLocale = useContext(LocaleContext)
  const locale = typeof window === 'undefined' ? contextLocale : getClientLocale()
  return createT(namespace, locale)
}

export const useLocale = (): AppLocale => {
  return useContext(LocaleContext)
}

