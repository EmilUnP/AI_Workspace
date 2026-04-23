'use client'

import { createContext, type ReactNode } from 'react'
import type { ExamCreatorTranslations } from '@eduator/ui'

export const ExamCreatorTranslationsContext = createContext<Partial<ExamCreatorTranslations> | null>(null)

export function ExamCreatorTranslationsProvider({
  value,
  children,
}: {
  value: Partial<ExamCreatorTranslations>
  children: ReactNode
}) {
  return (
    <ExamCreatorTranslationsContext.Provider value={value}>
      {children}
    </ExamCreatorTranslationsContext.Provider>
  )
}
