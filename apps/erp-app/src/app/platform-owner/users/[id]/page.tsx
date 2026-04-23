import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { tokenRepository } from '@eduator/db/repositories/tokens'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Mail,
  Calendar,
  Building2,
  Shield,
  BookOpen,
  CheckCircle,
  Clock,
  XCircle,
  Globe,
  MessageSquare,
  Target,
  Users,
  Briefcase,
  FileText,
  Coins,
  Activity,
} from 'lucide-react'
import { EditUserForm } from './edit-user-form'
import { DeleteUserButton } from './delete-user-button'
import { ApproveRejectButtons } from './inline-approval'

// Registration info labels
const HEARD_FROM_LABELS: Record<string, string> = {
  search: 'Search Engine (Google, Bing, etc.)',
  social: 'Social Media',
  friend: 'Friend or Colleague',
  conference: 'Conference or Event',
  article: 'Blog or Article',
  other: 'Other',
}

const USAGE_PURPOSE_LABELS: Record<string, string> = {
  personal: 'Personal Use',
  school: 'For School/Institution',
  company: 'For Company/Organization',
  freelance: 'Freelance Teaching',
  testing: 'Just Testing/Exploring',
}

const ORGANIZATION_SIZE_LABELS: Record<string, string> = {
  individual: 'Just me',
  small: '2-10 people',
  medium: '11-50 people',
  large: '51-200 people',
  enterprise: '200+ people',
}

const USE_CASE_LABELS: Record<string, string> = {
  exams: 'Creating Exams & Tests',
  lessons: 'Generating Lesson Content',
  both: 'Both Exams and Lessons',
  ai_assistant: 'AI Teaching Assistant',
  all: 'All Features',
}

async function getUser(id: string) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      organization:organizations(id, name, slug)
    `)
    .eq('id', id)
    .single()
  
  if (error || !data) {
    return null
  }
  
  return data
}

async function getOrganizations() {
  const supabase = await createServerClient()
  
  const { data } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('status', 'active')
    .order('name')
  
  return data || []
}

const roleConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  platform_owner: {
    icon: <Shield className="h-5 w-5" />,
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    label: 'Platform Owner',
  },
  school_superadmin: {
    icon: <Building2 className="h-5 w-5" />,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    label: 'School Admin',
  },
  teacher: {
    icon: <BookOpen className="h-5 w-5" />,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    label: 'Teacher',
  },
  legacy: {
    icon: <Users className="h-5 w-5" />,
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
  const { id } = await params
  const [user, organizations, tokenBalance] = await Promise.all([
    getUser(id),
    getOrganizations(),
    tokenRepository.getBalance(id),
  ])

  if (!user) {
    notFound()
  }

  const role = roleConfig[user.profile_type] || roleConfig.legacy

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/platform-owner/users"
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

        {/* Inline approval + delete controls */}
        <div className="flex flex-col items-end gap-3">
          <ApproveRejectButtons userId={user.id} approvalStatus={user.approval_status} />
          <DeleteUserButton userId={user.id} userName={user.full_name || user.email} />
        </div>
      </div>

      {/* Token balance & usage */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Coins className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-900">Token balance</p>
              <p className="text-2xl font-bold tabular-nums text-amber-900">{tokenBalance}</p>
            </div>
          </div>
          <Link
            href="/platform-owner/usage-payments"
            className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50"
          >
            <Activity className="h-4 w-4" />
            Usage & payments
          </Link>
        </div>
      </div>

      {/* Registration Info Banner (for users with registration info) */}
      {user.registration_info && (
        <div className="overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="border-b border-blue-200 bg-blue-100/50 px-6 py-3">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-blue-900">Registration Details</h2>
            </div>
            <p className="mt-1 text-sm text-blue-700">
              Information provided during registration
            </p>
          </div>
          
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* How they heard about us */}
            {user.registration_info.heard_from && (
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">How they found us</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {HEARD_FROM_LABELS[user.registration_info.heard_from] || user.registration_info.heard_from}
                  </p>
                </div>
              </div>
            )}
            
            {/* Usage purpose */}
            {user.registration_info.usage_purpose && (
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                  <Target className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Usage Purpose</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {USAGE_PURPOSE_LABELS[user.registration_info.usage_purpose] || user.registration_info.usage_purpose}
                  </p>
                </div>
              </div>
            )}
            
            {/* Organization name */}
            {user.registration_info.organization_name && (
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Organization</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {user.registration_info.organization_name}
                  </p>
                </div>
              </div>
            )}
            
            {/* Team size */}
            {user.registration_info.organization_size && (
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Team Size</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {ORGANIZATION_SIZE_LABELS[user.registration_info.organization_size] || user.registration_info.organization_size}
                  </p>
                </div>
              </div>
            )}
            
            {/* Use case */}
            {user.registration_info.use_case && (
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                  <Briefcase className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Primary Interest</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {USE_CASE_LABELS[user.registration_info.use_case] || user.registration_info.use_case}
                  </p>
                </div>
              </div>
            )}
            
            {/* Additional info */}
            {user.registration_info.additional_info && (
              <div className="flex items-start gap-3 sm:col-span-2 lg:col-span-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <FileText className="h-5 w-5 text-gray-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Additional Notes</p>
                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                    {user.registration_info.additional_info}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Info */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900">User Information</h2>
            
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">User ID</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{user.id}</dd>
              </div>
              
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Auth ID</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono truncate">{user.user_id}</dd>
              </div>
              
              {/* Source */}
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Source</dt>
                <dd className="mt-1">
                  {user.source === 'erp' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                      <Building2 className="h-3.5 w-3.5" />
                      ERP App
                    </span>
                  )}
                  {user.source === 'api' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-medium text-cyan-700">
                      🔗 API
                    </span>
                  )}
                  {!user.source && (
                    <span className="text-gray-400">Unknown</span>
                  )}
                </dd>
              </div>
              
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Organization</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {user.organization ? (
                    <Link 
                      href={`/platform-owner/organizations/${user.organization.id}`}
                      className="text-green-600 hover:text-green-700 hover:underline"
                    >
                      {user.organization.name}
                    </Link>
                  ) : (
                    <span className="text-gray-400">No organization</span>
                  )}
                </dd>
              </div>
              
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

        {/* Edit Form */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900">Edit User</h2>
            <p className="mt-1 text-sm text-gray-500">
              Update user details, role, and status
            </p>
            
            <EditUserForm user={user} organizations={organizations} />
          </div>
        </div>
      </div>
    </div>
  )
}
