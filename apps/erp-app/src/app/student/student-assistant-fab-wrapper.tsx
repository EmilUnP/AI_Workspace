'use client'

import { useTranslations } from 'next-intl'
import { StudentAssistantFab } from '@eduator/ui'
import type { StudentAssistantFabProps } from '@eduator/ui'

/**
 * Wraps StudentAssistantFab and injects client-side translations for the button
 * (title + aria-label) so they update with the current locale without a full reload.
 */
export function StudentAssistantFabWrapper(props: StudentAssistantFabProps) {
  const t = useTranslations('studentAssistant')
  const clientButtonLabels = {
    openAssistant: t('openAssistant'),
    openStudyAssistant: t('openStudyAssistant'),
  }
  const labels = { ...props.labels, ...clientButtonLabels }
  return <StudentAssistantFab {...props} labels={labels} />
}
