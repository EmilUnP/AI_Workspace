'use client'

import nextDynamic from 'next/dynamic'
import type { StudentAssistantClientProps } from '@eduator/ui'

const StudentAssistantClient = nextDynamic(
  () => import('@eduator/ui').then((m) => m.StudentAssistantClient),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse rounded-lg bg-gray-200 min-h-[400px]" />
    ),
  }
)

export function StudentAssistantClientWrapper(
  props: StudentAssistantClientProps
) {
  return <StudentAssistantClient {...props} />
}
