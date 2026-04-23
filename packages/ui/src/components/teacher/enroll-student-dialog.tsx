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
  Building2,
} from 'lucide-react'

export interface Student {
  id: string
  full_name: string
  email: string
}

export interface EnrollStudentDialogLabels {
  addStudentsButton: string
  modalTitle: string
  modalSubtitleErp: string
  modalSubtitleSaas: string
  filterByUnit: string
  filterByUnitOptional: string
  allUnits: string
  searchPlaceholderErp: string
  searchPlaceholderSaas: string
  loadingStudents: string
  searching: string
  noStudentsInUnit: string
  noStudentsToEnroll: string
  noStudentsFound: string
  startTypingToSearch: string
  showAllUnits: string
  studentsSelected: string
  studentsSelectedPlural: string
  selectAtLeastOne: string
  cancel: string
  adding: string
  addingShort: string
  add: string
}

const DEFAULT_ENROLL_LABELS: EnrollStudentDialogLabels = {
  addStudentsButton: 'Add Students',
  modalTitle: 'Add Students',
  modalSubtitleErp: 'Select students to enroll',
  modalSubtitleSaas: 'Search and add students',
  filterByUnit: 'Filter by Organization Unit',
  filterByUnitOptional: '(Optional)',
  allUnits: 'All Units',
  searchPlaceholderErp: 'Search students...',
  searchPlaceholderSaas: 'Search by name, email, or ID (min 2 characters)',
  loadingStudents: 'Loading students...',
  searching: 'Searching...',
  noStudentsInUnit: 'No available students in this unit',
  noStudentsToEnroll: 'No available students to enroll',
  noStudentsFound: 'No students found matching your search',
  startTypingToSearch: 'Start typing to search for students (minimum 2 characters)',
  showAllUnits: 'Show all units',
  studentsSelected: '1 student selected',
  studentsSelectedPlural: '{count} students selected',
  selectAtLeastOne: 'Please select at least one student',
  cancel: 'Cancel',
  adding: 'Adding...',
  addingShort: 'Adding',
  add: 'Add',
}

export interface EnrollStudentDialogProps {
  classId: string
  variant: 'erp'
  organizationId?: string // Required for ERP, optional for ERP
  availableStudents?: Student[] // Pre-loaded students for ERP
  onSearchStudents?: (query: string) => Promise<Student[]> // For ERP search
  onEnrollStudent: (classId: string, studentId: string) => Promise<{ error?: string; success?: boolean }>
  // ERP-specific props
  organizationStructure?: Array<{ id: string; name: string; parent_id?: string | null }>
  onLoadStudentsByUnit?: (unitId: string | null) => Promise<Student[]>
  labels?: Partial<EnrollStudentDialogLabels>
}

