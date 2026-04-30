import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { Users, Clock, FileText, Plus } from 'lucide-react'
import Link from 'next/link'

async function getDashboardStats() {
  const supabase = await createServerClient()

  // Get users count
  const { count: userCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
  
  // Get pending approvals
  const { count: pendingCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('approval_status', 'pending')
  
  // Get recent users
  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('id, full_name, email, profile_type, created_at')
    .order('created_at', { ascending: false })
    .limit(5)
  
  return {
    totalUsers: userCount || 0,
    pendingApprovals: pendingCount || 0,
    recentUsers: recentUsers || [],
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

        <Link
          href="/platform-owner/users?status=pending"
          className="rounded-lg border border-gray-200 bg-white p-6 hover:bg-gray-50"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-100 text-gray-700">
              <Clock className="h-6 w-6" />
            </div>
            {stats.pendingApprovals > 0 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-700 text-xs font-bold text-white">
                {stats.pendingApprovals}
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Pending Approvals</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{stats.pendingApprovals}</p>
          </div>
        </Link>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-100 text-gray-700">AI</div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">AI Requests Today</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">-</p>
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
                    <p className="text-sm font-medium text-gray-900">{user.full_name || user.email}</p>
                    <p className="text-xs text-gray-500 capitalize">{user.profile_type}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        <div className="mt-4 flex flex-wrap gap-4">
          <Link
            href="/platform-owner/users?status=pending"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Users className="h-4 w-4" />
            Review Approvals {stats.pendingApprovals > 0 && `(${stats.pendingApprovals})`}
          </Link>
          <Link
            href="/platform-owner/reports"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <FileText className="h-4 w-4" />
            Generate Report
          </Link>
        </div>
      </div>
    </div>
  )
}
