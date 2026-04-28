import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { Clock, FileText, Users } from 'lucide-react'
import Link from 'next/link'

async function getWorkspaceInfo() {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { id: 'global', name: 'Global Workspace', subscription_plan: 'global' as const }
  
  return { id: 'global', name: 'Global Workspace', subscription_plan: 'global' as const }
}

async function getDashboardStats() {
  const supabase = await createServerClient()
  const countOpt = { count: 'exact' as const, head: true }

  const [teacherRes, pendingRes, pendingUsersRes] =
    await Promise.all([
      supabase.from('profiles').select('id', countOpt).eq('profile_type', 'teacher'),
      supabase.from('profiles').select('id', countOpt).eq('approval_status', 'pending'),
      supabase.from('profiles').select('id, full_name, email, profile_type, created_at').eq('approval_status', 'pending').order('created_at', { ascending: false }).limit(5),
    ])

  return {
    totalTeachers: teacherRes.count || 0,
    pendingApprovals: pendingRes.count || 0,
    pendingUsers: pendingUsersRes.data || [],
  }
}

export default async function SchoolAdminDashboard() {
  const workspace = await getWorkspaceInfo()
  const stats = await getDashboardStats()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Dashboard</h1>
          <p className="mt-1 text-gray-500">
            Overview of {workspace.name}
          </p>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            Global Plan
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Total Teachers</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{stats.totalTeachers}</p>
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

      </div>

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
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {user.profile_type === 'teacher' ? 'Teacher' : 'User'}
                  </span>
                </Link>
              ))
            )}
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
