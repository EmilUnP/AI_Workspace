import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { Building2, Plus, Search, Eye, Edit, User } from 'lucide-react'
import Link from 'next/link'
import { PaginationFooter } from '@eduator/ui'

const PER_PAGE = 20

async function getOrganizations(searchParams: { search?: string; status?: string; plan?: string; page?: string }) {
  const supabase = await createServerClient()
  const page = Math.max(1, parseInt(searchParams.page || '1', 10))
  const offset = (page - 1) * PER_PAGE
  
  let query = supabase
    .from('organizations')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PER_PAGE - 1)
  
  if (searchParams.search) {
    query = query.or(`name.ilike.%${searchParams.search}%,email.ilike.%${searchParams.search}%`)
  }
  
  if (searchParams.status && searchParams.status !== 'all') {
    query = query.eq('status', searchParams.status)
  }
  
  if (searchParams.plan && searchParams.plan !== 'all') {
    query = query.eq('subscription_plan', searchParams.plan)
  }
  
  const { data, error, count } = await query
  
  if (error) {
    console.error('Error fetching organizations:', error)
    return { data: [], count: 0, page }
  }
  
  const rows = data || []
  const orgIds = rows.map((org) => org.id)
  const adminMap: Record<string, { id: string; full_name: string | null; email: string }> = {}

  if (orgIds.length > 0) {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id, full_name, email, organization_id')
      .in('organization_id', orgIds)
      .eq('profile_type', 'school_superadmin')

    ;(admins || []).forEach((a: { id: string; full_name: string | null; email: string; organization_id: string }) => {
      if (!adminMap[a.organization_id]) {
        adminMap[a.organization_id] = { id: a.id, full_name: a.full_name, email: a.email }
      }
    })
  }

  const orgsWithAdmins = rows.map((org) => ({
    ...org,
    school_admin: adminMap[org.id] || null as { id: string; full_name: string | null; email: string } | null,
  }))
  
  return { data: orgsWithAdmins, count: count || 0, page }
}

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; plan?: string; page?: string }>
}) {
  const params = await searchParams
  const { data: organizations, count: totalOrganizations, page: currentPage } = await getOrganizations(params)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="mt-1 text-gray-500">
            Manage all registered organizations on the platform
          </p>
        </div>
        <Link
          href="/platform-owner/organizations/new"
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700"
        >
          <Plus className="h-4 w-4" />
          Add Organization
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="search"
            defaultValue={params.search}
            placeholder="Search organizations..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </form>

        <div className="flex items-center gap-3">
          <select
            name="status"
            defaultValue={params.status || 'all'}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            name="plan"
            defaultValue={params.plan || 'all'}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="all">All Plans</option>
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {organizations.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No organizations found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {params.search || params.status || params.plan
                ? 'Try adjusting your filters'
                : 'Get started by adding your first organization'}
            </p>
            {!params.search && !params.status && !params.plan && (
              <Link
                href="/platform-owner/organizations/new"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700"
              >
                <Plus className="h-4 w-4" />
                Add Organization
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    School Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {organizations.map((org: { id: string; name: string; email: string; slug: string; type: string; subscription_plan: string; status: string; created_at: string; school_admin?: { full_name?: string | null; email: string } | null }) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{org.name}</p>
                          <p className="text-sm text-gray-500">{org.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {org.school_admin ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{org.school_admin.full_name || 'N/A'}</p>
                            <p className="text-xs text-gray-500">{org.school_admin.email}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-400">
                          <User className="h-4 w-4" />
                          <span className="text-sm italic">No admin</span>
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="capitalize text-gray-700">{org.type}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        org.subscription_plan === 'enterprise'
                          ? 'bg-purple-100 text-purple-700'
                          : org.subscription_plan === 'premium'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {org.subscription_plan}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        org.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : org.status === 'suspended'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {org.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/platform-owner/organizations/${org.id}`}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/platform-owner/organizations/${org.id}/edit`}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <PaginationFooter
        currentPage={currentPage}
        perPage={PER_PAGE}
        totalItems={totalOrganizations}
        baseUrl="/platform-owner/organizations"
        searchParams={{
          search: params.search,
          status: params.status,
          plan: params.plan,
        }}
      />
    </div>
  )
}
