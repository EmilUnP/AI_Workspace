export { createUser, type CreateUserParams } from './create-user'
export { createClass, type CreateClassParams } from './create-class'
export {
  createStudent,
  enrollStudentInClass,
  type CreateStudentParams,
} from './create-student'
export { createTeacher, type CreateTeacherParams } from './create-teacher'
export { createOrganization, type CreateOrganizationParams } from './create-organization'

/**
 * Tool registry with enhanced business rules in descriptions
 * 
 * These descriptions act as "laws" that the AI agent will follow during reasoning.
 * By placing business logic in descriptions, the LLM's reasoning phase includes these steps automatically.
 */
export const TOOLS = {
  create_user: {
    name: 'create_user',
    description: `Creates a new user with profile (teacher, student, or school admin).

**BUSINESS RULES:**
- If profileType is 'school_superadmin', the user MUST be assigned to an organization (organizationId is required)
- If profileType is 'teacher' or 'student', organizationId should be provided if user belongs to an organization
- Email must be unique across all users
- Password must be at least 8 characters (will be validated)
- After creating a user, if profileType is 'teacher' and organizationId is provided, consider if they should be assigned to any classes
- If creating a school_superadmin, ensure the organization exists and is active
- All new users start with approval_status='pending' unless created by platform owner`,
    parameters: {
      email: 'string',
      password: 'string',
      fullName: 'string',
      profileType: "'teacher' | 'student' | 'school_superadmin'",
      organizationId: 'string (optional)',
    },
  },
  create_class: {
    name: 'create_class',
    description: `Creates a new class/grade with a teacher assigned.

**BUSINESS RULES:**
- teacherId MUST reference a profile with profile_type='teacher'
- The teacher MUST belong to the same organization as the class (organizationId must match teacher's organization_id)
- If organizationId is not provided, use the current user's organizationId from context
- Class name must be unique within the organization
- A unique class_code will be automatically generated
- After creating a class, if students are mentioned, you may need to use enroll_student tool separately
- The class will be created with is_active=true by default`,
    parameters: {
      name: 'string',
      description: 'string (optional)',
      subject: 'string (optional)',
      gradeLevel: 'string (optional)',
      academicYear: 'string (optional)',
      semester: 'string (optional)',
      teacherId: 'string (UUID)',
      organizationId: 'string (optional)',
    },
  },
  create_student: {
    name: 'create_student',
    description: `Creates a new student profile and optionally enrolls in a class.

**BUSINESS RULES:**
- If classId is provided, the student will be automatically enrolled in that class
- The class MUST belong to the same organization as the student (organizationId must match class's organization_id)
- If organizationId is not provided, use the current user's organizationId from context
- Email must be unique across all users
- After creating a student, if classId is provided, a class_enrollment record will be created with status='active'
- If the class doesn't exist or belongs to a different organization, enrollment will fail
- All new students start with approval_status='pending' unless created by platform owner or school admin`,
    parameters: {
      email: 'string',
      password: 'string',
      fullName: 'string',
      organizationId: 'string (optional)',
      classId: 'string (optional, UUID)',
    },
  },
  create_teacher: {
    name: 'create_teacher',
    description: `Creates a new teacher profile.

**BUSINESS RULES:**
- If organizationId is not provided, use the current user's organizationId from context
- Email must be unique across all users
- Department and bio are stored in the metadata JSONB field
- After creating a teacher, consider if they should be assigned to any classes (use create_class with this teacherId)
- All new teachers start with approval_status='pending' unless created by platform owner or school admin
- Teachers can be assigned to multiple classes via class_teachers table`,
    parameters: {
      email: 'string',
      password: 'string',
      fullName: 'string',
      organizationId: 'string (optional)',
      department: 'string (optional)',
      bio: 'string (optional)',
    },
  },
  enroll_student: {
    name: 'enroll_student',
    description: `Enrolls a student in a class.

**BUSINESS RULES:**
- studentId MUST reference a profile with profile_type='student'
- The student and class MUST belong to the same organization (organization_id must match)
- If the student is already enrolled in the class, this will update the enrollment status to 'active'
- Enrollment will fail if:
  - Student doesn't exist or is not a student profile
  - Class doesn't exist
  - Student and class belong to different organizations
- The enrollment will be created with status='active' by default
- Check for existing enrollments before creating a new one to avoid duplicates`,
    parameters: {
      studentId: 'string (UUID)',
      classId: 'string (UUID)',
    },
  },
  create_organization: {
    name: 'create_organization',
    description: `Creates a new organization/school (Platform Owner only). Can optionally create demo users.

**BUSINESS RULES:**
- ONLY platform_owner profile_type can create organizations
- Organization name must be unique (slug will be auto-generated from name)
- If createDemoUsers=true, the following will be created:
  - 1 school_superadmin user (assigned to this organization)
  - 1 teacher user (assigned to this organization)
  - 3 student users (assigned to this organization)
- After creating an organization, if user mentions "assign admin" or "create admin", you MUST also call create_user with profileType='school_superadmin' and organizationId set to the newly created organization
- Subscription plan defaults to 'basic' if not specified
- Organization status will be set to 'active' by default
- A unique slug will be generated from the organization name (lowercase, hyphens for spaces)`,
    parameters: {
      name: 'string (required) - Organization name',
      type: 'string (optional) - "school" | "university" | "institution" | "academy" | "other"',
      email: 'string (optional) - Contact email (defaults to contact@orgname.edu)',
      subscriptionPlan: 'string (optional) - "basic" | "premium" | "enterprise" (defaults to "basic")',
      createDemoUsers: 'boolean (optional) - If true, creates demo admin, teacher, and 3 students',
    },
  },
} as const
