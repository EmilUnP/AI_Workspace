import { Settings, Wrench } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-500">
          Platform configuration and preferences
        </p>
      </div>

      {/* Demo Placeholder */}
      <div className="rounded-xl border border-gray-200 bg-white p-12 shadow-sm">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <Wrench className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-gray-900">
            Settings Coming Soon
          </h2>
          <p className="mt-2 max-w-md text-gray-500">
            Platform settings and configuration options will be available here. 
            This feature is currently under development.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-600">
              <Settings className="h-4 w-4" />
              General Settings
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-600">
              Notifications
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-600">
              Security
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-600">
              API Keys
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
