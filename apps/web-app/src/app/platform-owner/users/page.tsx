import { listUsers } from '@/lib/backend-auth'
import { Users, Shield, Clock, Mail } from 'lucide-react'
import Link from 'next/link'
const roleConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  admin: {
    icon: <Shield className="h-3.5 w-3.5" />,
    color: 'text-red-600',
    label: 'Admin',
  },
  operator: {
    icon: <Users className="h-3.5 w-3.5" />,
    color: 'text-blue-600',
    label: 'Operator',
  },
  user: {
    icon: <Users className="h-3.5 w-3.5" />,
    color: 'text-gray-600',
    label: 'User',
  },
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; role?: string }>
}) {
  const params = await searchParams
  const allUsers = await listUsers({ limit: 200, offset: 0 })
  const users = allUsers.filter((u) => {
    const bySearch = params.search
      ? u.email.toLowerCase().includes(params.search.toLowerCase())
      : true
    const byRole = params.role && params.role !== 'all' ? u.role === params.role : true
    return bySearch && byRole
  })
  const stats = {
    total: allUsers.length,
    admins: allUsers.filter((u) => u.role === 'admin').length,
    operators: allUsers.filter((u) => u.role === 'operator').length,
    regular: allUsers.filter((u) => u.role === 'user').length,
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">{stats.total} users in backend database</p>
        </div>
        {/* Quick Stats */}
        <div className="hidden items-center gap-6 lg:flex">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{stats.admins}</p>
            <p className="text-xs text-gray-500">Admins</p>
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.operators}</p>
            <p className="text-xs text-gray-500">Operators</p>
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-700">{stats.regular}</p>
            <p className="text-xs text-gray-500">Users</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="search" className="text-xs font-medium text-gray-500">Search email</label>
          <input
            id="search"
            name="search"
            defaultValue={params.search}
            placeholder="name@example.com"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="role" className="text-xs font-medium text-gray-500">Role</label>
          <select id="role" name="role" defaultValue={params.role || 'all'} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="all">All</option>
            <option value="admin">Admin</option>
            <option value="operator">Operator</option>
            <option value="user">User</option>
          </select>
        </div>
        <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white">Apply</button>
      </form>

      {/* Users Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {users.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No users found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {params.search || params.role
                ? 'Try adjusting your filters'
                : 'Users will appear here once they register'}
            </p>
            {(params.search || params.role) && (
              <Link
                href="/platform-owner/users"
                className="mt-4 inline-flex items-center text-sm font-medium text-red-600 hover:text-red-700"
              >
                Clear all filters
              </Link>
            )}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:pl-6">
                  User
                </th>
                <th scope="col" className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 md:table-cell">
                  Role
                </th>
                <th scope="col" className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:table-cell">
                  Joined
                </th>
                <th scope="col" className="relative py-3 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {users.map((user) => {
                const role = roleConfig[user.role] || roleConfig.user

                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    {/* User */}
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-sm font-medium text-gray-600">
                          {user.full_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <Link 
                            href={`/platform-owner/users/${user.id}`}
                            className="font-medium text-gray-900 truncate hover:text-red-600 hover:underline"
                          >
                            {user.full_name || 'Unnamed User'}
                          </Link>
                            <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="hidden whitespace-nowrap px-3 py-4 md:table-cell">
                      <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${role.color}`}>
                        {role.icon}
                        {role.label}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 sm:table-cell">
                      {new Date(user.created_at || Date.now()).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>

                    {/* Actions */}
                    <td className="whitespace-nowrap py-4 pl-3 pr-4 sm:pr-6">
                      <div className="flex items-center justify-end">
                        <Link
                          href={`/platform-owner/users/${user.id}`}
                          className="text-sm font-medium text-red-600 hover:text-red-700"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {(params.search || params.role) && (
        <div className="text-center">
          <Link href="/platform-owner/users" className="text-sm font-medium text-red-600 hover:text-red-700">
            Clear all filters
          </Link>
        </div>
      )}
    </div>
  )
}
