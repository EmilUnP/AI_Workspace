'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  X, 
  Loader2, 
  UserPlus,
  Search,
  GraduationCap,
  Building2
} from 'lucide-react'
import { enrollStudentInClass } from './actions'
import { getUsersByUnit } from './get-users-by-unit'
import { getOrganizationStructure } from '../../users/get-organization-structure'

interface Student {
  id: string
  full_name: string
  email: string
}

interface OrganizationUnit {
  id: string
  name: string
  parent_id?: string | null
}

interface EnrollStudentDialogProps {
  classId: string
  organizationId: string
  availableStudents: Student[]
}

export function EnrollStudentDialog({ classId, organizationId, availableStudents: initialStudents }: EnrollStudentDialogProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [selectedUnitId, setSelectedUnitId] = useState<string>('')
  const [structure, setStructure] = useState<OrganizationUnit[]>([])
  const [loadingStructure, setLoadingStructure] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [availableStudents, setAvailableStudents] = useState(initialStudents)

  // Fetch organization structure when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLoadingStructure(true)
      setSelectedUnitId('') // Reset unit selection
      setSearchQuery('') // Reset search
      setSelectedStudents([]) // Reset student selection
      getOrganizationStructure().then((result) => {
        if (result.structure) {
          setStructure(result.structure)
        }
        setLoadingStructure(false)
        // After structure loads, fetch initial students (all units)
        if (organizationId) {
          setLoadingStudents(true)
          getUsersByUnit({
            organizationId,
            profileType: 'student',
            classId,
            unitId: null,
          }).then((students) => {
            setAvailableStudents(students)
            setLoadingStudents(false)
          }).catch((err) => {
            console.error('Error fetching students:', err)
            setLoadingStudents(false)
            setAvailableStudents([])
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
      setSelectedStudents([])
      setAvailableStudents(initialStudents)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync students when dialog opens
  }, [isOpen, organizationId, classId])

  // Fetch students when unit selection changes (but not on initial open)
  useEffect(() => {
    if (isOpen && organizationId && !loadingStructure) {
      setLoadingStudents(true)
      setSelectedStudents([]) // Reset selection when filtering
      getUsersByUnit({
        organizationId,
        profileType: 'student',
        classId,
        unitId: selectedUnitId || null,
      }).then((students) => {
        setAvailableStudents(students)
        setLoadingStudents(false)
      }).catch((err) => {
        console.error('Error fetching students:', err)
        setLoadingStudents(false)
        setAvailableStudents([])
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

  const filteredStudents = availableStudents.filter(
    student =>
      student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleSubmit = async () => {
    if (selectedStudents.length === 0) {
      setError('Please select at least one student')
      return
    }
    
    setError(null)
    
    startTransition(async () => {
      for (const studentId of selectedStudents) {
        const result = await enrollStudentInClass(classId, studentId)
        if (result.error) {
          setError(result.error)
          return
        }
      }
      
      setSelectedStudents([])
      setIsOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
      >
        <Plus className="h-4 w-4" />
        Add Students
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
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-5 sm:p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Add Students</h2>
                    <p className="text-green-100 text-sm">Select students to enroll</p>
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

            {/* Content */}
            <div className="p-6">
              {/* Organization Unit Filter - Always visible */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Organization Unit <span className="text-gray-400">(Optional)</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <select
                    value={selectedUnitId}
                    onChange={(e) => setSelectedUnitId(e.target.value)}
                    disabled={loadingStructure || loadingStudents}
                    className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-500"
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
                  {loadingStructure ? 'Loading structure...' : 'Select a unit to filter students, or leave as "All Units"'}
                </p>
              </div>

              {availableStudents.length === 0 && !loadingStudents && !loadingStructure ? (
                <div className="py-8 text-center">
                  <GraduationCap className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">
                    {selectedUnitId 
                      ? 'No available students in this unit' 
                      : 'No available students to enroll'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedUnitId 
                      ? 'Try selecting a different unit or "All Units"' 
                      : 'All students are already enrolled or none exist'}
                  </p>
                  {selectedUnitId && (
                    <button
                      type="button"
                      onClick={() => setSelectedUnitId('')}
                      className="mt-3 text-sm text-green-600 hover:text-green-700 underline"
                    >
                      Show all units
                    </button>
                  )}
                </div>
              ) : (
                <>

                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search students..."
                      disabled={loadingStudents}
                      className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  {/* Student List */}
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {loadingStudents ? (
                      <div className="py-4 text-center text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                        Loading students...
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="py-4 text-center text-sm text-gray-500 space-y-2">
                        <p>
                          {selectedUnitId 
                            ? 'No students found in this unit. Try selecting a different unit or "All Units".' 
                            : 'No students match your search'}
                        </p>
                        {selectedUnitId && (
                          <button
                            type="button"
                            onClick={() => setSelectedUnitId('')}
                            className="text-xs text-green-600 hover:text-green-700 underline"
                          >
                            Show all units
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredStudents.map((student) => (
                        <label
                          key={student.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-all ${
                            selectedStudents.includes(student.id)
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => toggleStudent(student.id)}
                            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                            <span className="text-xs font-medium">
                              {student.full_name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{student.full_name}</p>
                            <p className="text-xs text-gray-500 truncate">{student.email}</p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>

                  {selectedStudents.length > 0 && (
                    <p className="mt-3 text-sm text-green-600">
                      {selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                </>
              )}

              {/* Error Message */}
              {error && (
                <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

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
                type="button"
                onClick={handleSubmit}
                disabled={isPending || selectedStudents.length === 0}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white font-medium text-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70 transition-colors"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Add {selectedStudents.length > 0 ? `(${selectedStudents.length})` : ''}
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
