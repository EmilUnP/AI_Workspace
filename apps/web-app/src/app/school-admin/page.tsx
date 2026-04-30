import { listUsers } from '@/lib/backend-auth'
import { FileText, Users, Shield } from 'lucide-react'
import Link from 'next/link'

async function getWorkspaceInfo() {
  return { id: 'global', name: 'Global Workspace', subscription_plan: 'global' as const }
}

async function getDashboardStats() {
  const users = await listUsers({ limit: 200, offset: 0 })

  return {
    totalUsers: users.length,
    operators: users.filter((u) => u.role === 'operator').length,
    admins: users.filter((u) => u.role === 'admin').length,
    recentUsers: users.slice(0, 5),
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
          <h1 className="text-2xl font-bold text-gray-900">Operator Dashboard</h1>
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
            <p className="text-sm font-medium text-gray-500">Total Users</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <Shield className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Admins / Operators</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{stats.admins} / {stats.operators}</p>
          </div>
        </div>

      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Users</h3>
              <p className="mt-1 text-sm text-gray-500">Latest users in clean backend</p>
            </div>
          </div>
          
          <div className="mt-6 space-y-4">
            {stats.recentUsers.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">No users yet</p>
              </div>
            ) : (
              stats.recentUsers.map((user) => (
                <Link
                  key={user.id}
                  href={`/school-admin/users/${user.id}`}
                  className="flex items-start gap-4 rounded-lg p-2 transition-colors hover:bg-gray-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                    <span className="text-sm font-medium">
                      {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{user.email}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {user.role}
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
            href="/school-admin/users"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-700 sm:justify-start sm:px-4"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Manage Users</span>
            <span className="sm:hidden">Users</span>
          </Link>
          <Link
            href="/school-admin/documents"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:justify-start sm:px-4"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documents</span>
            <span className="sm:hidden">Docs</span>
          </Link>
          <Link
            href="/school-admin/lessons"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:justify-start sm:px-4"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Lessons</span>
            <span className="sm:hidden">Lessons</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
