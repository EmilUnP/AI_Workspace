import type { ReactNode } from 'react' 
import { createT } from './t'

export const NextIntlClientProvider = ({
  children,
}: {
  children: ReactNode
  messages?: Record<string, unknown>
}) => {
  return children
}

export const useTranslations = (namespace?: string) => {
  return createT(namespace)
}