export function EnrollStudentDialog({ 
  classId,
  variant,
  organizationId,
  availableStudents: initialStudents = [],
  onSearchStudents,
  onEnrollStudent,
  organizationStructure = [],
  onLoadStudentsByUnit,
  labels: labelsProp,
}: EnrollStudentDialogProps) {
  const L = { ...DEFAULT_ENROLL_LABELS, ...labelsProp }
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [selectedUnitId, setSelectedUnitId] = useState<string>('')
  const [availableStudents, setAvailableStudents] = useState<Student[]>(initialStudents)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [searchResults, setSearchResults] = useState<Student[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const isERP = variant === 'erp'

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setSelectedStudents([])
      setSelectedUnitId('')
      if (isERP && initialStudents.length > 0) {
        setAvailableStudents(initialStudents)
      } else {
        setAvailableStudents([])
        setSearchResults([])
      }
    } else {
      // Reset everything when dialog closes
      setSearchQuery('')
      setSelectedStudents([])
      setSelectedUnitId('')
      setAvailableStudents([])
      setSearchResults([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isERP])

  // For ERP: Load students by unit
  useEffect(() => {
    if (isOpen && isERP && organizationId && onLoadStudentsByUnit) {
      setLoadingStudents(true)
      onLoadStudentsByUnit(selectedUnitId || null)
        .then((students) => {
          setAvailableStudents(students)
          setLoadingStudents(false)
        })
        .catch((err) => {
          console.error('Error fetching students:', err)
          setAvailableStudents([])
          setLoadingStudents(false)
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUnitId, isOpen, isERP, organizationId])

  // For ERP: Search students when query changes (debounced)
  useEffect(() => {
    if (!isOpen || isERP || !onSearchStudents) return

    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true)
        try {
          const results = await onSearchStudents(searchQuery.trim())
          setSearchResults(results)
        } catch (err) {
          console.error('Error searching students:', err)
          setSearchResults([])
        } finally {
          setIsSearching(false)
        }
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, isOpen, isERP])

  // Build flat list from tree structure for dropdown (ERP only)
  const buildFlatList = (units: typeof organizationStructure, level = 0): Array<{ unit: typeof units[0]; level: number; path: string }> => {
    const flat: Array<{ unit: typeof units[0]; level: number; path: string }> = []
    
    units.forEach(unit => {
      const indent = '  '.repeat(level)
      flat.push({ unit, level, path: `${indent}${unit.name}` })
      
      const children = organizationStructure.filter(u => u.parent_id === unit.id)
      if (children.length > 0) {
        flat.push(...buildFlatList(children, level + 1))
      }
    })
    
    return flat
  }

  const flatStructure = buildFlatList(organizationStructure.filter(u => !u.parent_id))

  // Determine which students to show
  const studentsToShow = isERP 
    ? availableStudents.filter(
        student =>
          student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : searchResults

  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleSubmit = async () => {
    if (selectedStudents.length === 0) {
      setError(L.selectAtLeastOne)
      return
    }
    
    setError(null)
    
    startTransition(async () => {
      for (const studentId of selectedStudents) {
        const result = await onEnrollStudent(classId, studentId)
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

  const handleClose = () => {
    if (!isPending) {
      setIsOpen(false)
      setError(null)
      setSearchQuery('')
      setSelectedStudents([])
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
      >
        <Plus className="h-4 w-4" />
        {L.addStudentsButton}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleClose}
          />
          
          {/* Dialog Container */}
          <div className="min-h-full flex items-center justify-center p-3 sm:p-4">
            <div className="relative w-full max-w-lg bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 sm:p-5 lg:p-6 text-white flex-shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm flex-shrink-0">
                      <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base sm:text-lg font-bold truncate">{L.modalTitle}</h2>
                      <p className="text-green-100 text-xs sm:text-sm truncate">
                        {isERP ? L.modalSubtitleErp : L.modalSubtitleSaas}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isPending}
                    className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-5 lg:p-6 overflow-y-auto flex-1">
                {/* Organization Unit Filter - ERP only */}
                {isERP && organizationStructure.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {L.filterByUnit} <span className="text-gray-400">{L.filterByUnitOptional}</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <select
                        value={selectedUnitId}
                        onChange={(e) => setSelectedUnitId(e.target.value)}
                        disabled={loadingStudents}
                        className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option value="">{L.allUnits}</option>
                        {flatStructure.map(({ unit, path }) => (
                          <option key={unit.id} value={unit.id}>
                            {path}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Search - Different behavior for ERP vs ERP */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isERP ? L.searchPlaceholderErp : L.searchPlaceholderSaas}
                    disabled={loadingStudents || isSearching}
                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                {/* Student List */}
                {loadingStudents || isSearching ? (
                  <div className="py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500">
                      {loadingStudents ? L.loadingStudents : L.searching}
                    </p>
                  </div>
                ) : studentsToShow.length === 0 ? (
                  <div className="py-8 text-center">
                    <GraduationCap className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">
                      {isERP
                        ? selectedUnitId 
                          ? L.noStudentsInUnit 
                          : L.noStudentsToEnroll
                        : searchQuery.trim().length >= 2
                          ? L.noStudentsFound
                          : L.startTypingToSearch}
                    </p>
                    {isERP && selectedUnitId && (
                      <button
                        type="button"
                        onClick={() => setSelectedUnitId('')}
                        className="mt-3 text-sm text-green-600 hover:text-green-700 underline"
                      >
                        {L.showAllUnits}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {studentsToShow.map((student) => (
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
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 flex-shrink-0">
                          <span className="text-xs font-medium">
                            {student.full_name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate text-sm">{student.full_name}</p>
                          <p className="text-xs text-gray-500 truncate">{student.email}</p>
                          {!isERP && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">ID: {student.id.slice(0, 8)}...</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {selectedStudents.length > 0 && (
                  <p className="mt-3 text-sm text-green-600">
                    {selectedStudents.length === 1 ? L.studentsSelected : L.studentsSelectedPlural.replace('{count}', String(selectedStudents.length))}
                  </p>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="bg-gray-50 px-4 sm:px-5 lg:px-6 py-3 sm:py-4 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-gray-300 bg-white text-gray-700 font-medium text-xs sm:text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {L.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending || selectedStudents.length === 0}
                  className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-green-600 text-white font-medium text-xs sm:text-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70 transition-colors"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      <span className="hidden sm:inline">{L.adding}</span>
                      <span className="sm:hidden">{L.addingShort}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">
                        {L.add} {selectedStudents.length > 0 ? `(${selectedStudents.length})` : ''}
                      </span>
                      <span className="sm:hidden">
                        {L.add} {selectedStudents.length > 0 ? `(${selectedStudents.length})` : ''}
                      </span>
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
