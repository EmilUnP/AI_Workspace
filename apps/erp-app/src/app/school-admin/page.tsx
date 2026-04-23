import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  Clock, 
  FileText,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

async function getOrganizationInfo() {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      organization_id,
      organizations(
        id,
        name,
        type,
        subscription_plan,
        settings
      )
    `)
    .eq('user_id', user.id)
    .single()
  
  if (!profile?.organizations) return null
  
  // Handle both array and object cases from Supabase
  const org = Array.isArray(profile.organizations) 
    ? profile.organizations[0] 
    : profile.organizations
  
  return org as {
    id: string
    name: string
    type: string
    subscription_plan: string
    settings: Record<string, unknown>
  } | null
}

async function getDashboardStats(organizationId: string) {
  const supabase = await createServerClient()
  const adminSupabase = createAdminClient()
  const countOpt = { count: 'exact' as const, head: true }

  const [teacherRes, studentRes, classRes, pendingRes, pendingUsersRes, recentClassesRes] =
    await Promise.all([
      supabase.from('profiles').select('id', countOpt).eq('organization_id', organizationId).eq('profile_type', 'teacher'),
      supabase.from('profiles').select('id', countOpt).eq('organization_id', organizationId).eq('profile_type', 'student'),
      supabase.from('classes').select('id', countOpt).eq('organization_id', organizationId),
      supabase.from('profiles').select('id', countOpt).eq('organization_id', organizationId).eq('approval_status', 'pending'),
      supabase.from('profiles').select('id, full_name, email, profile_type, created_at').eq('organization_id', organizationId).eq('approval_status', 'pending').order('created_at', { ascending: false }).limit(5),
      supabase.from('classes').select('id, name, subject, is_active, created_at, teacher_id, teacher:profiles!teacher_id(id, full_name)').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(5),
    ])

  type ClassRow = { id: string; name: string; subject?: string | null; is_active: boolean; created_at: string; teacher_id?: string | null; teacher?: { id: string; full_name: string | null } | { id: string; full_name: string | null }[] | null }
  const recentClasses = (recentClassesRes.data || []) as ClassRow[]
  const classIds = recentClasses.map((c) => c.id)

  let teacherCountMap: Record<string, number> = {}
  let studentCountMap: Record<string, number> = {}
  let primaryTeacherInClassTeachers: Set<string> = new Set()

  if (classIds.length > 0) {
    const [classTeachersRes, enrollmentsRes] = await Promise.all([
      adminSupabase.from('class_teachers').select('class_id, teacher_id').in('class_id', classIds),
      adminSupabase.from('class_enrollments').select('class_id, status').in('class_id', classIds),
    ])

    ;(classTeachersRes.data || []).forEach((ct: { class_id: string; teacher_id: string }) => {
      teacherCountMap[ct.class_id] = (teacherCountMap[ct.class_id] || 0) + 1
      const cls = recentClasses.find((c) => c.id === ct.class_id)
      if (cls?.teacher_id === ct.teacher_id) {
        primaryTeacherInClassTeachers.add(ct.class_id)
      }
    })

    ;(enrollmentsRes.data || []).forEach((e: { class_id: string; status: string | null }) => {
      if (e.status === 'active' || e.status === null) {
        studentCountMap[e.class_id] = (studentCountMap[e.class_id] || 0) + 1
      }
    })
  }

  const classesWithCounts = recentClasses.map((cls) => {
    let tCount = teacherCountMap[cls.id] || 0
    if (cls.teacher_id && !primaryTeacherInClassTeachers.has(cls.id)) {
      tCount += 1
    }
    return {
      ...cls,
      teacherCount: tCount,
      studentCount: studentCountMap[cls.id] || 0,
    }
  })

  return {
    totalTeachers: teacherRes.count || 0,
    totalStudents: studentRes.count || 0,
    totalClasses: classRes.count || 0,
    pendingApprovals: pendingRes.count || 0,
    pendingUsers: pendingUsersRes.data || [],
    recentClasses: classesWithCounts,
  }
}

export default async function SchoolAdminDashboard() {
  const organization = await getOrganizationInfo()
  
  if (!organization) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">No Organization Found</h2>
          <p className="mt-2 text-sm text-gray-500">You are not associated with any organization.</p>
        </div>
      </div>
    )
  }
  
  const stats = await getDashboardStats(organization.id)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Dashboard</h1>
          <p className="mt-1 text-gray-500">
            Overview of {organization.name}
          </p>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
            organization.subscription_plan === 'enterprise' 
              ? 'bg-purple-100 text-purple-700' 
              : organization.subscription_plan === 'premium'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700'
          }`}>
            {organization.subscription_plan?.charAt(0).toUpperCase() + organization.subscription_plan?.slice(1)} Plan
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <BookOpen className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Total Teachers</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{stats.totalTeachers}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <GraduationCap className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Total Students</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{stats.totalStudents.toLocaleString()}</p>
          </div>
        </div>

        <Link
          href="/school-admin/users?status=pending"
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
              <Clock className="h-6 w-6" />
            </div>
            {stats.pendingApprovals > 0 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-xs font-bold text-white">
                {stats.pendingApprovals}
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Pending Approvals</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{stats.pendingApprovals}</p>
          </div>
        </Link>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Total Classes</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{stats.totalClasses}</p>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Approvals */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
              <p className="mt-1 text-sm text-gray-500">Users awaiting your approval</p>
            </div>
            <Link
              href="/school-admin/users?status=pending"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all
            </Link>
          </div>
          
          <div className="mt-6 space-y-4">
            {stats.pendingUsers.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">No pending approvals</p>
                <p className="text-xs text-gray-400">All caught up!</p>
              </div>
            ) : (
              stats.pendingUsers.map((user) => (
                <Link
                  key={user.id}
                  href={`/school-admin/users?status=pending`}
                  className="flex items-start gap-4 rounded-lg p-2 transition-colors hover:bg-gray-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                    <span className="text-sm font-medium">
                      {user.full_name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{user.full_name || 'Unnamed User'}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    user.profile_type === 'teacher'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user.profile_type === 'teacher' ? 'Teacher' : 'Student'}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Classes */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Classes</h3>
              <p className="mt-1 text-sm text-gray-500">Latest classes in your school</p>
            </div>
            <Link
              href="/school-admin/classes"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all
            </Link>
          </div>
          
          <div className="mt-6 space-y-4">
            {stats.recentClasses.length === 0 ? (
              <div className="py-8 text-center">
                <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">No classes yet</p>
                <p className="text-xs text-gray-400">Classes created by teachers will appear here</p>
              </div>
            ) : (
              stats.recentClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-start gap-4 rounded-lg p-2 transition-colors hover:bg-gray-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{cls.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-gray-500">
                        {cls.teacherCount ?? 0} {cls.teacherCount === 1 ? 'teacher' : 'teachers'}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">
                        {cls.studentCount ?? 0} {cls.studentCount === 1 ? 'student' : 'students'}
                      </span>
                      {cls.subject && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{cls.subject}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    cls.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {cls.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-4">
          <Link
            href="/school-admin/users?status=pending"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-700 sm:justify-start sm:px-4"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Review Approvals</span>
            <span className="sm:hidden">Approvals</span>
            {stats.pendingApprovals > 0 && (
              <span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs">{stats.pendingApprovals}</span>
            )}
          </Link>
          <Link
            href="/school-admin/users"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:justify-start sm:px-4"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Manage Users</span>
            <span className="sm:hidden">Users</span>
          </Link>
          <Link
            href="/school-admin/classes"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:justify-start sm:px-4"
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">View Classes</span>
            <span className="sm:hidden">Classes</span>
          </Link>
          <Link
            href="/school-admin/reports"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:justify-start sm:px-4"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">View Reports</span>
            <span className="sm:hidden">Reports</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
