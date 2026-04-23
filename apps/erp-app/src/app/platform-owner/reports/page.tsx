import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { 
  BarChart3, 
  Building2, 
  Users, 
  BookOpen,
  GraduationCap,
  TrendingUp,
  Download
} from 'lucide-react'

async function getPlatformStats() {
  const supabase = await createServerClient()
  
  // Get organizations count by plan
  const { data: orgs } = await supabase
    .from('organizations')
    .select('subscription_plan, status')
  
  const planCounts = { basic: 0, premium: 0, enterprise: 0 }
  const statusCounts = { active: 0, inactive: 0, suspended: 0 }
  
  orgs?.forEach(org => {
    if (org.subscription_plan in planCounts) {
      planCounts[org.subscription_plan as keyof typeof planCounts]++
    }
    if (org.status in statusCounts) {
      statusCounts[org.status as keyof typeof statusCounts]++
    }
  })
  
  // Get users by type
  const { data: profiles } = await supabase
    .from('profiles')
    .select('profile_type, approval_status')
  
  const userCounts = { platform_owner: 0, school_superadmin: 0, teacher: 0 }
  const approvalCounts = { approved: 0, pending: 0, rejected: 0 }
  
  profiles?.forEach(profile => {
    if (profile.profile_type in userCounts) {
      userCounts[profile.profile_type as keyof typeof userCounts]++
    }
    if (profile.approval_status in approvalCounts) {
      approvalCounts[profile.approval_status as keyof typeof approvalCounts]++
    }
  })
  
  return {
    totalOrganizations: orgs?.length || 0,
    totalUsers: profiles?.length || 0,
    planCounts,
    statusCounts,
    userCounts,
    approvalCounts,
  }
}

