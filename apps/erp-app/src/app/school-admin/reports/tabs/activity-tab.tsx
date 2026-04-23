'use client'

import { useEffect, useState } from 'react'
import { Calendar, Users, FileText } from 'lucide-react'
import { BarChart } from '../components/charts'

interface ActivityData {
  enrollmentByMonth: {
    labels: string[]
    data: number[]
  }
  examByMonth: {
    labels: string[]
    data: number[]
  }
  totalEnrollments: number
  recentActivity: {
    enrollments: number
    exams: number
    submissions: number
  }
}

export default function ActivityTab({ organizationId }: { organizationId: string }) {
  const [data, setData] = useState<ActivityData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const response = await fetch(`/api/school-admin/reports/activity?organizationId=${organizationId}`)
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Failed to fetch activity data:', error)
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
          <p className="mt-4 text-sm text-gray-500">Loading activity data...</p>
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

  const maxEnrollmentValue = Math.max(...data.enrollmentByMonth.data, 1)
  const maxExamValue = Math.max(...data.examByMonth.data, 1)

  return (
    <div className="space-y-6">
      {/* Recent Activity Stats */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Recent Enrollments</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{data.recentActivity.enrollments}</p>
            <p className="mt-1 text-xs text-gray-500">Last 30 days</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <FileText className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">New Exams</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{data.recentActivity.exams}</p>
            <p className="mt-1 text-xs text-gray-500">Last 30 days</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Submissions</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{data.recentActivity.submissions}</p>
            <p className="mt-1 text-xs text-gray-500">Last 30 days</p>
          </div>
        </div>
      </div>

      {/* Time-based Trends */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Enrollment Trends - Bar Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Enrollment Trends</h3>
          <p className="mt-1 text-sm text-gray-500">New enrollments over the last 6 months</p>
          
          <div className="mt-6">
            <BarChart
              data={data.enrollmentByMonth.data}
              labels={data.enrollmentByMonth.labels}
              colors={['#3B82F6', '#3B82F6', '#3B82F6', '#3B82F6', '#3B82F6', '#3B82F6']}
              maxValue={maxEnrollmentValue}
            />
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Total: {data.enrollmentByMonth.data.reduce((a, b) => a + b, 0)} enrollments
            </p>
          </div>
        </div>

        {/* Exam Creation Trends - Bar Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Exam Creation Trends</h3>
          <p className="mt-1 text-sm text-gray-500">Exams created over the last 6 months</p>
          
          <div className="mt-6">
            <BarChart
              data={data.examByMonth.data}
              labels={data.examByMonth.labels}
              colors={['#F59E0B', '#F59E0B', '#F59E0B', '#F59E0B', '#F59E0B', '#F59E0B']}
              maxValue={maxExamValue}
            />
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Total: {data.examByMonth.data.reduce((a, b) => a + b, 0)} exams
            </p>
          </div>
        </div>
      </div>

      {/* Total Enrollments */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Total Active Enrollments</h3>
            <p className="mt-1 text-sm text-gray-500">All active class enrollments</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">{data.totalEnrollments}</p>
            <p className="text-sm text-gray-500">Active enrollments</p>
          </div>
        </div>
      </div>
    </div>
  )
}
