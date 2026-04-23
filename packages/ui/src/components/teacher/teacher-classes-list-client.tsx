'use client'

import { useState } from 'react'
import { TeacherClassesList } from './teacher-classes-list'
import { AddClassDialog } from './add-class-dialog'
import type { ClassItem } from './teacher-classes-list'
import type { TeacherClassesListLabels } from './teacher-classes-list'
import type { AddClassDialogLabels } from './add-class-dialog'

export interface TeacherClassesListClientProps {
  classes: ClassItem[]
  variant?: 'erp'
  onCreateClass?: (formData: FormData) => Promise<{ error?: string; success?: boolean; classId?: string }>
  listLabels?: TeacherClassesListLabels
  dialogLabels?: AddClassDialogLabels
}

export function TeacherClassesListClient({ 
  classes, 
  variant = 'erp',
  onCreateClass,
  listLabels,
  dialogLabels,
}: TeacherClassesListClientProps) {
  const [showDialog, setShowDialog] = useState(false)
  const showCreateButton = !!onCreateClass

  const handleCreateClick = () => {
    setShowDialog(true)
  }

  const handleCreateClass = async (formData: FormData) => {
    if (!onCreateClass) {
      return { error: 'Create class function not provided' }
    }
    const result = await onCreateClass(formData)
    if (result.success) {
      setShowDialog(false)
    }
    return result
  }

  return (
    <>
      {showCreateButton && (
        <AddClassDialog 
          onCreateClass={handleCreateClass}
          variant={variant}
          isOpen={showDialog}
          onClose={() => setShowDialog(false)}
          labels={dialogLabels}
        />
      )}
      <TeacherClassesList
        classes={classes}
        variant={variant}
        onCreateClass={handleCreateClick}
        showCreateButton={showCreateButton}
        labels={listLabels}
      />
    </>
  )
}
