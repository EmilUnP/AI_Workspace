import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Mail, 
  Calendar, 
  BookOpen, 
  CheckCircle,
  Clock,
  XCircle,
  Building2
} from 'lucide-react'
import { EditUserForm } from './edit-user-form'
import { ChangePasswordForm } from './change-password-form'
import { DeleteUserButton } from './delete-user-button'

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

async function getUser(id: string, organizationId: string) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .in('profile_type', ['teacher', 'student'])
    .single()
  
  if (error || !data) {
    return null
  }
  
  return data
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

const roleConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  teacher: {
    icon: <BookOpen className="h-5 w-5" />,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    label: 'Teacher',
  },
  legacy: {
    icon: <Building2 className="h-5 w-5" />,
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    label: 'Legacy/Unknown',
  },
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const organizationId = await getOrganizationId()
  
  if (!organizationId) {
    redirect('/school-admin/users')
  }
  
  const { id } = await params
  const [user, structure] = await Promise.all([
    getUser(id, organizationId),
    getOrganizationStructure(organizationId),
  ])

  if (!user) {
    notFound()
  }

  const role = roleConfig[user.profile_type] || roleConfig.legacy
  const unitId = (user.metadata as { organization_unit_id?: string } | null)?.organization_unit_id
  const unitName = getUnitName(unitId, structure)

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/school-admin/users"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Users
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className={`flex h-16 w-16 items-center justify-center rounded-full ${role.bgColor} ${role.color}`}>
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold">
                {user.full_name?.charAt(0).toUpperCase() || '?'}
              </span>
            )}
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user.full_name || 'Unnamed User'}
            </h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {user.email}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${role.bgColor} ${role.color}`}>
                {role.icon}
                {role.label}
              </span>
              {user.approval_status === 'approved' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Approved
                </span>
              )}
              {user.approval_status === 'pending' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-medium text-yellow-700">
                  <Clock className="h-3.5 w-3.5" />
                  Pending
                </span>
              )}
              {user.approval_status === 'rejected' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                  <XCircle className="h-3.5 w-3.5" />
                  Rejected
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Delete Button */}
        <DeleteUserButton userId={user.id} userName={user.full_name || user.email} />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Edit User Info */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Edit User</h2>
          <p className="mt-1 text-sm text-gray-500">
            Update user details and role
          </p>
          
          <EditUserForm user={user} />
        </div>

        {/* Change Password */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
          <p className="mt-1 text-sm text-gray-500">
            Set a new password for this user
          </p>
          
          <ChangePasswordForm userId={user.user_id} userName={user.full_name || user.email} />
        </div>
      </div>

      {/* User Info */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">User Information</h2>
        
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">User ID</dt>
            <dd className="mt-1 text-sm text-gray-900 font-mono truncate">{user.id}</dd>
          </div>
          
          {unitName && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Organization Unit</dt>
              <dd className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-gray-400" />
                {unitName}
              </dd>
            </div>
          )}
          
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Joined</dt>
            <dd className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-gray-400" />
              {new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </dd>
          </div>
          
          {user.updated_at && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Updated</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(user.updated_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}
