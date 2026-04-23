'use client'

import { useState, useEffect } from 'react'
import { EnrollStudentDialog, type EnrollStudentDialogLabels } from '@eduator/ui'
import { enrollStudent } from './actions'
import { getUsersByUnit } from '../../../school-admin/classes/[id]/get-users-by-unit'
import { getOrganizationStructure } from '../../../school-admin/users/get-organization-structure'

interface EnrollStudentClientProps {
  classId: string
  organizationId: string
  availableStudents: Array<{ id: string; full_name: string; email: string }>
  labels?: Partial<EnrollStudentDialogLabels>
}

export function EnrollStudentClient({ 
  classId, 
  organizationId,
  availableStudents,
  labels
}: EnrollStudentClientProps) {
  const [organizationStructure, setOrganizationStructure] = useState<Array<{ id: string; name: string; parent_id: string | null }>>([])

  useEffect(() => {
    // Load organization structure on mount
    getOrganizationStructure().then((result) => {
      if (result.error === null && result.structure) {
        setOrganizationStructure(result.structure)
      }
    })
  }, [])

  const handleLoadStudentsByUnit = async (unitId: string | null) => {
    const students = await getUsersByUnit({
      organizationId,
      profileType: 'student',
      classId,
      unitId: unitId || undefined,
    })
    return students.map(s => ({
      id: s.id,
      full_name: s.full_name || '',
      email: s.email || '',
    }))
  }

  const handleEnrollStudent = async (classId: string, studentId: string) => {
    return await enrollStudent(classId, studentId)
  }

  return (
    <EnrollStudentDialog
      classId={classId}
      variant="erp"
      organizationId={organizationId}
      availableStudents={availableStudents}
      onEnrollStudent={handleEnrollStudent}
      onLoadStudentsByUnit={handleLoadStudentsByUnit}
      organizationStructure={organizationStructure}
      labels={labels}
    />
  )
}
