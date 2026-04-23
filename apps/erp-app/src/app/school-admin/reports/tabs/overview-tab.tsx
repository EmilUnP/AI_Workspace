'use client'

import { useEffect, useState } from 'react'
import { 
  Users, 
  BookOpen, 
  GraduationCap,
  TrendingUp,
  FileText,
} from 'lucide-react'
import { DonutChart } from '../components/charts'

interface OverviewData {
  teachers: number
  students: number
  totalClasses: number
  activeClasses: number
  exams: number
  publishedExams: number
  totalEnrollments: number
}

export default function OverviewTab({ organizationId }: { organizationId: string }) {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const response = await fetch(`/api/school-admin/reports/overview?organizationId=${organizationId}`)
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Failed to fetch overview data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [organizationId])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          <p className="mt-4 text-sm text-gray-500">Loading overview data...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Failed to load data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <BookOpen className="h-6 w-6" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              Active
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Active Teachers</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{data.teachers}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600">
              <TrendingUp className="h-3 w-3" />
              Active
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Active Students</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{data.students}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Total Classes</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{data.totalClasses}</p>
            <p className="mt-1 text-xs text-gray-500">{data.activeClasses} active</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <FileText className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Total Exams</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{data.exams}</p>
            <p className="mt-1 text-xs text-gray-500">{data.publishedExams} published</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Distribution - Donut Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">User Distribution</h3>
          <p className="mt-1 text-sm text-gray-500">Breakdown of users by role</p>
          
          <div className="mt-6 relative flex items-center justify-center">
            <DonutChart
              data={[data.teachers, data.students]}
              labels={['Teachers', 'Students']}
              colors={['#10B981', '#3B82F6']}
            />
          </div>
          
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <div>
                <p className="text-xs font-medium text-gray-700">Teachers</p>
                <p className="text-sm font-semibold text-gray-900">{data.teachers}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <div>
                <p className="text-xs font-medium text-gray-700">Students</p>
                <p className="text-sm font-semibold text-gray-900">{data.students}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Exam Status - Donut Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Exam Status</h3>
          <p className="mt-1 text-sm text-gray-500">Published vs unpublished exams</p>
          
          <div className="mt-6 relative flex items-center justify-center">
            <DonutChart
              data={[data.publishedExams, data.exams - data.publishedExams]}
              labels={['Published', 'Unpublished']}
              colors={['#10B981', '#9CA3AF']}
            />
          </div>
          
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <div>
                <p className="text-xs font-medium text-gray-700">Published</p>
                <p className="text-sm font-semibold text-gray-900">{data.publishedExams}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gray-400" />
              <div>
                <p className="text-xs font-medium text-gray-700">Unpublished</p>
                <p className="text-sm font-semibold text-gray-900">{data.exams - data.publishedExams}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Class Status */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Class Status</h3>
        <p className="mt-1 text-sm text-gray-500">Active vs inactive classes</p>
        
        <div className="mt-6 relative flex items-center justify-center">
          <DonutChart
            data={[data.activeClasses, data.totalClasses - data.activeClasses]}
            labels={['Active', 'Inactive']}
            colors={['#10B981', '#9CA3AF']}
          />
        </div>
        
        <div className="mt-6 grid grid-cols-2 gap-3 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <div>
              <p className="text-xs font-medium text-gray-700">Active</p>
              <p className="text-sm font-semibold text-gray-900">{data.activeClasses}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gray-400" />
            <div>
              <p className="text-xs font-medium text-gray-700">Inactive</p>
              <p className="text-sm font-semibold text-gray-900">{data.totalClasses - data.activeClasses}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
