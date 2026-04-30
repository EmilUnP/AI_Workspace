import { listUsers } from '@/lib/backend-auth'
import { Users, Plus } from 'lucide-react'
import Link from 'next/link'

async function getDashboardStats() {
  const users = await listUsers({ limit: 200, offset: 0 })
  const recentUsers = users.slice(0, 5)
  const adminCount = users.filter((u) => u.role === 'admin').length
  const operatorCount = users.filter((u) => u.role === 'operator').length
  return {
    totalUsers: users.length,
    adminCount,
    operatorCount,
    recentUsers,
  }
}

export default async function PlatformOwnerDashboard() {
  const stats = await getDashboardStats()
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Dashboard</h1>
          <p className="mt-1 text-gray-500">
            Overview of your educational platform
          </p>
        </div>
        <Link href="/platform-owner/users" className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"><Plus className="h-4 w-4" />Manage Users</Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-100 text-gray-700">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Total Users</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-100 text-gray-700">AI</div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Admins / Operators</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {stats.adminCount} / {stats.operatorCount}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Users</h3>
              <p className="mt-1 text-sm text-gray-500">Latest registrations across the platform</p>
            </div>
            <Link
              href="/platform-owner/users"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              View all
            </Link>
          </div>
          
          <div className="mt-6 space-y-4">
            {stats.recentUsers.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">No users yet</p>
              </div>
            ) : (
              stats.recentUsers.map((user: any) => (
                <Link
                  key={user.id}
                  href={`/platform-owner/users/${user.id}`}
                  className="flex items-start gap-4 rounded-lg p-2 transition-colors hover:bg-gray-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-700">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{user.email}</p>
                    <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
      </div>

    </div>
  )
}
