'use client'

import { StudentClassesList } from '@eduator/ui'
import type { StudentClassItem, StudentClassesListLabels } from '@eduator/ui'
import { joinClassByCode } from './actions'

interface StudentClassesClientProps {
  classes: StudentClassItem[]
  labels?: Partial<StudentClassesListLabels>
}

export function StudentClassesClient({ classes, labels }: StudentClassesClientProps) {
  return (
    <StudentClassesList
      classes={classes}
      onJoinClass={joinClassByCode}
      showJoinButton={true}
      labels={labels}
    />
  )
}
