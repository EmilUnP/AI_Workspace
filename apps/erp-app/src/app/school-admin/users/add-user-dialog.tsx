'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  X, 
  Loader2, 
  UserPlus, 
  Mail, 
  Lock, 
  User,
  BookOpen,
  Building2
} from 'lucide-react'
import { createUser } from './actions'
import { getOrganizationStructure } from './get-organization-structure'

interface OrganizationUnit {
  id: string
  name: string
  parent_id?: string | null
}

export function AddUserDialog() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [profileType, setProfileType] = useState<'teacher'>('teacher')
  const [structure, setStructure] = useState<OrganizationUnit[]>([])
  const [, setLoadingStructure] = useState(false)

  // Fetch organization structure when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLoadingStructure(true)
      getOrganizationStructure().then((result) => {
        if (result.structure) {
          setStructure(result.structure)
        }
        setLoadingStructure(false)
      })
    }
  }, [isOpen])

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

    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      const result = await createUser(formData)
      
      if (result.error) {
        setError(result.error)
      } else {
        setIsOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700"
      >
        <Plus className="h-4 w-4" />
        Add User
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isPending && setIsOpen(false)}
          />
          
          {/* Dialog Container */}
          <div className="min-h-full flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-5 sm:p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Add New User</h2>
                    <p className="text-orange-100 text-sm">Create a new teacher</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form id="add-user-form" onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  User Type
                </label>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => setProfileType('teacher')}
                    className={`flex items-center gap-3 rounded-lg border-2 p-4 transition-all ${
                      profileType === 'teacher'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      profileType === 'teacher' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <p className={`font-medium ${profileType === 'teacher' ? 'text-emerald-900' : 'text-gray-900'}`}>
                        Teacher
                      </p>
                      <p className="text-xs text-gray-500">Can create classes & exams</p>
                    </div>
                  </button>
                </div>
                <input type="hidden" name="profile_type" value={profileType} />
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    required
                    className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter full name"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="user@example.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    minLength={6}
                    className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Minimum 6 characters"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  The user will use this password to log in
                </p>
              </div>

              {/* Organization Unit */}
              {structure.length > 0 && (
                <div>
                  <label htmlFor="organization_unit_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Unit <span className="text-gray-400">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <select
                      id="organization_unit_id"
                      name="organization_unit_id"
                      className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              )}

              {/* Error Message */}
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

            </form>

            {/* Actions */}
            <div className="bg-gray-50 px-5 py-4 sm:px-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-user-form"
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white font-medium text-sm hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70 transition-colors"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Create User
                  </>
                )}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </>
  )
}
