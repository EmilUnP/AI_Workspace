import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { 
  BookOpen, 
  Search,
  CheckCircle,
  XCircle,
  GraduationCap,
  User
} from 'lucide-react'
import Link from 'next/link'
import { AddClassDialog } from './add-class-dialog'
import { ClassRowActions } from './class-row-actions'
import { PaginationFooter } from '@eduator/ui'

const PER_PAGE = 20

interface ClassRow {
  id: string
  name: string
  description?: string | null
  is_active: boolean
  class_code: string
  teacher_count: number
  student_count: number
}

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

async function getClasses(organizationId: string, searchParams: { 
  search?: string
  status?: string
  page?: string
}) {
  // Use admin client to bypass RLS for school admin
  const supabase = createAdminClient()
  const page = Math.max(1, parseInt(searchParams.page || '1', 10))
  const offset = (page - 1) * PER_PAGE
  
  // First get classes with count
  let query = supabase
    .from('classes')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + PER_PAGE - 1)
  
  if (searchParams.search) {
    query = query.ilike('name', `%${searchParams.search}%`)
  }
  
  if (searchParams.status === 'active') {
    query = query.eq('is_active', true)
  } else if (searchParams.status === 'inactive') {
    query = query.eq('is_active', false)
  }
  
  const { data: classes, error, count } = await query
  
  if (error) {
    console.error('Error fetching classes:', error)
    return { data: [], count: 0, page }
  }
  
  if (!classes || classes.length === 0) {
    return { data: [], count: count || 0, page }
  }
  
  const classIds = classes.map(c => c.id)
  
  // Get teacher counts from class_teachers junction table
  const { data: classTeachers } = await supabase
    .from('class_teachers')
    .select('class_id, teacher_id')
    .in('class_id', classIds)
  
  const teacherCounts: Record<string, number> = {}
  classTeachers?.forEach(ct => {
    teacherCounts[ct.class_id] = (teacherCounts[ct.class_id] || 0) + 1
  })
  
  // Add primary teachers (teacher_id) to count if they're not already in class_teachers
  classes.forEach(cls => {
    if (cls.teacher_id) {
      // Check if primary teacher is already in class_teachers
      const primaryInClassTeachers = classTeachers?.some(
        ct => ct.class_id === cls.id && ct.teacher_id === cls.teacher_id
      )
      
      // If primary teacher is not in class_teachers, add 1 to count
      if (!primaryInClassTeachers) {
        teacherCounts[cls.id] = (teacherCounts[cls.id] || 0) + 1
      }
    }
  })
  
  // Get enrollment counts
  const { data: enrollments } = await supabase
    .from('class_enrollments')
    .select('class_id')
    .in('class_id', classIds)
    .eq('status', 'active')
  
  const enrollmentCounts: Record<string, number> = {}
  enrollments?.forEach(e => {
    enrollmentCounts[e.class_id] = (enrollmentCounts[e.class_id] || 0) + 1
  })
  
  const enrichedClasses = classes.map(c => ({
    ...c,
    teacher_count: teacherCounts[c.id] || 0,
    student_count: enrollmentCounts[c.id] || 0
  }))
  
  return { data: enrichedClasses, count: count || 0, page }
}

