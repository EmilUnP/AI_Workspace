'use client'

import { useState } from 'react'
import { 
  BarChart3, 
  Download,
  Award,
  Activity
} from 'lucide-react'
import OverviewTab from './tabs/overview-tab'
import PerformanceTab from './tabs/performance-tab'
import ActivityTab from './tabs/activity-tab'

type Tab = 'overview' | 'performance' | 'activity'

interface ReportsTabsProps {
  workspaceId: string
  workspaceName: string
}

export default function ReportsTabs({ workspaceId, workspaceName }: ReportsTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="mt-1 text-gray-500">
            Comprehensive insights for {workspaceName}
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'performance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <Award className="h-4 w-4" />
            Performance
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'activity'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <Activity className="h-4 w-4" />
            Activity
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <OverviewTab workspaceId={workspaceId} />
        )}
        {activeTab === 'performance' && (
          <PerformanceTab workspaceId={workspaceId} />
        )}
        {activeTab === 'activity' && (
          <ActivityTab workspaceId={workspaceId} />
        )}
      </div>
    </div>
  )
}
