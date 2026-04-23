import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { EditClassForm } from './edit-class-form'

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

async function getClassDetails(classId: string, organizationId: string) {
  // Use admin client to bypass RLS
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('id', classId)
    .eq('organization_id', organizationId)
    .single()
  
  if (error) {
    console.error('Error fetching class:', error)
    return null
  }
  
  return data
}

async function getTeachers(organizationId: string) {
  // Use admin client to bypass RLS
  const supabase = createAdminClient()
  
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('organization_id', organizationId)
    .eq('profile_type', 'teacher')
    .eq('approval_status', 'approved')
    .order('full_name')
  
  return data || []
}

export default async function EditClassPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: classId } = await params
  const organizationId = await getOrganizationId()
  
  if (!organizationId) {
    return notFound()
  }
  
  const [classData, teachers] = await Promise.all([
    getClassDetails(classId, organizationId),
    getTeachers(organizationId),
  ])
  
  if (!classData) {
    return notFound()
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href={`/school-admin/classes/${classId}`}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Class
      </Link>

      {/* Page Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
          <BookOpen className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Class</h1>
          <p className="mt-1 text-gray-500">Update class details and settings</p>
        </div>
      </div>

      {/* Edit Form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <EditClassForm 
          classData={classData} 
          teachers={teachers}
        />
      </div>
    </div>
  )
}
