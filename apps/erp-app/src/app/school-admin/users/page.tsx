import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Building2
} from 'lucide-react'
import Link from 'next/link'
import { UserFilters } from './user-filters'
import { UserRowActions } from './user-row-actions'
import { AddUserDialog } from './add-user-dialog'
import { SortableHeader } from './sortable-header'
import { PaginationFooter } from '@eduator/ui'

const PER_PAGE = 20

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

async function getOrganizationStructure(organizationId: string) {
  const { createAdminClient } = await import('@eduator/auth/supabase/admin')
  
  const adminClient = createAdminClient()
  const { data: org } = await adminClient
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single()
  
  return org?.settings?.structure || []
}

async function getUsers(organizationId: string, searchParams: { 
  search?: string
  status?: string
  role?: string
  page?: string
  sortBy?: string
  sortOrder?: string
}) {
  const supabase = await createServerClient()
  const page = Math.max(1, parseInt(searchParams.page || '1', 10))
  const offset = (page - 1) * PER_PAGE
  
  // Valid sort columns
  const validSortColumns: Record<string, string> = {
    name: 'full_name',
    email: 'email',
    role: 'profile_type',
    status: 'approval_status',
    joined: 'created_at',
  }
  
  const sortBy = searchParams.sortBy && validSortColumns[searchParams.sortBy]
    ? validSortColumns[searchParams.sortBy]
    : 'created_at'
  
  const sortOrder = searchParams.sortOrder === 'asc' ? 'asc' : 'desc'
  
  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .in('profile_type', ['teacher', 'student'])
    .order(sortBy, { ascending: sortOrder === 'asc' })
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
  
  const { data, error, count } = await query
  
  if (error) {
    console.error('Error fetching users:', error)
    return { data: [], count: 0, page }
  }
  
  return { data: data || [], count: count || 0, page }
}

interface StructureUnit { id: string; name: string; parent_id?: string | null }
function getUnitName(unitId: string | undefined, structure: StructureUnit[]): string | null {
  if (!unitId || !structure || structure.length === 0) return null
  
  const findUnit = (units: StructureUnit[], id: string): StructureUnit | null => {
    for (const unit of units) {
      if (unit.id === id) return unit
      const children = structure.filter((u: StructureUnit) => u.parent_id === unit.id)
      if (children.length > 0) {
        const found = findUnit(children, id)
        if (found) return found
      }
    }
    return null
  }
  
  const rootUnits = structure.filter((u: StructureUnit) => !u.parent_id)
  const unit = findUnit(rootUnits, unitId)
  return unit?.name || null
}

async function getStats(organizationId: string) {
  const supabase = await createServerClient()
  
  // Optimized: single query to get all stats
  const { data: profiles } = await supabase
    .from('profiles')
    .select('profile_type, approval_status')
    .eq('organization_id', organizationId)
    .in('profile_type', ['teacher', 'student'])
  
  const allProfiles = profiles || []
  
  return {
    total: allProfiles.length,
    teachers: allProfiles.filter(p => p.profile_type === 'teacher').length,
    students: allProfiles.filter(p => p.profile_type === 'student').length,
    pending: allProfiles.filter(p => p.approval_status === 'pending').length,
  }
}

const roleConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  teacher: {
    icon: <BookOpen className="h-3.5 w-3.5" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    label: 'Teacher',
  },
  student: {
    icon: <GraduationCap className="h-3.5 w-3.5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Student',
  },
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; role?: string; page?: string; sortBy?: string; sortOrder?: string }>
}) {
  const organizationId = await getOrganizationId()
  
  if (!organizationId) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Users className="mx-auto h-12 w-12 text-gray-300" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">No Organization</h2>
          <p className="mt-2 text-sm text-gray-500">You are not associated with any organization.</p>
        </div>
      </div>
    )
  }
  
  const params = await searchParams
  const [usersResult, stats, structure] = await Promise.all([
    getUsers(organizationId, params),
    getStats(organizationId),
    getOrganizationStructure(organizationId),
  ])
  
  const { data: users, count: totalUsers, page: currentPage } = usersResult

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Users</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage teachers and students
          </p>
        </div>
        
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          {/* Mobile Stats */}
          <div className="flex items-center gap-4 sm:hidden">
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-600">{stats.teachers}</p>
              <p className="text-xs text-gray-500">Teachers</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-blue-600">{stats.students}</p>
              <p className="text-xs text-gray-500">Students</p>
            </div>
            {stats.pending > 0 && (
              <div className="text-center">
                <p className="text-lg font-bold text-yellow-600">{stats.pending}</p>
                <p className="text-xs text-yellow-600">Pending</p>
              </div>
            )}
          </div>
          
          {/* Desktop Stats */}
          <div className="hidden items-center gap-6 lg:flex">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{stats.teachers}</p>
              <p className="text-xs text-gray-500">Teachers</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.students}</p>
              <p className="text-xs text-gray-500">Students</p>
            </div>
            {stats.pending > 0 && (
              <>
                <div className="h-8 w-px bg-gray-200" />
                <Link href="/school-admin/users?status=pending" className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  <p className="text-xs text-yellow-600 font-medium">Pending</p>
                </Link>
              </>
            )}
          </div>
          
          {/* Add User Button */}
          <AddUserDialog />
        </div>
      </div>

      {/* Filters */}
      <UserFilters currentParams={params} />

      {/* Users List */}
      <div className="rounded-lg border border-gray-200 bg-white">
        {users.length === 0 ? (
          <div className="p-8 text-center sm:p-12">
            <Users className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No users found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {params.search || params.status || params.role
                ? 'Try adjusting your filters'
                : 'Add your first teacher or student'}
            </p>
            <div className="mt-6">
              <AddUserDialog />
            </div>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="divide-y divide-gray-100 sm:hidden">
              {users.map((user) => {
                const role = roleConfig[user.profile_type] || roleConfig.student
                
                return (
                  <div key={user.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 flex-shrink-0">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt=""
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ${role.bgColor} ${role.color}`}>
                              {user.full_name?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate">
                            {user.full_name || 'Unnamed User'}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <UserRowActions 
                        userId={user.id} 
                        approvalStatus={user.approval_status}
                        userName={user.full_name || user.email}
                      />
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${role.color}`}>
                          {role.icon}
                          {role.label}
                        </span>
                        <span className="text-gray-300">•</span>
                        {user.approval_status === 'approved' && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                            <CheckCircle className="h-3 w-3" />
                            Approved
                          </span>
                        )}
                        {user.approval_status === 'pending' && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                        {user.approval_status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                            <XCircle className="h-3 w-3" />
                            Rejected
                          </span>
                        )}
                      </div>
                      {(() => {
                        const unitId = (user.metadata as { organization_unit_id?: string } | null)?.organization_unit_id
                        const unitName = getUnitName(unitId, structure)
                        return unitName ? (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Building2 className="h-3.5 w-3.5" />
                            {unitName}
                          </div>
                        ) : null
                      })()}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {new Date(user.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop Table View */}
            <table className="hidden min-w-full divide-y divide-gray-200 sm:table">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader
                    label="User"
                    sortKey="name"
                    currentSortBy={params.sortBy}
                    currentSortOrder={params.sortOrder}
                    className="py-3 pl-4 pr-3 text-left sm:pl-6"
                  />
                  <SortableHeader
                    label="Role"
                    sortKey="role"
                    currentSortBy={params.sortBy}
                    currentSortOrder={params.sortOrder}
                    className="hidden px-3 py-3 text-left md:table-cell"
                  />
                  <SortableHeader
                    label="Status"
                    sortKey="status"
                    currentSortBy={params.sortBy}
                    currentSortOrder={params.sortOrder}
                    className="px-3 py-3 text-left"
                  />
                  <th scope="col" className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 lg:table-cell">
                    Unit
                  </th>
                  <SortableHeader
                    label="Joined"
                    sortKey="joined"
                    currentSortBy={params.sortBy}
                    currentSortOrder={params.sortOrder}
                    className="hidden px-3 py-3 text-left lg:table-cell"
                  />
                  <th scope="col" className="relative py-3 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {users.map((user) => {
                  const role = roleConfig[user.profile_type] || roleConfig.student
                  
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
                              <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium ${role.bgColor} ${role.color}`}>
                                {user.full_name?.charAt(0).toUpperCase() || '?'}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {user.full_name || 'Unnamed User'}
                            </p>
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

                      {/* Organization Unit */}
                      <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 lg:table-cell">
                        {(() => {
                          const unitId = (user.metadata as { organization_unit_id?: string } | null)?.organization_unit_id
                          const unitName = getUnitName(unitId, structure)
                          return unitName ? (
                            <span className="inline-flex items-center gap-1.5 text-gray-600">
                              <Building2 className="h-3.5 w-3.5" />
                              {unitName}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )
                        })()}
                      </td>

                      {/* Joined */}
                      <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 lg:table-cell">
                        {new Date(user.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>

                      {/* Actions */}
                      <td className="whitespace-nowrap py-4 pl-3 pr-4 sm:pr-6">
                        <div className="flex items-center justify-end">
                          <UserRowActions 
                            userId={user.id} 
                            approvalStatus={user.approval_status}
                            userName={user.full_name || user.email}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Footer with Pagination */}
      <div className="space-y-4">
        <PaginationFooter
          currentPage={currentPage}
          perPage={PER_PAGE}
          totalItems={totalUsers}
          baseUrl="/school-admin/users"
          searchParams={{
            search: params.search,
            status: params.status,
            role: params.role,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder,
          }}
        />
        {(params.search || params.status || params.role) && (
          <div className="text-center">
            <Link
              href="/school-admin/users"
              className="text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              Clear all filters
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
