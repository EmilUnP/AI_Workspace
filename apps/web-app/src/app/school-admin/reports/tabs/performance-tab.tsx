'use client'

import { useEffect, useState } from 'react'
import { 
  Award,
  CheckCircle2,
  FileText,
  Users,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { BarChart } from '../components/charts'

interface PerformanceData {
  averageScore: number
  passRate: number
  totalSubmissions: number
  submissionStatusCounts: {
    in_progress: number
    submitted: number
    graded: number
    reviewed: number
  }
  topPerformers: number
  needsImprovement: number
}

export default function PerformanceTab({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        void workspaceId
        const response = await fetch('/api/school-admin/reports/performance')
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Failed to fetch performance data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [workspaceId])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          <p className="mt-4 text-sm text-gray-500">Loading performance data...</p>
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

  const maxSubmissionValue = Math.max(...Object.values(data.submissionStatusCounts), 1)

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <Award className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Average Score</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{data.averageScore}%</p>
            <p className="mt-1 text-xs text-gray-500">Across all exams</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Pass Rate</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{data.passRate}%</p>
            <p className="mt-1 text-xs text-gray-500">Learners passing</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <FileText className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Total Submissions</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{data.totalSubmissions}</p>
            <p className="mt-1 text-xs text-gray-500">Exam attempts</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Top Performers</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{data.topPerformers}</p>
            <p className="mt-1 text-xs text-gray-500">Score &gt;80%</p>
          </div>
        </div>
      </div>

      {/* Submission Status - Bar Chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Submission Status</h3>
        <p className="mt-1 text-sm text-gray-500">Breakdown of exam submission statuses</p>
        
        <div className="mt-6">
          <BarChart
            data={[
              data.submissionStatusCounts.in_progress,
              data.submissionStatusCounts.submitted,
              data.submissionStatusCounts.graded,
              data.submissionStatusCounts.reviewed,
            ]}
            labels={['In Progress', 'Submitted', 'Graded', 'Reviewed']}
            colors={['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6']}
            maxValue={maxSubmissionValue}
          />
        </div>
        
        <div className="mt-6 flex items-center justify-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="text-sm text-gray-600">In Progress: {data.submissionStatusCounts.in_progress}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-sm text-gray-600">Submitted: {data.submissionStatusCounts.submitted}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-600">Graded: {data.submissionStatusCounts.graded}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-purple-500" />
            <span className="text-sm text-gray-600">Reviewed: {data.submissionStatusCounts.reviewed}</span>
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
              <p className="text-sm text-gray-500">Learners scoring above 80%</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-gray-900">{data.topPerformers}</p>
            <p className="mt-1 text-sm text-gray-500">Excellent performance</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <TrendingDown className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Needs Improvement</h3>
              <p className="text-sm text-gray-500">Learners scoring below 60%</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-gray-900">{data.needsImprovement}</p>
            <p className="mt-1 text-sm text-gray-500">May need additional support</p>
          </div>
        </div>
      </div>
    </div>
  )
}
