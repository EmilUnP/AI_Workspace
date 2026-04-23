'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2 } from 'lucide-react'
import { updateUser } from './actions'

interface User {
  id: string
  user_id: string
  email: string
  full_name: string | null
  profile_type: string
  approval_status: string
  organization_id: string | null
  organization?: {
    id: string
    name: string
  } | null
}

interface EditUserFormProps {
  user: User
  organizations: Array<{ id: string; name: string }>
}

export function EditUserForm({ user, organizations }: EditUserFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    
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
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
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
          defaultValue={user.full_name || ''}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          placeholder="Enter full name"
        />
      </div>

      {/* Email (Read Only) */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          id="email"
          value={user.email}
          disabled
          className="mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
        />
        <p className="mt-1 text-xs text-gray-400">Email cannot be changed</p>
      </div>

      {/* Role */}
      <div>
        <label htmlFor="profile_type" className="block text-sm font-medium text-gray-700">
          Role
        </label>
        <select
          id="profile_type"
          name="profile_type"
          defaultValue={user.profile_type}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        >
          <option value="platform_owner">Platform Owner</option>
          <option value="school_superadmin">School Admin</option>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </select>
      </div>

      {/* Organization */}
      <div>
        <label htmlFor="organization_id" className="block text-sm font-medium text-gray-700">
          Organization
        </label>
        <select
          id="organization_id"
          name="organization_id"
          defaultValue={user.organization_id || 'none'}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        >
          <option value="none">No Organization</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-400">
          School admins, teachers, and students should be assigned to an organization
        </p>
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
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

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
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
      </div>
    </form>
  )
}
