import type { ReactNode } from 'react' 
import { createT } from './t'
import { getClientLocale } from './i18n'

export const NextIntlClientProvider = ({
  children,
}: {
  children: ReactNode
  messages?: Record<string, unknown>
}) => {
  return children
}

export const useTranslations = (namespace?: string) => {
  return createT(namespace, getClientLocale())
}