async function getStats(organizationId: string) {
  // Use admin client to bypass RLS
  const supabase = createAdminClient()
  
  // Optimized: single query to get all stats
  const { data: classes } = await supabase
    .from('classes')
    .select('is_active')
    .eq('organization_id', organizationId)
  
  const allClasses = classes || []
  
  return {
    total: allClasses.length,
    active: allClasses.filter(c => c.is_active).length,
    inactive: allClasses.filter(c => !c.is_active).length,
  }
}

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}) {
  const organizationId = await getOrganizationId()
  
  if (!organizationId) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">No Organization</h2>
          <p className="mt-2 text-sm text-gray-500">You are not associated with any organization.</p>
        </div>
      </div>
    )
  }
  
  const params = await searchParams
  const [classesResult, stats] = await Promise.all([
    getClasses(organizationId, params),
    getStats(organizationId),
  ])
  
  const { data: classes, count: totalClasses, page: currentPage } = classesResult

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Classes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage classes
          </p>
        </div>
        
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          {/* Mobile Stats */}
          <div className="flex items-center gap-4 sm:hidden">
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">{stats.active}</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-400">{stats.inactive}</p>
              <p className="text-xs text-gray-500">Inactive</p>
            </div>
          </div>
          
          {/* Desktop Stats */}
          <div className="hidden items-center gap-6 lg:flex">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-400">{stats.inactive}</p>
              <p className="text-xs text-gray-500">Inactive</p>
            </div>
          </div>
          
          {/* Create Class Button */}
          <AddClassDialog />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="search"
            defaultValue={params.search}
            placeholder="Search classes..."
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-4 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Link
            href="/school-admin/classes"
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              !params.status ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All ({stats.total})
          </Link>
          <Link
            href="/school-admin/classes?status=active"
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              params.status === 'active' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Active ({stats.active})
          </Link>
          <Link
            href="/school-admin/classes?status=inactive"
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              params.status === 'inactive' ? 'bg-gray-200 text-gray-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Inactive ({stats.inactive})
          </Link>
        </div>
      </div>

      {/* Classes List */}
      <div className="rounded-lg border border-gray-200 bg-white">
        {classes.length === 0 ? (
          <div className="p-8 text-center sm:p-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No classes found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {params.search || params.status
                ? 'Try adjusting your filters'
                : 'Create your first class to get started'}
            </p>
            <div className="mt-6">
              <AddClassDialog />
            </div>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="divide-y divide-gray-100 sm:hidden">
              {classes.map((cls: ClassRow) => (
                <div key={cls.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link 
                      href={`/school-admin/classes/${cls.id}`}
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{cls.name}</p>
                        {cls.description && (
                          <p className="text-sm text-gray-500 truncate">{cls.description}</p>
                        )}
                      </div>
                    </Link>
                    <ClassRowActions 
                      classId={cls.id} 
                      className={cls.name}
                      description={cls.description ?? null}
                      isActive={cls.is_active}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <User className="h-3.5 w-3.5" />
                        {cls.teacher_count} teacher{cls.teacher_count !== 1 ? 's' : ''}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <GraduationCap className="h-3.5 w-3.5" />
                        {cls.student_count} student{cls.student_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {cls.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                        <XCircle className="h-3 w-3" />
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-600">
                      {cls.class_code}
                    </code>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <table className="hidden min-w-full divide-y divide-gray-200 sm:table">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:pl-6">
                    Class
                  </th>
                  <th scope="col" className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 md:table-cell">
                    Teachers
                  </th>
                  <th scope="col" className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 lg:table-cell">
                    Students
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th scope="col" className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 lg:table-cell">
                    Class Code
                  </th>
                  <th scope="col" className="relative py-3 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {classes.map((cls: ClassRow) => (
                  <tr key={cls.id} className="hover:bg-gray-50 transition-colors">
                    {/* Class */}
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                      <Link 
                        href={`/school-admin/classes/${cls.id}`}
                        className="flex items-center gap-3 hover:opacity-80"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{cls.name}</p>
                          {cls.description && (
                            <p className="text-sm text-gray-500 truncate max-w-xs">
                              {cls.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    </td>

                    {/* Teachers */}
                    <td className="hidden whitespace-nowrap px-3 py-4 md:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <User className="h-4 w-4 text-emerald-600" />
                        {cls.teacher_count} teacher{cls.teacher_count !== 1 ? 's' : ''}
                      </div>
                    </td>

                    {/* Students */}
                    <td className="hidden whitespace-nowrap px-3 py-4 lg:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <GraduationCap className="h-4 w-4" />
                        {cls.student_count} student{cls.student_count !== 1 ? 's' : ''}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="whitespace-nowrap px-3 py-4">
                      {cls.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Class Code */}
                    <td className="hidden whitespace-nowrap px-3 py-4 lg:table-cell">
                      <code className="rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-700">
                        {cls.class_code}
                      </code>
                    </td>

                    {/* Actions */}
                    <td className="whitespace-nowrap py-4 pl-3 pr-4 sm:pr-6">
                      <div className="flex items-center justify-end">
                        <ClassRowActions 
                          classId={cls.id} 
                          className={cls.name}
                          description={cls.description ?? null}
                          isActive={cls.is_active}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Footer with Pagination */}
      {classes.length > 0 && (
        <div className="space-y-4">
          <PaginationFooter
            currentPage={currentPage}
            perPage={PER_PAGE}
            totalItems={totalClasses}
            baseUrl="/school-admin/classes"
            searchParams={{
              search: params.search,
              status: params.status,
            }}
          />
          {(params.search || params.status) && (
            <div className="text-center">
              <Link
                href="/school-admin/classes"
                className="text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                Clear all filters
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