// Bar Chart Component
function BarChart({ 
  data, 
  labels, 
  colors, 
  maxValue 
}: { 
  data: number[]
  labels: string[]
  colors: string[]
  maxValue: number
}) {
  const maxBarHeight = 200
  
  return (
    <div className="flex items-end justify-between gap-2 h-[220px] px-2">
      {data.map((value, index) => {
        const height = maxValue > 0 ? (value / maxValue) * maxBarHeight : 0
        const percentage = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0
        
        return (
          <div key={index} className="flex flex-col items-center flex-1 gap-2">
            <div className="relative w-full flex items-end justify-center" style={{ height: maxBarHeight }}>
              <div
                className="w-full rounded-t-lg transition-all hover:opacity-90 relative group"
                style={{ 
                  height: `${height}px`,
                  backgroundColor: colors[index],
                  minHeight: value > 0 ? '8px' : '0px'
                }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {value}
                </div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-gray-700">{labels[index]}</p>
              <p className="text-xs text-gray-500">{percentage}%</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Donut Chart Component
function DonutChart({ 
  data, 
  labels: _labels, 
  colors 
}: { 
  data: number[]
  labels: string[]
  colors: string[]
}) {
  const total = data.reduce((sum, val) => sum + val, 0)
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">No data available</p>
      </div>
    )
  }
  
  let currentAngle = -90
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const centerX = 100
  const centerY = 100
  
  const segments = data.map((value, index) => {
    const percentage = (value / total) * 100
    const angle = (value / total) * 360
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`
    const strokeDashoffset = -((currentAngle + 90) / 360) * circumference
    
    const segment = {
      value,
      percentage,
      angle,
      strokeDasharray,
      strokeDashoffset,
      color: colors[index],
      startAngle: currentAngle,
    }
    
    currentAngle += angle
    return segment
  })
  
  return (
    <div className="flex items-center justify-center">
      <svg width="200" height="200" className="transform -rotate-90">
        {segments.map((segment, index) => (
          <circle
            key={index}
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth="30"
            strokeDasharray={segment.strokeDasharray}
            strokeDashoffset={segment.strokeDashoffset}
            strokeLinecap="round"
            className="transition-all hover:opacity-80"
          />
        ))}
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold text-gray-900">{total}</p>
        <p className="text-xs text-gray-500">Total</p>
      </div>
    </div>
  )
}

export default async function ReportsPage() {
  const stats = await getPlatformStats()

  const maxPlanValue = Math.max(...Object.values(stats.planCounts))
  const maxStatusValue = Math.max(...Object.values(stats.statusCounts))
  const maxApprovalValue = Math.max(...Object.values(stats.approvalCounts))

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Reports</h1>
          <p className="mt-1 text-gray-500">
            Analytics and insights across all organizations
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <Building2 className="h-6 w-6" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-600">
              <TrendingUp className="h-3 w-3" />
              Total
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Organizations</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{stats.totalOrganizations}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600">
              <TrendingUp className="h-3 w-3" />
              Total
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Total Users</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <BookOpen className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Teachers</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{stats.userCounts.teacher}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <GraduationCap className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Core Users</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{stats.userCounts.school_superadmin}</p>
          </div>
        </div>
      </div>

      {/* Detailed Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subscription Plans - Bar Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Subscription Plans</h3>
          <p className="mt-1 text-sm text-gray-500">Distribution of organizations by plan</p>
          
          <div className="mt-6">
            <BarChart
              data={[stats.planCounts.basic, stats.planCounts.premium, stats.planCounts.enterprise]}
              labels={['Basic', 'Premium', 'Enterprise']}
              colors={['#9CA3AF', '#10B981', '#8B5CF6']}
              maxValue={maxPlanValue || 1}
            />
          </div>
          
          <div className="mt-6 flex items-center justify-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gray-400" />
              <span className="text-sm text-gray-600">Basic: {stats.planCounts.basic}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600">Premium: {stats.planCounts.premium}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-purple-500" />
              <span className="text-sm text-gray-600">Enterprise: {stats.planCounts.enterprise}</span>
            </div>
          </div>
        </div>

        {/* User Distribution - Donut Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">User Distribution</h3>
          <p className="mt-1 text-sm text-gray-500">Breakdown of users by role</p>
          
          <div className="mt-6 relative flex items-center justify-center">
            <DonutChart
              data={[
                stats.userCounts.platform_owner,
                stats.userCounts.school_superadmin,
                stats.userCounts.teacher
              ]}
              labels={['Platform Owners', 'School Admins', 'Teachers']}
              colors={['#8B5CF6', '#3B82F6', '#10B981']}
            />
          </div>
          
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-purple-500" />
              <div>
                <p className="text-xs font-medium text-gray-700">Platform Owners</p>
                <p className="text-sm font-semibold text-gray-900">{stats.userCounts.platform_owner}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <div>
                <p className="text-xs font-medium text-gray-700">School Admins</p>
                <p className="text-sm font-semibold text-gray-900">{stats.userCounts.school_superadmin}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <div>
                <p className="text-xs font-medium text-gray-700">Teachers</p>
                <p className="text-sm font-semibold text-gray-900">{stats.userCounts.teacher}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Organization Status & User Approval */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Organization Status - Bar Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Organization Status</h3>
          <p className="mt-1 text-sm text-gray-500">Active vs inactive organizations</p>
          
          <div className="mt-6">
            <BarChart
              data={[stats.statusCounts.active, stats.statusCounts.inactive, stats.statusCounts.suspended]}
              labels={['Active', 'Inactive', 'Suspended']}
              colors={['#10B981', '#9CA3AF', '#EF4444']}
              maxValue={maxStatusValue || 1}
            />
          </div>
          
          <div className="mt-6 flex items-center justify-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600">Active: {stats.statusCounts.active}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gray-400" />
              <span className="text-sm text-gray-600">Inactive: {stats.statusCounts.inactive}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-sm text-gray-600">Suspended: {stats.statusCounts.suspended}</span>
            </div>
          </div>
        </div>

        {/* User Approval Status - Bar Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">User Approval Status</h3>
          <p className="mt-1 text-sm text-gray-500">User account statuses</p>
          
          <div className="mt-6">
            <BarChart
              data={[stats.approvalCounts.approved, stats.approvalCounts.pending, stats.approvalCounts.rejected]}
              labels={['Approved', 'Pending', 'Rejected']}
              colors={['#10B981', '#F59E0B', '#EF4444']}
              maxValue={maxApprovalValue || 1}
            />
          </div>
          
          <div className="mt-6 flex items-center justify-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600">Approved: {stats.approvalCounts.approved}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <span className="text-sm text-gray-600">Pending: {stats.approvalCounts.pending}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-sm text-gray-600">Rejected: {stats.approvalCounts.rejected}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Reports */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Generate Reports</h3>
        <p className="mt-1 text-sm text-gray-500">Download detailed platform reports</p>
        
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Organizations Report</p>
              <p className="text-xs text-gray-500">All organizations data</p>
            </div>
          </button>
          
          <button className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Users Report</p>
              <p className="text-xs text-gray-500">All users across platform</p>
            </div>
          </button>
          
          <button className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-gray-50">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Usage Report</p>
              <p className="text-xs text-gray-500">Platform usage statistics</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
