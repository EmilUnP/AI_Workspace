import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import ReportsTabs from './reports-tabs'

async function getWorkspaceInfo() {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { id: 'global', name: 'Global Workspace' }
  
  return { id: 'global', name: 'Global Workspace' }
}

export default async function ReportsPage() {
  const workspace = await getWorkspaceInfo()
  
  return <ReportsTabs workspaceId={workspace.id} workspaceName={workspace.name} />
}
