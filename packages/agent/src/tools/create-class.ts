import type { ActionToolResult, UserContext } from '../types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SecurityGuards } from '../security/guards'
import { InputValidator } from '../security/validator'
// Generate unique class code helper
function generateClassCode(): string {
  return `CLS-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
}

export interface CreateClassParams {
  name: string
  description?: string
  subject?: string
  gradeLevel?: string
  academicYear?: string
  semester?: string
  teacherId: string
  organizationId?: string
}

/**
 * Creates a new class
 */
export async function createClass(
  params: CreateClassParams,
  context: UserContext,
  client: SupabaseClient
): Promise<ActionToolResult> {
  // Validate permissions
  const permissionCheck = SecurityGuards.canCreateEntity(context, 'class')
  if (!permissionCheck.allowed) {
    return {
      success: false,
      error: permissionCheck.reason,
    }
  }

  // Validate inputs
  if (!params.name || params.name.trim().length === 0) {
    return {
      success: false,
      error: 'Class name is required',
    }
  }

  // Validate teacher ID
  if (!InputValidator.isValidUUID(params.teacherId)) {
    return {
      success: false,
      error: 'Invalid teacher ID format',
    }
  }

  // Verify teacher exists and belongs to organization
  const organizationId = params.organizationId || context.organizationId

  if (!organizationId) {
    return {
      success: false,
      error: 'Organization ID is required',
    }
  }

  // Check teacher exists and is a teacher profile
  const { data: teacher, error: teacherError } = await client
    .from('profiles')
    .select('id, organization_id, profile_type')
    .eq('id', params.teacherId)
    .single()

  if (teacherError || !teacher) {
    return {
      success: false,
      error: 'Teacher not found',
    }
  }

  if (teacher.profile_type !== 'teacher') {
    return {
      success: false,
      error: 'Specified user is not a teacher',
    }
  }

  // Validate organization access
  if (context.profileType === 'school_superadmin') {
    if (teacher.organization_id !== organizationId) {
      return {
        success: false,
        error: 'Teacher does not belong to your organization',
      }
    }
  }

  // Generate unique class code
  const classCode = generateClassCode()

  try {
    // Create class
    const { data: classData, error: classError } = await client
      .from('classes')
      .insert({
        name: InputValidator.sanitizeString(params.name, 200),
        description: params.description
          ? InputValidator.sanitizeString(params.description)
          : null,
        subject: params.subject
          ? InputValidator.sanitizeString(params.subject, 100)
          : null,
        grade_level: params.gradeLevel
          ? InputValidator.sanitizeString(params.gradeLevel, 50)
          : null,
        academic_year: params.academicYear
          ? InputValidator.sanitizeString(params.academicYear, 20)
          : null,
        semester: params.semester
          ? InputValidator.sanitizeString(params.semester, 20)
          : null,
        class_code: classCode,
        organization_id: organizationId,
        teacher_id: params.teacherId,
        is_active: true,
      })
      .select()
      .single()

    if (classError || !classData) {
      return {
        success: false,
        error: classError?.message || 'Failed to create class',
      }
    }

    return {
      success: true,
      data: {
        classId: classData.id,
        name: classData.name,
        classCode: classData.class_code,
        teacherId: params.teacherId,
        organizationId,
      },
      metadata: {
        tool: 'create_class',
        timestamp: new Date().toISOString(),
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create class',
    }
  }
}
