'use client'

import dynamic from 'next/dynamic'
import type { ExamCreatorProps } from '@eduator/ui'
import type { Context } from 'react'
import type { ExamCreatorTranslations } from '@eduator/ui'

const ExamCreator = dynamic(
  () => import('@eduator/ui').then((m) => m.ExamCreator),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse rounded-lg bg-gray-200 h-96" />
    ),
  }
)

export type ExamCreatorDynamicProps = ExamCreatorProps & {
  translationsContext?: Context<Partial<ExamCreatorTranslations> | null>
}

export function ExamCreatorDynamic(props: ExamCreatorDynamicProps) {
  return <ExamCreator {...props} />
}
