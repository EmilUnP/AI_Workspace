'use client'

import Link from 'next/link'
import { 
  BookOpen, 
  Users, 
  GraduationCap, 
  Sparkles,
  Clock,
  ArrowUpRight,
  Plus
} from 'lucide-react'

export interface ClassItem {
  id: string
  name: string
  description?: string | null
  class_code?: string | null
  subject?: string | null
  grade_level?: string | null
  created_at: string
  student_count: number
}

export interface TeacherClassesListLabels {
  title?: string
  subtitle?: string
  createClass?: string
  classes?: string
  students?: string
  noClassesAssigned?: string
  noClassesCreated?: string
  emptyAssignedHint?: string
  emptyCreatedHint?: string
  checkBackSoon?: string
  clickToCreateFirst?: string
  newBadge?: string
  studentsShort?: string
  studentsAbbr?: string
  view?: string
  quickTip?: string
  quickTipText?: string
}

const DEFAULT_LIST_LABELS: TeacherClassesListLabels = {
  title: 'My Classes',
  subtitle: 'Manage your classes, view student progress, and create engaging learning experiences.',
  createClass: 'Create Class',
  classes: 'Classes',
  students: 'Students',
  noClassesAssigned: 'No classes assigned yet',
  noClassesCreated: 'No classes created yet',
  emptyAssignedHint: 'Your School Administrator will assign classes to you. Once assigned, they will appear here.',
  emptyCreatedHint: 'Create your first class to get started. You can add students, share exams, lessons, and documents.',
  checkBackSoon: 'Check back soon!',
  clickToCreateFirst: 'Click the button above to create your first class',
  newBadge: 'New',
  studentsShort: 'students',
  studentsAbbr: 'st',
  view: 'View',
  quickTip: 'Quick Tip',
  quickTipText: 'Click on any class to view student details, track progress, and manage assignments. You can also create exams and lessons directly from the class page.',
}

export interface TeacherClassesListProps {
  classes: ClassItem[]
  variant?: 'erp'
  onCreateClass?: () => void
  showCreateButton?: boolean
  labels?: TeacherClassesListLabels
}

