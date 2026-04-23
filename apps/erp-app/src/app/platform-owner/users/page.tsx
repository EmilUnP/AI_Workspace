import { unstable_cache } from 'next/cache'
import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { getDbClient, tokenRepository } from '@eduator/db'
import {
  Users,
  Shield,
  BookOpen,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Coins,
} from 'lucide-react'
import Link from 'next/link'
import { UserFilters } from './user-filters'
import { UserRowActions } from './user-row-actions'
import { PaginationFooter } from '@eduator/ui'

const PER_PAGE = 20

async function getUsers(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  searchParams: { 
  search?: string
  status?: string
  role?: string
  org?: string
  source?: string
  page?: string 
}) {
  const page = Math.max(1, parseInt(searchParams.page || '1', 10))
  const offset = (page - 1) * PER_PAGE
  
  let query = supabase
    .from('profiles')
    .select(`
      *,
      organization:organizations(id, name, slug)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PER_PAGE - 1)
  
  if (searchParams.search) {
    query = query.or(`full_name.ilike.%${searchParams.search}%,email.ilike.%${searchParams.search}%`)
  }
  
  if (searchParams.status && searchParams.status !== 'all') {
    query = query.eq('approval_status', searchParams.status)
  }
  
  if (searchParams.role && searchParams.role !== 'all') {
    query = query.eq('profile_type', searchParams.role)
  }
  
  if (searchParams.org && searchParams.org !== 'all') {
    query = query.eq('organization_id', searchParams.org)
  }
  
  if (searchParams.source && searchParams.source !== 'all') {
    query = query.eq('source', searchParams.source)
  }
  
  const { data, error, count } = await query
  
  if (error) {
    console.error('Error fetching users:', error)
    return { data: [], count: 0, page }
  }
  
  return { data: data || [], count: count || 0, page }
}

async function getStats(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  // Count-only queries: no full table scan, no row transfer
  const countOpt = { count: 'exact' as const, head: true }
  const [totalRes, platformOwnerRes, schoolAdminRes, teacherRes, pendingRes] =
    await Promise.all([
      supabase.from('profiles').select('id', countOpt),
      supabase.from('profiles').select('id', countOpt).eq('profile_type', 'platform_owner'),
      supabase.from('profiles').select('id', countOpt).eq('profile_type', 'school_superadmin'),
      supabase.from('profiles').select('id', countOpt).eq('profile_type', 'teacher'),
      supabase.from('profiles').select('id', countOpt).eq('approval_status', 'pending'),
    ])
  return {
    total: totalRes.count ?? 0,
    platformOwners: platformOwnerRes.count ?? 0,
    schoolAdmins: schoolAdminRes.count ?? 0,
    teachers: teacherRes.count ?? 0,
    pending: pendingRes.count ?? 0,
  }
}

async function getOrganizationsUncached(): Promise<Array<{ id: string; name: string }>> {
  const supabase = getDbClient()
  const { data } = await supabase
    .from('organizations')
    .select('id, name')
    .order('name')
  return data || []
}

function getCachedOrganizations(): Promise<Array<{ id: string; name: string }>> {
  return unstable_cache(
    getOrganizationsUncached,
    ['platform-owner-organizations-list'],
    { revalidate: 120 }
  )()
}

const roleConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  platform_owner: {
    icon: <Shield className="h-3.5 w-3.5" />,
    color: 'text-red-600',
    label: 'Platform Owner',
  },
  school_superadmin: {
    icon: <Building2 className="h-3.5 w-3.5" />,
    color: 'text-orange-600',
    label: 'School Admin',
  },
  teacher: {
    icon: <BookOpen className="h-3.5 w-3.5" />,
    color: 'text-blue-600',
    label: 'Teacher',
  },
  legacy: {
    icon: <Users className="h-3.5 w-3.5" />,
    color: 'text-gray-600',
    label: 'Legacy/Unknown',
  },
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; role?: string; org?: string; source?: string; page?: string }>
}) {
  const params = await searchParams
  const supabase = await createServerClient()
  const usersResult = await getUsers(supabase, params)
  const { data: users, count: totalUsers, page: currentPage } = usersResult
  const profileIds = users.map((u) => u.id)
  const [stats, organizations, tokenBalances] = await Promise.all([
    getStats(supabase),
    getCachedOrganizations(),
    tokenRepository.getBalancesForProfiles(profileIds),
  ])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">
            {stats.total} total users across the platform
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="hidden items-center gap-6 lg:flex">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{stats.platformOwners}</p>
            <p className="text-xs text-gray-500">Owners</p>
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{stats.schoolAdmins}</p>
            <p className="text-xs text-gray-500">Admins</p>
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.teachers}</p>
            <p className="text-xs text-gray-500">Teachers</p>
          </div>
          {stats.pending > 0 && (
            <>
              <div className="h-8 w-px bg-gray-200" />
              <Link href="/platform-owner/users?status=pending" className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                <p className="text-xs text-yellow-600 font-medium">Pending</p>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <UserFilters 
        currentParams={params} 
        organizations={organizations} 
      />

      {/* Users Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {users.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No users found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {params.search || params.status || params.role || params.org || params.source
                ? 'Try adjusting your filters'
                : 'Users will appear here once they register'}
            </p>
            {(params.search || params.status || params.role || params.org || params.source) && (
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
                <th scope="col" className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 lg:table-cell">
                  Organization
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tokens
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
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
                const role = roleConfig[user.profile_type] || roleConfig.legacy
                const tokenBalance = tokenBalances.get(user.id) ?? 0

                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    {/* User */}
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 flex-shrink-0">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-sm font-medium text-gray-600">
                              {user.full_name?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
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

                    {/* Organization */}
                    <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 lg:table-cell">
                      <div className="flex flex-col gap-1">
                        {user.organization ? (
                          <Link 
                            href={`/platform-owner/organizations/${user.organization.id}`}
                            className="hover:text-red-600 hover:underline"
                          >
                            {user.organization.name}
                          </Link>
                        ) : (
                          <span className="text-gray-400">No organization</span>
                        )}
                        {user.source === 'api' && (
                          <span className="inline-flex w-fit items-center gap-1 rounded bg-cyan-50 px-1.5 py-0.5 text-xs font-medium text-cyan-700">
                            🔗 API
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Tokens */}
                    <td className="whitespace-nowrap px-3 py-4">
                      <span className="inline-flex items-center gap-1.5 font-medium tabular-nums text-gray-900">
                        <Coins className="h-4 w-4 text-amber-500" aria-hidden />
                        {tokenBalance}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="whitespace-nowrap px-3 py-4">
                      {user.approval_status === 'approved' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                          <CheckCircle className="h-3 w-3" />
                          Approved
                        </span>
                      )}
                      {user.approval_status === 'pending' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700">
                          <Clock className="h-3 w-3" />
                          Pending
                        </span>
                      )}
                      {user.approval_status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                          <XCircle className="h-3 w-3" />
                          Rejected
                        </span>
                      )}
                    </td>

                    {/* Joined */}
                    <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 sm:table-cell">
                      {new Date(user.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>

                    {/* Actions */}
                    <td className="whitespace-nowrap py-4 pl-3 pr-4 sm:pr-6">
                      <div className="flex items-center justify-end">
                        <UserRowActions userId={user.id} approvalStatus={user.approval_status} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer with Pagination */}
      <div className="space-y-4">
        <PaginationFooter
          currentPage={currentPage}
          perPage={PER_PAGE}
          totalItems={totalUsers}
          baseUrl="/platform-owner/users"
          searchParams={{
            search: params.search,
            status: params.status,
            role: params.role,
            org: params.org,
            source: params.source,
          }}
        />
        {(params.search || params.status || params.role || params.org || params.source) && (
          <div className="text-center">
            <Link
              href="/platform-owner/users"
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              Clear all filters
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
