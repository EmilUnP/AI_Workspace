import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { 
  BookOpen, 
  ArrowLeft, 
  Calendar,
  GraduationCap,
  Copy,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { Avatar } from '@eduator/ui'
import { EnrollStudentDialog } from './enroll-student-dialog'
import { StudentRowActions } from './student-row-actions'
import { AddTeacherDialog } from './add-teacher-dialog'
import { TeacherRowActions } from './teacher-row-actions'
import { EditClassButton } from '../edit-class-button'

async function getOrganizationId() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()
  
  return profile?.organization_id
}

async function getClassDetails(classId: string, organizationId: string) {
  const supabase = createAdminClient()
  
  const { data: classData, error } = await supabase
    .from('classes')
    .select('*')
    .eq('id', classId)
    .eq('organization_id', organizationId)
    .single()
  
  if (error || !classData) {
    console.error('Error fetching class:', error)
    return null
  }
  
  return classData
}

async function getClassTeachers(classId: string) {
  const supabase = createAdminClient()
  
  // Get teachers from class_teachers junction table
  const { data: classTeachers, error } = await supabase
    .from('class_teachers')
    .select('id, assigned_at, teacher_id')
    .eq('class_id', classId)
    .order('assigned_at', { ascending: true })
  
  if (error || !classTeachers || classTeachers.length === 0) {
    return []
  }
  
  // Get teacher profiles
  const teacherIds = classTeachers.map(ct => ct.teacher_id)
  const { data: teachers } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', teacherIds)
  
  type TeacherProfile = { id: string; full_name: string | null; email: string; avatar_url?: string | null }
  const teachersMap: Record<string, TeacherProfile> = {}
  teachers?.forEach(t => {
    teachersMap[t.id] = t
  })
  
  return classTeachers.map(ct => ({
    ...ct,
    teacher: teachersMap[ct.teacher_id] || null
  }))
}

async function getEnrolledStudents(classId: string) {
  const supabase = createAdminClient()
  
  const { data: enrollments, error } = await supabase
    .from('class_enrollments')
    .select('id, enrolled_at, status, student_id')
    .eq('class_id', classId)
    .eq('status', 'active')
    .order('enrolled_at', { ascending: false })
  
  if (error || !enrollments || enrollments.length === 0) {
    return []
  }
  
  const studentIds = enrollments.map(e => e.student_id)
  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', studentIds)
  
  type StudentProfile = { id: string; full_name: string | null; email: string; avatar_url?: string | null }
  const studentsMap: Record<string, StudentProfile> = {}
  students?.forEach(s => {
    studentsMap[s.id] = s
  })
  
  return enrollments.map(e => ({
    ...e,
    student: studentsMap[e.student_id] || null
  }))
}

async function getAvailableStudents(organizationId: string, classId: string) {
  const supabase = createAdminClient()
  
  const { data: enrollments } = await supabase
    .from('class_enrollments')
    .select('student_id')
    .eq('class_id', classId)
  
  const enrolledIds = enrollments?.map(e => e.student_id) || []
  
  let query = supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('organization_id', organizationId)
    .eq('profile_type', 'student')
    .eq('approval_status', 'approved')
    .order('full_name')
  
  if (enrolledIds.length > 0) {
    query = query.not('id', 'in', `(${enrolledIds.join(',')})`)
  }
  
  const { data } = await query
  return data || []
}

