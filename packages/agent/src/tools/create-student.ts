import type { ActionToolResult, UserContext } from '../types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { InputValidator } from '../security/validator'
import { createUser } from './create-user'

export interface CreateStudentParams {
  email: string
  password: string
  fullName: string
  organizationId?: string
  classId?: string
}

/**
 * Creates a new student profile and optionally enrolls in a class
 */
export async function createStudent(
  params: CreateStudentParams,
  context: UserContext,
  client: SupabaseClient
): Promise<ActionToolResult> {
  // Use createUser tool with student profile type
  const userResult = await createUser(
    {
      email: params.email,
      password: params.password,
      fullName: params.fullName,
      profileType: 'student',
      organizationId: params.organizationId,
    },
    context,
    client
  )

  if (!userResult.success || !userResult.data) {
    return userResult
  }

  const studentId = (userResult.data as { userId: string }).userId

  // If classId provided, enroll student in class
  if (params.classId) {
    const enrollResult = await enrollStudentInClass(
      {
        studentId,
        classId: params.classId,
      },
      context,
      client
    )

    if (!enrollResult.success) {
      // Student created but enrollment failed
      return {
        success: true,
        data: {
          ...userResult.data,
          enrollmentError: enrollResult.error,
        },
        metadata: {
          ...userResult.metadata,
          note: 'Student created but enrollment failed',
        },
      }
    }

    return {
      success: true,
      data: {
        ...userResult.data,
        enrolledInClass: params.classId,
      },
      metadata: userResult.metadata,
    }
  }

  return userResult
}

/**
 * Enrolls a student in a class
 */
export async function enrollStudentInClass(
  params: { studentId: string; classId: string },
  context: UserContext,
  client: SupabaseClient
): Promise<ActionToolResult> {
  // Validate UUIDs
  if (!InputValidator.isValidUUID(params.studentId)) {
    return {
      success: false,
      error: 'Invalid student ID format',
    }
  }

  if (!InputValidator.isValidUUID(params.classId)) {
    return {
      success: false,
      error: 'Invalid class ID format',
    }
  }

  // Verify student exists
  const { data: student, error: studentError } = await client
    .from('profiles')
    .select('id, organization_id, profile_type')
    .eq('id', params.studentId)
    .single()

  if (studentError || !student) {
    return {
      success: false,
      error: 'Student not found',
    }
  }

  if (student.profile_type !== 'student') {
    return {
      success: false,
      error: 'Specified user is not a student',
    }
  }

  // Verify class exists
  const { data: classData, error: classError } = await client
    .from('classes')
    .select('id, organization_id')
    .eq('id', params.classId)
    .single()

  if (classError || !classData) {
    return {
      success: false,
      error: 'Class not found',
    }
  }

  // Validate organization access
  if (context.profileType === 'school_superadmin') {
    if (
      student.organization_id !== classData.organization_id ||
      student.organization_id !== context.organizationId
    ) {
      return {
        success: false,
        error: 'Student and class must belong to the same organization',
      }
    }
  }

  try {
    // Check if already enrolled
    const { data: existingEnrollment } = await client
      .from('class_enrollments')
      .select('id')
      .eq('class_id', params.classId)
      .eq('student_id', params.studentId)
      .single()

    if (existingEnrollment) {
      return {
        success: false,
        error: 'Student is already enrolled in this class',
      }
    }

    // Create enrollment
    const { data: enrollment, error: enrollmentError } = await client
      .from('class_enrollments')
      .insert({
        class_id: params.classId,
        student_id: params.studentId,
        status: 'active',
      })
      .select()
      .single()

    if (enrollmentError || !enrollment) {
      return {
        success: false,
        error: enrollmentError?.message || 'Failed to enroll student',
      }
    }

    return {
      success: true,
      data: {
        enrollmentId: enrollment.id,
        classId: params.classId,
        studentId: params.studentId,
      },
      metadata: {
        tool: 'enroll_student',
        timestamp: new Date().toISOString(),
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to enroll student',
    }
  }
}
