import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { Building2, Users, Clock, Sparkles, FileText, Plus } from 'lucide-react'
import Link from 'next/link'

async function getDashboardStats() {
  const supabase = await createServerClient()
  
  // Get organizations count
  const { count: orgCount } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })
  
  // Get organizations by subscription plan
  const { data: subscriptionData } = await supabase
    .from('organizations')
    .select('subscription_plan')
  
  const subscriptionCounts = {
    basic: 0,
    premium: 0,
    enterprise: 0,
  }
  
  subscriptionData?.forEach((org) => {
    if (org.subscription_plan in subscriptionCounts) {
      subscriptionCounts[org.subscription_plan as keyof typeof subscriptionCounts]++
    }
  })
  
  // Get users count
  const { count: userCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
  
  // Get pending approvals
  const { count: pendingCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('approval_status', 'pending')
  
  // Get recent organizations
  const { data: recentOrgs } = await supabase
    .from('organizations')
    .select('id, name, type, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5)
  
  return {
    totalOrganizations: orgCount || 0,
    totalUsers: userCount || 0,
    pendingApprovals: pendingCount || 0,
    activeSubscriptions: subscriptionCounts,
    recentOrganizations: recentOrgs || [],
  }
}

export default async function PlatformOwnerDashboard() {
  const stats = await getDashboardStats()
  
  const total = stats.activeSubscriptions.basic + stats.activeSubscriptions.premium + stats.activeSubscriptions.enterprise
  const basicPercent = total > 0 ? Math.round((stats.activeSubscriptions.basic / total) * 100) : 0
  const premiumPercent = total > 0 ? Math.round((stats.activeSubscriptions.premium / total) * 100) : 0
  const enterprisePercent = total > 0 ? Math.round((stats.activeSubscriptions.enterprise / total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Dashboard</h1>
          <p className="mt-1 text-gray-500">
            Overview of your educational platform
          </p>
        </div>
        <Link
          href="/platform-owner/organizations/new"
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          Add Organization
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <Building2 className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Total Organizations</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{stats.totalOrganizations}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
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
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
              <Clock className="h-6 w-6" />
            </div>
            {stats.pendingApprovals > 0 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-xs font-bold text-white">
                {stats.pendingApprovals}
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Pending Approvals</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{stats.pendingApprovals}</p>
          </div>
        </Link>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">AI Requests Today</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">-</p>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subscription Breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Active Subscriptions</h3>
          <p className="mt-1 text-sm text-gray-500">Distribution by plan type</p>
          
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-gray-400" />
                <span className="text-sm font-medium text-gray-700">Basic</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-900">
                  {stats.activeSubscriptions.basic}
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {basicPercent}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-gray-700">Premium</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-900">
                  {stats.activeSubscriptions.premium}
                </span>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  {premiumPercent}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-purple-500" />
                <span className="text-sm font-medium text-gray-700">Enterprise</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-900">
                  {stats.activeSubscriptions.enterprise}
                </span>
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                  {enterprisePercent}%
                </span>
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-gray-100">
            {basicPercent > 0 && (
              <div className="bg-gray-400" style={{ width: `${basicPercent}%` }} />
            )}
            {premiumPercent > 0 && (
              <div className="bg-green-500" style={{ width: `${premiumPercent}%` }} />
            )}
            {enterprisePercent > 0 && (
              <div className="bg-purple-500" style={{ width: `${enterprisePercent}%` }} />
            )}
          </div>
        </div>

        {/* Recent Organizations */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Organizations</h3>
              <p className="mt-1 text-sm text-gray-500">Latest registered organizations</p>
            </div>
            <Link
              href="/platform-owner/organizations"
              className="text-sm font-medium text-green-600 hover:text-green-700"
            >
              View all
            </Link>
          </div>
          
          <div className="mt-6 space-y-4">
            {stats.recentOrganizations.length === 0 ? (
              <div className="py-8 text-center">
                <Building2 className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">No organizations yet</p>
                <Link
                  href="/platform-owner/organizations/new"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700"
                >
                  <Plus className="h-4 w-4" />
                  Add your first organization
                </Link>
              </div>
            ) : (
              stats.recentOrganizations.map((org) => (
                <Link
                  key={org.id}
                  href={`/platform-owner/organizations/${org.id}`}
                  className="flex items-start gap-4 rounded-lg p-2 transition-colors hover:bg-gray-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{org.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{org.type}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    org.status === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : org.status === 'suspended'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {org.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        <div className="mt-4 flex flex-wrap gap-4">
          <Link
            href="/platform-owner/organizations/new"
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            <Building2 className="h-4 w-4" />
            Add Organization
          </Link>
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
