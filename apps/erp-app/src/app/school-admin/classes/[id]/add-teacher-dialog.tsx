'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, BookOpen, Search, Building2 } from 'lucide-react'
import { addTeacherToClass } from './actions'
import { getUsersByUnit } from './get-users-by-unit'
import { getOrganizationStructure } from '../../users/get-organization-structure'

interface AddTeacherDialogProps {
  classId: string
  organizationId: string
  availableTeachers: Array<{ id: string; full_name: string; email: string }>
}

interface OrganizationUnit {
  id: string
  name: string
  parent_id?: string | null
}

export function AddTeacherDialog({ classId, organizationId, availableTeachers: initialTeachers }: AddTeacherDialogProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null)
  const [selectedUnitId, setSelectedUnitId] = useState<string>('')
  const [structure, setStructure] = useState<OrganizationUnit[]>([])
  const [loadingStructure, setLoadingStructure] = useState(false)
  const [loadingTeachers, setLoadingTeachers] = useState(false)
  const [availableTeachers, setAvailableTeachers] = useState(initialTeachers)

  // Fetch organization structure when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLoadingStructure(true)
      setSelectedUnitId('') // Reset unit selection
      setSearchQuery('') // Reset search
      setSelectedTeacher(null) // Reset teacher selection
      getOrganizationStructure().then((result) => {
        if (result.structure) {
          setStructure(result.structure)
        }
        setLoadingStructure(false)
        // After structure loads, fetch initial teachers (all units)
        if (organizationId) {
          setLoadingTeachers(true)
          getUsersByUnit({
            organizationId,
            profileType: 'teacher',
            classId,
            unitId: null,
          }).then((teachers) => {
            setAvailableTeachers(teachers)
            setLoadingTeachers(false)
          }).catch((err) => {
            console.error('Error fetching teachers:', err)
            setLoadingTeachers(false)
            setAvailableTeachers([])
          })
        }
      }).catch((err) => {
        console.error('Error fetching structure:', err)
        setLoadingStructure(false)
      })
    } else {
      // Reset everything when dialog closes
      setSelectedUnitId('')
      setSearchQuery('')
      setSelectedTeacher(null)
      setAvailableTeachers(initialTeachers)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync teachers when dialog opens, not when initialTeachers ref changes
  }, [isOpen, organizationId, classId])

  // Fetch teachers when unit selection changes (but not on initial open)
  useEffect(() => {
    if (isOpen && organizationId && !loadingStructure) {
      setLoadingTeachers(true)
      setSelectedTeacher(null) // Reset selection when filtering
      getUsersByUnit({
        organizationId,
        profileType: 'teacher',
        classId,
        unitId: selectedUnitId || null,
      }).then((teachers) => {
        setAvailableTeachers(teachers)
        setLoadingTeachers(false)
      }).catch((err) => {
        console.error('Error fetching teachers:', err)
        setLoadingTeachers(false)
        setAvailableTeachers([])
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- isOpen intentionally omitted to avoid double fetch on open
  }, [selectedUnitId, organizationId, classId, loadingStructure])

  // Build flat list from tree structure for dropdown
  const buildFlatList = (units: OrganizationUnit[], level = 0): Array<{ unit: OrganizationUnit; level: number; path: string }> => {
    const flat: Array<{ unit: OrganizationUnit; level: number; path: string }> = []
    
    units.forEach(unit => {
      const indent = '  '.repeat(level)
      flat.push({ unit, level, path: `${indent}${unit.name}` })
      
      const children = structure.filter(u => u.parent_id === unit.id)
      if (children.length > 0) {
        flat.push(...buildFlatList(children, level + 1))
      }
    })
    
    return flat
  }

  const flatStructure = buildFlatList(structure.filter(u => !u.parent_id))

  const filteredTeachers = availableTeachers.filter(teacher =>
    teacher.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedTeacher) {
      setError('Please select a teacher')
      return
    }
    
    startTransition(async () => {
      const result = await addTeacherToClass(classId, selectedTeacher)
      
      if (result.error) {
        setError(result.error)
      } else {
        setIsOpen(false)
        setSelectedTeacher(null)
        setSearchQuery('')
        setSelectedUnitId('')
        router.refresh()
      }
    })
  }

  return (
    <>
      {availableTeachers.length === 0 && !isOpen ? (
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
          title="No available teachers to add"
        >
          <Plus className="h-4 w-4" />
          Add Teacher
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Teacher
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isPending && setIsOpen(false)}
          />
          
          {/* Dialog Container */}
          <div className="min-h-full flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Add Teacher</h2>
                    <p className="text-blue-100 text-sm">Assign a teacher to this class</p>
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
            <form id="add-teacher-form" onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Organization Unit Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Organization Unit <span className="text-gray-400">(Optional)</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <select
                    value={selectedUnitId}
                    onChange={(e) => setSelectedUnitId(e.target.value)}
                    disabled={loadingStructure || loadingTeachers}
                    className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option value="">All Units</option>
                    {flatStructure.map(({ unit, path }) => (
                      <option key={unit.id} value={unit.id}>
                        {path}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {loadingStructure ? 'Loading structure...' : 'Select a unit to filter teachers, or leave as "All Units"'}
                </p>
              </div>

              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Teachers
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    disabled={loadingTeachers}
                    className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>

              {/* Teacher List */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Teacher ({loadingTeachers ? 'Loading...' : `${filteredTeachers.length} available`})
                </label>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200">
                  {loadingTeachers ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                      Loading teachers...
                    </div>
                  ) : filteredTeachers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500 space-y-2">
                      <p>
                        {selectedUnitId 
                          ? 'No teachers found in this unit. Try selecting a different unit or "All Units".' 
                          : 'No teachers found'}
                      </p>
                      {selectedUnitId && (
                        <button
                          type="button"
                          onClick={() => setSelectedUnitId('')}
                          className="text-xs text-blue-600 hover:text-blue-700 underline"
                        >
                          Show all units
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredTeachers.map((teacher) => (
                      <button
                        key={teacher.id}
                        type="button"
                        onClick={() => setSelectedTeacher(teacher.id)}
                        className={`flex w-full items-center gap-3 p-3 text-left transition-colors ${
                          selectedTeacher === teacher.id
                            ? 'bg-blue-50 border-l-4 border-blue-500'
                            : 'hover:bg-gray-50 border-l-4 border-transparent'
                        }`}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                          <span className="text-xs font-medium">
                            {teacher.full_name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {teacher.full_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{teacher.email}</p>
                        </div>
                        {selectedTeacher === teacher.id && (
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

            </form>

            {/* Actions */}
            <div className="bg-gray-50 px-5 py-4 flex flex-col-reverse sm:flex-row justify-end gap-3">
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
                form="add-teacher-form"
                disabled={isPending || !selectedTeacher}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 transition-colors"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Teacher
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
