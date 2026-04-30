import { getCurrentUser, listUsers } from '@/lib/backend-auth'
import { Coins, FileText, MessageSquare, Shield, Sparkles, Users } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

async function getDashboardStats(isAdmin: boolean) {
  if (!isAdmin) {
    return {
      recentUsers: [],
    }
  }

  const users = await listUsers({ limit: 100, offset: 0 })
  return {
    recentUsers: users.slice(0, 5),
  }
}

export default async function SchoolAdminDashboard() {
  const currentUser = await getCurrentUser()
  if (!currentUser) redirect('/auth/login')
  if (currentUser.role !== 'admin' && currentUser.role !== 'operator') redirect('/app')

  const isAdmin = currentUser.role === 'admin'
  const stats = await getDashboardStats(isAdmin)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Admin Dashboard</h1>
          <p className="mt-1 text-gray-500">Main workspace for daily operations and AI tools</p>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">Role: {currentUser.role}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-gray-700">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-sm font-medium text-gray-500">Documents</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">Upload and RAG context</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-gray-700">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-sm font-medium text-gray-500">AI Generation</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">Exams, lessons, plans</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-gray-700">
              <MessageSquare className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-sm font-medium text-gray-500">AI Tutor</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">Teacher assistant chat</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-gray-700">
              <Coins className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-sm font-medium text-gray-500">Tokens</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">Balance and usage</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Link href="/school-admin/documents" className="inline-flex items-center justify-center gap-2 rounded-md bg-gray-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-gray-800 sm:justify-start sm:px-4">
            <FileText className="h-4 w-4" />
            Documents
          </Link>
          <Link href="/school-admin/exams" className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:justify-start sm:px-4">
            <Sparkles className="h-4 w-4" />
            Exams
          </Link>
          <Link href="/school-admin/lessons" className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:justify-start sm:px-4">
            <FileText className="h-4 w-4" />
            Lessons
          </Link>
          <Link href="/school-admin/education-plans" className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:justify-start sm:px-4">
            <Sparkles className="h-4 w-4" />
            Education Plans
          </Link>
          <Link href="/school-admin/chat" className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:justify-start sm:px-4">
            <MessageSquare className="h-4 w-4" />
            AI Tutor
          </Link>
          <Link href="/school-admin/tokens" className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:justify-start sm:px-4">
            <Coins className="h-4 w-4" />
            Tokens
          </Link>
          <Link href="/school-admin/api-integration" className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:justify-start sm:px-4">
            <Shield className="h-4 w-4" />
            API Integration
          </Link>
          {isAdmin && (
            <Link href="/school-admin/users" className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:justify-start sm:px-4">
              <Users className="h-4 w-4" />
              Users
            </Link>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Users</h3>
              <p className="mt-1 text-sm text-gray-500">Admin-only user management snapshot</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {stats.recentUsers.length === 0 ? (
              <p className="text-sm text-gray-500">No users yet.</p>
            ) : (
              stats.recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-md border border-gray-200 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{u.email}</p>
                    <p className="text-xs text-gray-500">{u.role}</p>
                  </div>
                  <Link href={`/school-admin/users/${u.id}`} className="text-sm font-medium text-gray-700 hover:text-gray-900">
                    View
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
