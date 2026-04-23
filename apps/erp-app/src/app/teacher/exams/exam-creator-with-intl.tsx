'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { DEFAULT_EXAM_CREATOR_TRANSLATIONS, type ExamCreatorProps, type ExamCreatorTranslations } from '@eduator/ui'

const ExamCreator = dynamic(
  () => import('@eduator/ui').then((m) => m.ExamCreator),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse rounded-lg bg-gray-200 h-96" />
    ),
  }
)

/** Client-only wrapper: resolves teacherExamCreator translations and passes them to ExamCreator. */
export function ExamCreatorWithIntl(props: Omit<ExamCreatorProps, 'translations' | 'translationsContext'>) {
  const t = useTranslations('teacherExamCreator')
  const creatorTranslations = Object.fromEntries(
    (Object.keys(DEFAULT_EXAM_CREATOR_TRANSLATIONS) as (keyof ExamCreatorTranslations)[]).map((k) => [k, t(k)])
  ) as unknown as ExamCreatorTranslations

  return (
    <ExamCreator
      {...props}
      translations={creatorTranslations}
    />
  )
}
