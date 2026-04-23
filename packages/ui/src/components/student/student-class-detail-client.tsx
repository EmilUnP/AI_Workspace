'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  BookOpen, 
  Users, 
  ArrowLeft, 
  Calendar,
  GraduationCap,
  FileText,
  FolderOpen,
  PlayCircle,
  Clock,
  CheckCircle,
  CalendarRange,
} from 'lucide-react'
import { Avatar } from '../ui/avatar'

export interface StudentClassDetailData {
  id: string
  name: string
  description?: string | null
  class_code?: string | null
  subject?: string | null
  grade_level?: string | null
  created_at: string
  teacher?: {
    id: string
    full_name?: string | null
    avatar_url?: string | null
  } | null
  student_count?: number
}

export interface ClassTeacher {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  role?: string | null
  is_primary?: boolean
}

export interface SharedExam {
  id: string
  title: string
  description?: string | null
  duration_minutes?: number | null
  is_published: boolean
  created_at: string
  question_count?: number
  has_submitted?: boolean
  submission_score?: number | null
  created_by?: string | null
  creator?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

export interface SharedDocument {
  id: string
  title: string
  description?: string | null
  file_type?: string | null
  file_size?: number | null
  file_url?: string | null
  created_at: string
  created_by?: string | null
  creator?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

export interface SharedLesson {
  id: string
  title: string
  description?: string | null
  topic?: string | null
  duration_minutes?: number | null
  is_published: boolean
  created_at: string
  created_by?: string | null
  creator?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

export interface EnrolledStudent {
  id: string
  enrolled_at: string
  status: string
  student: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

export interface SharedEducationPlan {
  id: string
  name: string
  description?: string | null
  period_months: number
  sessions_per_week: number
  hours_per_session: number
  content: Array<{
    week: number
    title?: string
    topics: string[]
    objectives?: string[]
    notes?: string
  }>
}

export interface StudentClassDetailClientTranslations {
  backToMyClasses: string
  classCode: string
  created: string
  people: string
  content: string
  plan: string
  teachers: string
  teachersCount: string
  teachersCount_other: string
  noTeachersAssigned: string
  teachersWillAppear: string
  primary: string
  students: string
  studentsCount: string
  studentsCount_other: string
  noStudentsEnrolled: string
  studentsWillAppear: string
  filterByTeacher: string
  allTeachers: string
  teacher: string
  availableExams: string
  examsCount: string
  examsCount_other: string
  done: string
  available: string
  draft: string
  questions: string
  min: string
  createdBy: string
  documents: string
  documentsCount: string
  documentsCount_other: string
  lessons: string
  lessonsCount: string
  lessonsCount_other: string
  noContentYet: string
  noContentHint: string
  week: string
  objectives: string
  planPeriod: string
  planSessions: string
  planHours: string
  studentLabel: string
}

const DEFAULT_DETAIL_TRANSLATIONS: StudentClassDetailClientTranslations = {
  backToMyClasses: 'Back to My Classes',
  classCode: 'Class Code',
  created: 'Created',
  people: 'People',
  content: 'Content',
  plan: 'Plan',
  teachers: 'Teachers',
  teachersCount: '{count} teacher assigned to this class',
  teachersCount_other: '{count} teachers assigned to this class',
  students: 'Students',
  studentsCount: '{count} student in this class',
  studentsCount_other: '{count} students in this class',
  noTeachersAssigned: 'No teachers assigned',
  teachersWillAppear: 'Teachers will appear here once assigned to the class.',
  primary: 'Primary',
  noStudentsEnrolled: 'No students enrolled',
  studentsWillAppear: 'Students will appear here once they join the class.',
  filterByTeacher: 'Filter by teacher',
  allTeachers: 'All Teachers',
  teacher: 'Teacher',
  availableExams: 'Available Exams',
  examsCount: '{count} exam available',
  examsCount_other: '{count} exams available',
  done: 'Done',
  available: 'Available',
  draft: 'Draft',
  questions: 'questions',
  min: 'min',
  createdBy: 'Created by',
  documents: 'Documents',
  documentsCount: '{count} document available',
  documentsCount_other: '{count} documents available',
  lessons: 'Lessons',
  lessonsCount: '{count} lesson available',
  lessonsCount_other: '{count} lessons available',
  noContentYet: 'No content available yet',
  noContentHint: "Your teacher hasn't shared any exams, documents, or lessons with this class yet. Check back soon!",
  week: 'Week',
  objectives: 'Objectives:',
  planPeriod: '{months} month(s)',
  planSessions: '{count} session(s)/week',
  planHours: '{hours}h per session',
  studentLabel: 'Student',
}

function interpolateDetail(str: string, values: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? key))
}

export interface StudentClassDetailClientProps {
  classData: StudentClassDetailData
  sharedExams: SharedExam[]
  sharedDocuments: SharedDocument[]
  sharedLessons: SharedLesson[]
  enrolledStudents: EnrolledStudent[]
  teachers: ClassTeacher[]
  educationPlan?: SharedEducationPlan | null
  translations?: Partial<StudentClassDetailClientTranslations>
}

export function StudentClassDetailClient({
  classData,
  sharedExams,
  sharedDocuments,
  sharedLessons,
  enrolledStudents,
  teachers,
  educationPlan = null,
  translations: tProp,
}: StudentClassDetailClientProps) {
  const t = { ...DEFAULT_DETAIL_TRANSLATIONS, ...tProp }
  const [activeTab, setActiveTab] = useState<'people' | 'content' | 'plan'>('content')
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('all')
  const createdDate = new Date(classData.created_at)

  // Filter content by selected teacher
  const filteredExams = selectedTeacherFilter === 'all' 
    ? sharedExams 
    : sharedExams.filter(exam => exam.created_by === selectedTeacherFilter)
  
  const filteredDocuments = selectedTeacherFilter === 'all' 
    ? sharedDocuments 
    : sharedDocuments.filter(doc => doc.created_by === selectedTeacherFilter)
  
  const filteredLessons = selectedTeacherFilter === 'all' 
    ? sharedLessons 
    : sharedLessons.filter(lesson => lesson.created_by === selectedTeacherFilter)

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Back Link */}
      <Link
        href="/student/classes"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-green-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.backToMyClasses}
      </Link>

