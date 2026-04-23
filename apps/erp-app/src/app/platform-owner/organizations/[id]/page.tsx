import { createClient } from '@eduator/auth/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Edit, 
  Mail, 
  Phone, 
  Globe, 
  MapPin,
  Calendar,
  Users,
  Shield
} from 'lucide-react'
import { DeleteOrganizationButton } from './delete-button'
import { AddSchoolAdminDialog } from './add-admin-dialog'

async function getOrganization(id: string) {
  const supabase = await createClient()
  
  const { data: org, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error || !org) return null
  return org
}

async function getOrganizationAdmins(orgId: string) {
  const supabase = await createClient()
  
  const { data: admins, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('organization_id', orgId)
    .eq('profile_type', 'school_superadmin')
    .order('created_at', { ascending: false })
  
  if (error) return []
  return admins || []
}

async function getOrganizationStats(orgId: string) {
  const supabase = await createClient()
  
  const { count: teacherCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('profile_type', 'teacher')
  
  return {
    teachers: teacherCount || 0,
    learners: 0,
  }
}

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const org = await getOrganization(id)
  
  if (!org) {
    notFound()
  }
  
  const admins = await getOrganizationAdmins(id)
  const stats = await getOrganizationStats(id)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/platform-owner/organizations"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
            <p className="mt-1 text-gray-500 capitalize">{org.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/platform-owner/organizations/${id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
          <DeleteOrganizationButton organizationId={id} organizationName={org.name} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Organization Details</h2>
            
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-gray-900">{org.email}</p>
                </div>
              </div>
              
              {org.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <p className="text-gray-900">{org.phone}</p>
                  </div>
                </div>
              )}
              
              {org.website && (
                <div className="flex items-start gap-3">
                  <Globe className="mt-0.5 h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Website</p>
                    <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700">
                      {org.website}
                    </a>
                  </div>
                </div>
              )}
              
              {(org.address || org.city || org.country) && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Location</p>
                    <p className="text-gray-900">
                      {[org.address, org.city, org.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Created</p>
                  <p className="text-gray-900">{new Date(org.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* School Admins Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">School Administrators</h2>
                <p className="mt-1 text-sm text-gray-500">Users who can manage this organization</p>
              </div>
              <AddSchoolAdminDialog organizationId={id} organizationName={org.name} />
            </div>
            
            <div className="mt-6">
              {admins.length === 0 ? (
                <div className="py-8 text-center">
                  <Shield className="mx-auto h-12 w-12 text-gray-300" />
                  <h3 className="mt-4 text-sm font-medium text-gray-900">No administrators</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Add an administrator to manage this organization
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {admins.map((admin) => (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                          <span className="text-sm font-medium">
                            {admin.full_name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{admin.full_name}</p>
                          <p className="text-sm text-gray-500">{admin.email}</p>
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        admin.approval_status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {admin.approval_status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900">Status & Plan</h3>
            
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                  org.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : org.status === 'suspended'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {org.status}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Plan</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                  org.subscription_plan === 'enterprise'
                    ? 'bg-purple-100 text-purple-700'
                    : org.subscription_plan === 'premium'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {org.subscription_plan}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900">Statistics</h3>
            
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-gray-50 p-4 text-center">
                <Users className="mx-auto h-6 w-6 text-green-600" />
                <p className="mt-2 text-2xl font-bold text-gray-900">{stats.teachers}</p>
                <p className="text-xs text-gray-500">Teachers</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 text-center">
                <Users className="mx-auto h-6 w-6 text-blue-600" />
                <p className="mt-2 text-2xl font-bold text-gray-900">{stats.learners}</p>
                <p className="text-xs text-gray-500">Learners</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