// Color schemes for class cards
const CLASS_COLORS = [
  { bg: 'from-blue-500 to-indigo-600', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', ring: 'ring-blue-500' },
  { bg: 'from-purple-500 to-violet-600', light: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', ring: 'ring-purple-500' },
  { bg: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', ring: 'ring-emerald-500' },
  { bg: 'from-orange-500 to-amber-600', light: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', ring: 'ring-orange-500' },
  { bg: 'from-pink-500 to-rose-600', light: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200', ring: 'ring-pink-500' },
  { bg: 'from-cyan-500 to-sky-600', light: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', ring: 'ring-cyan-500' },
]

function getColorScheme(index: number) {
  return CLASS_COLORS[index % CLASS_COLORS.length]
}

export function TeacherClassesList({ 
  classes, 
  variant = 'erp',
  onCreateClass,
  showCreateButton = false,
  labels = {},
}: TeacherClassesListProps) {
  const L = { ...DEFAULT_LIST_LABELS, ...labels }
  const totalStudents = classes.reduce((sum, c) => sum + c.student_count, 0)
  const isERP = variant === 'erp'

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-4 sm:p-6 lg:p-8 text-white shadow-xl">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-12 sm:-top-24 -right-12 sm:-right-24 h-48 w-48 sm:h-96 sm:w-96 rounded-full bg-white/20"></div>
          <div className="absolute -bottom-6 sm:-bottom-12 -left-6 sm:-left-12 h-32 w-32 sm:h-64 sm:w-64 rounded-full bg-white/20"></div>
        </div>
        
        <div className="relative">
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm flex-shrink-0">
                    <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold truncate">{L.title}</h1>
                </div>
                <p className="text-sm sm:text-base text-blue-100 max-w-lg">
                  {L.subtitle}
                </p>
              </div>
              
              {/* Create Class Button (ERP only) - Mobile */}
              {showCreateButton && onCreateClass && (
                <button
                  onClick={onCreateClass}
                  className="sm:hidden inline-flex items-center justify-center gap-2 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 px-4 py-2.5 text-sm font-medium text-white transition-colors w-full"
                >
                  <Plus className="h-4 w-4" />
                  {L.createClass}
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              {/* Stats */}
              <div className="flex gap-2 sm:gap-4 flex-1 min-w-0">
                <div className="rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-sm px-4 sm:px-6 py-3 sm:py-4 text-center flex-1 min-w-0">
                  <p className="text-2xl sm:text-3xl font-bold">{classes.length}</p>
                  <p className="text-xs sm:text-sm text-blue-200">{L.classes}</p>
                </div>
                <div className="rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-sm px-4 sm:px-6 py-3 sm:py-4 text-center flex-1 min-w-0">
                  <p className="text-2xl sm:text-3xl font-bold">{totalStudents}</p>
                  <p className="text-xs sm:text-sm text-blue-200">{L.students}</p>
                </div>
              </div>
              
              {/* Create Class Button (ERP only) - Desktop */}
              {showCreateButton && onCreateClass && (
                <button
                  onClick={onCreateClass}
                  className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 px-4 py-2.5 text-sm font-medium text-white transition-colors flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  {L.createClass}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Classes Grid */}
      {classes.length === 0 ? (
        <div className="rounded-xl sm:rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 sm:p-12 lg:p-16 text-center">
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gray-100 flex items-center justify-center mb-4 sm:mb-6">
            <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            {isERP ? L.noClassesAssigned : L.noClassesCreated}
          </h3>
          <p className="text-sm sm:text-base text-gray-500 max-w-md mx-auto mb-4 sm:mb-6 px-4">
            {isERP ? L.emptyAssignedHint : L.emptyCreatedHint}
          </p>
          {isERP ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-blue-700">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>{L.checkBackSoon}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-blue-700">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>{L.clickToCreateFirst}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((classItem, index) => {
            const colors = getColorScheme(index)
            const createdDate = new Date(classItem.created_at)
            const isNew = (Date.now() - createdDate.getTime()) < 7 * 24 * 60 * 60 * 1000 // 7 days
            
            return (
              <Link
                key={classItem.id}
                href={`/teacher/classes/${classItem.id}`}
                className="group relative rounded-xl sm:rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-xl hover:border-gray-300 transition-all duration-300"
              >
                {/* Colored Header */}
                <div className={`h-2 sm:h-3 bg-gradient-to-r ${colors.bg}`}></div>
                
                {/* New Badge */}
                {isNew && (
                  <div className="absolute top-3 right-3 sm:top-6 sm:right-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-medium text-green-700">
                      <Sparkles className="h-3 w-3" />
                      <span className="hidden sm:inline">{L.newBadge}</span>
                    </span>
                  </div>
                )}
                
                <div className="p-4 sm:p-6">
                  {/* Class Icon & Name */}
                  <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-lg sm:rounded-xl flex-shrink-0 ${colors.light} ${colors.text} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                      <BookOpen className="h-6 w-6 sm:h-7 sm:w-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {classItem.name}
                      </h3>
                      {classItem.class_code && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`inline-flex items-center rounded-md ${colors.light} ${colors.text} px-2 py-0.5 text-xs font-medium truncate`}>
                            {classItem.class_code}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Description */}
                  {classItem.description ? (
                    <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-4 sm:mb-5 min-h-[32px] sm:min-h-[40px]">
                      {classItem.description}
                    </p>
                  ) : (
                    <div className="mb-4 sm:mb-5 min-h-[32px] sm:min-h-[40px]"></div>
                  )}
                  
                  {/* Stats Row */}
                  <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 flex-wrap">
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                      <span className="font-medium">{classItem.student_count}</span>
                      <span className="text-gray-400 hidden sm:inline">{L.studentsShort}</span>
                      <span className="text-gray-400 sm:hidden">{L.studentsAbbr}</span>
                    </div>
                    {classItem.subject && (
                      <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
                        <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                        <span className="capitalize font-medium truncate">{classItem.subject}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      {classItem.grade_level && (
                        <span className={`inline-flex items-center rounded-full ${colors.light} ${colors.text} px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold`}>
                          {classItem.grade_level}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        <span className="hidden sm:inline">{createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <span className="sm:hidden">{createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </span>
                    </div>
                    <div className={`flex items-center gap-1 text-xs sm:text-sm font-medium ${colors.text} opacity-0 group-hover:opacity-100 transition-opacity`}>
                      <span className="hidden sm:inline">{L.view}</span>
                      <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
      
      {/* Quick Tips Section */}
      {classes.length > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">{L.quickTip}</h3>
              <p className="text-xs sm:text-sm text-gray-600">
                {L.quickTipText}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