      {/* Header Section */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-600 via-emerald-700 to-teal-800 p-6 sm:p-8 text-white shadow-xl">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-12 sm:-top-24 -right-12 sm:-right-24 h-48 w-48 sm:h-96 sm:w-96 rounded-full bg-white/20"></div>
          <div className="absolute -bottom-6 sm:-bottom-12 -left-6 sm:-left-12 h-32 w-32 sm:h-64 sm:w-64 rounded-full bg-white/20"></div>
        </div>
        
        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm">
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">{classData.name}</h1>
                {classData.description && (
                  <p className="text-green-100 max-w-xl mb-4">{classData.description}</p>
                )}
                <div className="flex items-center gap-3 sm:gap-4 text-sm text-green-200 flex-wrap">
                  {classData.teacher?.full_name && (
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {classData.teacher.full_name}
                    </span>
                  )}
                  {classData.subject && (
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4" />
                      {classData.subject}
                    </span>
                  )}
                  {classData.grade_level && (
                    <span className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
                      {classData.grade_level}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {t.created} {createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
            
            {classData.class_code && (
              <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 sm:p-5 min-w-[180px] sm:min-w-[200px]">
                <p className="text-sm text-green-200 mb-2">{t.classCode}</p>
                <code className="text-xl sm:text-2xl font-bold font-mono block">{classData.class_code}</code>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('people')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'people'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <Users className="h-4 w-4" />
            {t.people}
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'content'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            {t.content}
          </button>
          {educationPlan && (
            <button
              onClick={() => setActiveTab('plan')}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'plan'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <CalendarRange className="h-4 w-4" />
              {t.plan}
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'plan' && educationPlan ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 p-4 sm:p-5 bg-gradient-to-r from-green-50 to-emerald-50">
              <h2 className="text-lg font-bold text-gray-900">{educationPlan.name}</h2>
              {educationPlan.description && (
                <p className="text-sm text-gray-600 mt-1">{educationPlan.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                {interpolateDetail(t.planPeriod, { months: educationPlan.period_months })} · {interpolateDetail(t.planSessions, { count: educationPlan.sessions_per_week })} · {interpolateDetail(t.planHours, { hours: educationPlan.hours_per_session })}
              </p>
            </div>
            <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
              {(educationPlan.content || []).map((week) => (
                <div key={week.week} className="p-4 sm:p-5">
                  <h3 className="font-medium text-gray-900">
                    {t.week} {week.week}: {week.title || `${t.week} ${week.week}`}
                  </h3>
                  {week.topics?.length > 0 && (
                    <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                      {week.topics.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  )}
                  {Array.isArray(week.objectives) && week.objectives.length > 0 && (
                    <p className="mt-2 text-sm text-gray-500">{t.objectives} {week.objectives.join('; ')}</p>
                  )}
                  {week.notes && <p className="mt-1 text-xs text-gray-400">{week.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'people' ? (
        <div className="space-y-6">
          {/* Teachers Section */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-100 p-4 sm:p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{t.teachers}</h2>
                <p className="text-sm text-gray-500">
                  {teachers.length === 1 ? interpolateDetail(t.teachersCount, { count: 1 }) : interpolateDetail(t.teachersCount_other, { count: teachers.length })}
                </p>
              </div>
            </div>

            {teachers.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <GraduationCap className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{t.noTeachersAssigned}</h3>
                <p className="text-sm text-gray-500">
                  {t.teachersWillAppear}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 p-4 sm:p-5 sm:grid-cols-2 lg:grid-cols-3">
                {teachers.map((teacher) => {
                  const displayName = teacher.full_name?.trim() || teacher.email || t.teacher
                  return (
                  <div key={teacher.id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 hover:bg-gray-100 transition-colors">
                    <Avatar
                      src={teacher.avatar_url}
                      name={displayName}
                      size="lg"
                      className="flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate">
                          {teacher.full_name || t.teacher}
                        </p>
                        {teacher.is_primary && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {t.primary}
                          </span>
                        )}
                        {teacher.role && !teacher.is_primary && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700 capitalize">
                            {teacher.role}
                          </span>
                        )}
                      </div>
                      {teacher.email && (
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {teacher.email}
                        </p>
                      )}
                      {classData.subject && !teacher.email && (
                        <p className="text-sm text-gray-500 mt-1">{classData.subject}</p>
                      )}
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Students Section */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-100 p-4 sm:p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{t.students}</h2>
                <p className="text-sm text-gray-500">
                  {enrolledStudents.length === 1 ? interpolateDetail(t.studentsCount, { count: 1 }) : interpolateDetail(t.studentsCount_other, { count: enrolledStudents.length })}
                </p>
              </div>
            </div>

            {enrolledStudents.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{t.noStudentsEnrolled}</h3>
                <p className="text-sm text-gray-500">
                  {t.studentsWillAppear}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 p-4 sm:p-5 sm:grid-cols-2 lg:grid-cols-3">
                {enrolledStudents.map((enrollment) => {
                  const displayName = enrollment.student?.full_name?.trim() || enrollment.student?.email || t.studentLabel
                  return (
                  <div key={enrollment.id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 hover:bg-gray-100 transition-colors">
                    <Avatar
                      src={enrollment.student?.avatar_url}
                      name={displayName}
                      size="md"
                      className="flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate text-sm">
                        {displayName}
                      </p>
                      {enrollment.student?.email && (
                        <p className="text-xs text-gray-500 truncate">
                          {enrollment.student.email}
                        </p>
                      )}
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Teacher Filter */}
          {teachers.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-gray-700">{t.filterByTeacher}</label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setSelectedTeacherFilter('all')}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                      selectedTeacherFilter === 'all'
                        ? 'bg-green-100 text-green-700 shadow-sm'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    {t.allTeachers}
                  </button>
                  {teachers.map((teacher) => (
                    <button
                      key={teacher.id}
                      onClick={() => setSelectedTeacherFilter(teacher.id)}
                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                        selectedTeacherFilter === teacher.id
                          ? 'bg-green-100 text-green-700 shadow-sm'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium flex-shrink-0 ${
                        selectedTeacherFilter === teacher.id
                          ? 'bg-green-200 text-green-800'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {teacher.full_name?.charAt(0).toUpperCase() || 'T'}
                      </div>
                      {teacher.full_name || t.teacher}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Exams Section */}
      {filteredExams.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-100 p-4 sm:p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t.availableExams}</h2>
              <p className="text-sm text-gray-500">{sharedExams.length === 1 ? interpolateDetail(t.examsCount, { count: 1 }) : interpolateDetail(t.examsCount_other, { count: sharedExams.length })}</p>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredExams.map((exam) => {
                const isCompleted = exam.has_submitted
                const isAvailable = exam.is_published
                
                return (
                  <Link
                    key={exam.id}
                    href={`/student/exams/${exam.id}`}
                    className="group rounded-lg border border-gray-200 bg-white p-4 hover:border-green-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${
                        isCompleted 
                          ? 'bg-blue-100 text-blue-600' 
                          : isAvailable 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <FileText className="h-5 w-5" />
                      </div>
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                          <CheckCircle className="h-3 w-3" />
                          {exam.submission_score !== null && exam.submission_score !== undefined
                            ? `${exam.submission_score}%`
                            : t.done}
                        </span>
                      ) : isAvailable ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                          {t.available}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700">
                          {t.draft}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">
                      {exam.title}
                    </h3>
                    {exam.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 mb-2">{exam.description}</p>
                    )}
                    {exam.creator && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-medium flex-shrink-0">
                          {exam.creator.full_name?.charAt(0).toUpperCase() || 'T'}
                        </div>
                        <span className="text-xs text-gray-500">{t.createdBy} {exam.creator.full_name || t.teacher}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {exam.question_count ?? 0} {t.questions}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {exam.duration_minutes ?? 60} {t.min}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Documents Section */}
      {filteredDocuments.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-100 p-4 sm:p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t.documents}</h2>
              <p className="text-sm text-gray-500">{filteredDocuments.length === 1 ? interpolateDetail(t.documentsCount, { count: 1 }) : interpolateDetail(t.documentsCount_other, { count: filteredDocuments.length })}</p>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="space-y-3">
              {filteredDocuments.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.file_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 hover:border-green-300 hover:shadow-md transition-all group"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600 flex-shrink-0">
                    <FolderOpen className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors truncate">
                      {doc.title}
                    </h3>
                    {doc.description && (
                      <p className="text-sm text-gray-500 line-clamp-1 mt-1">{doc.description}</p>
                    )}
                    {doc.creator && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-medium flex-shrink-0">
                          {doc.creator.full_name?.charAt(0).toUpperCase() || 'T'}
                        </div>
                        <span className="text-xs text-gray-500">{t.createdBy} {doc.creator.full_name || t.teacher}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      {doc.file_type && (
                        <span className="uppercase">{doc.file_type}</span>
                      )}
                      {doc.file_size && (
                        <span>{(doc.file_size / 1024 / 1024).toFixed(2)} MB</span>
                      )}
                      <span>
                        {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lessons Section */}
      {filteredLessons.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-100 p-4 sm:p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <PlayCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t.lessons}</h2>
              <p className="text-sm text-gray-500">{sharedLessons.length === 1 ? interpolateDetail(t.lessonsCount, { count: 1 }) : interpolateDetail(t.lessonsCount_other, { count: sharedLessons.length })}</p>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredLessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/student/lessons/${lesson.id}`}
                  className="group rounded-lg border border-gray-200 bg-white p-4 hover:border-green-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 flex-shrink-0">
                      <PlayCircle className="h-5 w-5" />
                    </div>
                    {lesson.is_published ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                        {t.available}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700">
                        {t.draft}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">
                    {lesson.title}
                  </h3>
                  {lesson.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-2">{lesson.description}</p>
                  )}
                  {lesson.creator && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs font-medium flex-shrink-0">
                        {lesson.creator.full_name?.charAt(0).toUpperCase() || 'T'}
                      </div>
                      <span className="text-xs text-gray-500">{t.createdBy} {lesson.creator.full_name || t.teacher}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {lesson.topic && (
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5" />
                        {lesson.topic}
                      </span>
                    )}
                    {lesson.duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {lesson.duration_minutes} min
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

          {/* Empty State */}
          {filteredExams.length === 0 && filteredDocuments.length === 0 && filteredLessons.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 sm:p-12 text-center">
              <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gray-100 flex items-center justify-center mb-4 sm:mb-6">
                <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{t.noContentYet}</h3>
              <p className="text-sm sm:text-base text-gray-500 max-w-md mx-auto">
                {t.noContentHint}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
