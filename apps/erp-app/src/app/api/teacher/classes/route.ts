import { NextResponse } from 'next/server'
import { createClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('id, organization_id').eq('user_id', user.id).single()
  if (!profile?.organization_id) return NextResponse.json({ error: 'Profile or organization not found' }, { status: 403 })

  const admin = createAdminClient()
  const { data: primary } = await supabase
    .from('classes')
    .select('id, name')
    .eq('organization_id', profile.organization_id)
    .eq('teacher_id', profile.id)
    .eq('is_active', true)
  const { data: ct } = await admin.from('class_teachers').select('class_id').eq('teacher_id', profile.id)
  const assignedIds = ct?.map((x) => x.class_id) || []
  let extra: Array<{ id: string; name: string }> = []
  if (assignedIds.length > 0) {
    const { data: add } = await supabase
      .from('classes')
      .select('id, name')
      .eq('organization_id', profile.organization_id)
      .in('id', assignedIds)
    extra = (add || []).filter((c) => !primary?.some((p) => p.id === c.id)) as Array<{ id: string; name: string }>
  }
  const all = [...(primary || []), ...extra]
  const classes = Array.from(new Map(all.map((c) => [c.id, c])).values())
  return NextResponse.json({ classes })
}
