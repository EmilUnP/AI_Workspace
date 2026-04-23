'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2, BookOpen, Building2, Key } from 'lucide-react'
import { updateUser } from './actions'
import { getOrganizationStructure } from '../get-organization-structure'

interface User {
  id: string
  full_name: string | null
  profile_type: string
  approval_status: string
  metadata?: { organization_unit_id?: string; api_integration_enabled?: boolean }
}

interface OrganizationUnit {
  id: string
  name: string
  parent_id?: string | null
}

interface EditUserFormProps {
  user: User
}

export function EditUserForm({ user }: EditUserFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [profileType, setProfileType] = useState(user.profile_type)
  const [structure, setStructure] = useState<OrganizationUnit[]>([])
  const [loadingStructure, setLoadingStructure] = useState(false)
  const [apiIntegrationEnabled, setApiIntegrationEnabled] = useState(
    !!user.metadata?.api_integration_enabled
  )

  // Get current organization unit from metadata
  const currentUnitId = user.metadata?.organization_unit_id || ''

  // Fetch organization structure
  useEffect(() => {
    setLoadingStructure(true)
    getOrganizationStructure().then((result) => {
      if (result.structure) {
        setStructure(result.structure)
      }
      setLoadingStructure(false)
    })
  }, [])

  // Build flat list from tree structure for dropdown
  const buildFlatList = (units: OrganizationUnit[], level = 0): Array<{ unit: OrganizationUnit; level: number; path: string }> => {
    const flat: Array<{ unit: OrganizationUnit; level: number; path: string }> = []
    
    units.forEach(unit => {
      const indent = '  '.repeat(level)
      flat.push({ unit, level, path: `${indent}${unit.name}` })
      
      // Get children
      const children = structure.filter(u => u.parent_id === unit.id)
      if (children.length > 0) {
        flat.push(...buildFlatList(children, level + 1))
      }
    })
    
    return flat
  }

  const flatStructure = buildFlatList(structure.filter(u => !u.parent_id))

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    formData.set('api_integration_enabled', apiIntegrationEnabled ? '1' : '0')
    
    startTransition(async () => {
      const result = await updateUser(formData)
      
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        router.refresh()
        setTimeout(() => setSuccess(false), 3000)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      <input type="hidden" name="id" value={user.id} />

      {/* Full Name */}
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
          Full Name
        </label>
        <input
          type="text"
          id="full_name"
          name="full_name"
          required
          defaultValue={user.full_name || ''}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Enter full name"
        />
      </div>

      {/* Role Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Role
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setProfileType('teacher')}
            className={`flex items-center gap-2 rounded-lg border-2 p-3 transition-all ${
              profileType === 'teacher'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <BookOpen className={`h-5 w-5 ${profileType === 'teacher' ? 'text-emerald-600' : 'text-gray-400'}`} />
            <span className={`text-sm font-medium ${profileType === 'teacher' ? 'text-emerald-700' : 'text-gray-700'}`}>
              Teacher
            </span>
          </button>

        </div>
        <input type="hidden" name="profile_type" value={profileType} />
      </div>

      {/* Status */}
      <div>
        <label htmlFor="approval_status" className="block text-sm font-medium text-gray-700">
          Approval Status
        </label>
        <select
          id="approval_status"
          name="approval_status"
          defaultValue={user.approval_status}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Organization Unit */}
      {loadingStructure ? (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Organization Unit <span className="text-gray-400">(Optional)</span>
          </label>
          <div className="mt-1 text-sm text-gray-500">Loading units...</div>
        </div>
      ) : structure.length > 0 ? (
        <div>
          <label htmlFor="organization_unit_id" className="block text-sm font-medium text-gray-700">
            Organization Unit <span className="text-gray-400">(Optional)</span>
          </label>
          <div className="relative mt-1">
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <select
              id="organization_unit_id"
              name="organization_unit_id"
              key={`unit-select-${currentUnitId}-${structure.length}`}
              defaultValue={currentUnitId}
              className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">No unit assigned</option>
              {flatStructure.map(({ unit, path }) => (
                <option key={unit.id} value={unit.id}>
                  {path}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Assign user to a department or organizational unit
          </p>
        </div>
      ) : null}

      {/* API Integration (Teachers only) */}
      {profileType === 'teacher' && (
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={apiIntegrationEnabled}
              onChange={(e) => setApiIntegrationEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Key className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              Enable API integration
            </span>
          </label>
          <p className="mt-1 ml-6 text-xs text-gray-500">
            When enabled, this teacher will see &quot;API Integration&quot; in the sidebar and can create API keys for third-party usage (exam/lesson generation, etc.).
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="rounded-md bg-green-50 p-3">
          <p className="text-sm text-green-700">User updated successfully!</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Save Changes
          </>
        )}
      </button>
    </form>
  )
}