async function getAvailableTeachers(organizationId: string, classId: string) {
  const supabase = createAdminClient()
  
  // Get the primary teacher from the class itself (legacy teacher_id field)
  const { data: classData } = await supabase
    .from('classes')
    .select('teacher_id')
    .eq('id', classId)
    .single()
  
  // Get teachers already assigned to this class via class_teachers table
  const { data: classTeachers } = await supabase
    .from('class_teachers')
    .select('teacher_id')
    .eq('class_id', classId)
  
  // Combine all assigned teacher IDs (from both legacy field and junction table)
  const assignedIds = new Set<string>()
  if (classData?.teacher_id) {
    assignedIds.add(classData.teacher_id)
  }
  classTeachers?.forEach(ct => {
    if (ct.teacher_id) assignedIds.add(ct.teacher_id)
  })
  
  const assignedIdsArray = Array.from(assignedIds)
  
  let query = supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('organization_id', organizationId)
    .eq('profile_type', 'teacher')
    .eq('approval_status', 'approved')
    .order('full_name')
  
  if (assignedIdsArray.length > 0) {
    query = query.not('id', 'in', `(${assignedIdsArray.join(',')})`)
  }
  
  const { data } = await query
  return data || []
}

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: classId } = await params
  const organizationId = await getOrganizationId()
  
  if (!organizationId) {
    return notFound()
  }
  
  const [classData, classTeachers, enrolledStudents, availableStudents, availableTeachers] = await Promise.all([
    getClassDetails(classId, organizationId),
    getClassTeachers(classId),
    getEnrolledStudents(classId),
    getAvailableStudents(organizationId, classId),
    getAvailableTeachers(organizationId, classId),
  ])
  
  if (!classData) {
    return notFound()
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/school-admin/classes"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Classes
      </Link>

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <BookOpen className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{classData.name}</h1>
              {classData.is_active ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                  <XCircle className="h-3.5 w-3.5" />
                  Inactive
                </span>
              )}
            </div>
            {classData.subject && (
              <p className="mt-1 text-sm text-gray-500">Subject: {classData.subject}</p>
            )}
            {classData.description && (
              <p className="mt-1 text-gray-500 max-w-lg">{classData.description}</p>
            )}
          </div>
        </div>
        
        {/* Edit Button - More Visible */}
        <EditClassButton
          classData={{
            id: classData.id,
            name: classData.name,
            description: classData.description,
            is_active: classData.is_active,
          }}
        />
      </div>

      {/* Class Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Class Code */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Class Code</p>
          <div className="mt-2 flex items-center justify-between">
            <code className="text-xl font-bold font-mono text-gray-900">{classData.class_code}</code>
            <button 
              className="p-2 text-gray-400 hover:text-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
              title="Copy code"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">Share this code with students</p>
        </div>

        {/* Teachers Count */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Teachers</p>
          <div className="mt-2 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-emerald-600" />
            <span className="text-2xl font-bold text-gray-900">{classTeachers.length}</span>
          </div>
        </div>

        {/* Students Count */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Students</p>
          <div className="mt-2 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-green-600" />
            <span className="text-2xl font-bold text-gray-900">{enrolledStudents.length}</span>
          </div>
        </div>

        {/* Created Date */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Created</p>
          <div className="mt-2 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <span className="text-gray-900">
              {new Date(classData.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Teachers Section */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 p-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Teachers</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                {classTeachers.length} teacher{classTeachers.length !== 1 ? 's' : ''} assigned
              </p>
            </div>
            <AddTeacherDialog 
              classId={classId}
              organizationId={organizationId}
              availableTeachers={availableTeachers} 
            />
          </div>

          {classTeachers.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
              <h3 className="mt-3 text-sm font-medium text-gray-900">No teachers assigned</h3>
              <p className="mt-1 text-sm text-gray-500">Add teachers to this class</p>
              <div className="mt-4">
                <AddTeacherDialog 
                  classId={classId}
                  organizationId={organizationId}
                  availableTeachers={availableTeachers} 
                />
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {classTeachers.map((ct: { id: string; teacher_id: string; assigned_at: string; teacher?: { id: string; full_name: string | null; email: string; avatar_url?: string | null } | null }) => {
                const displayName = ct.teacher?.full_name?.trim() || ct.teacher?.email || 'Teacher'
                return (
                  <div key={ct.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={ct.teacher?.avatar_url}
                        name={displayName}
                        size="md"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{displayName}</p>
                        {ct.teacher?.email && <p className="text-sm text-gray-500">{ct.teacher.email}</p>}
                      </div>
                    </div>
                    <TeacherRowActions 
                      classId={classId}
                      teacherId={ct.teacher_id}
                      teacherName={ct.teacher?.full_name || 'Teacher'}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Students Section */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 p-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Students</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                {enrolledStudents.length} student{enrolledStudents.length !== 1 ? 's' : ''} enrolled
              </p>
            </div>
            <EnrollStudentDialog 
              classId={classId}
              organizationId={organizationId}
              availableStudents={availableStudents} 
            />
          </div>

          {enrolledStudents.length === 0 ? (
            <div className="p-8 text-center">
              <GraduationCap className="mx-auto h-10 w-10 text-gray-300" />
              <h3 className="mt-3 text-sm font-medium text-gray-900">No students enrolled</h3>
              <p className="mt-1 text-sm text-gray-500">Add students to this class</p>
              <div className="mt-4">
                <EnrollStudentDialog 
                  classId={classId}
                  organizationId={organizationId}
                  availableStudents={availableStudents} 
                />
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {enrolledStudents.map((enrollment: { id: string; student_id: string; student?: { id: string; full_name: string | null; email: string; avatar_url?: string | null } | null }) => {
                const displayName = enrollment.student?.full_name?.trim() || enrollment.student?.email || 'Student'
                return (
                  <div key={enrollment.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={enrollment.student?.avatar_url}
                        name={displayName}
                        size="md"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{displayName}</p>
                        {enrollment.student?.email && <p className="text-sm text-gray-500">{enrollment.student.email}</p>}
                      </div>
                    </div>
                    <StudentRowActions 
                      classId={classId}
                      studentId={enrollment.student_id}
                      studentName={enrollment.student?.full_name || 'Student'}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
