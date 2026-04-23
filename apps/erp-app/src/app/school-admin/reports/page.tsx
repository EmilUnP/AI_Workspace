import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { BarChart3 } from 'lucide-react'
import ReportsTabs from './reports-tabs'

async function getOrganizationInfo() {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      organization_id,
      organizations(
        id,
        name,
        type
      )
    `)
    .eq('user_id', user.id)
    .single()
  
  if (!profile?.organizations) return null
  
  // Handle both array and object cases from Supabase
  const org = Array.isArray(profile.organizations) 
    ? profile.organizations[0] 
    : profile.organizations
  
  return org as {
    id: string
    name: string
    type: string
  } | null
}

export default async function ReportsPage() {
  const organization = await getOrganizationInfo()
  
  if (!organization) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">No Organization</h2>
          <p className="mt-2 text-sm text-gray-500">You are not associated with any organization.</p>
        </div>
      </div>
    )
  }
  
  return <ReportsTabs organizationId={organization.id} organizationName={organization.name} />
}
