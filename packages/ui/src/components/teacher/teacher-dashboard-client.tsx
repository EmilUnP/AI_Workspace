'use client'

import Link from 'next/link'
import Image from 'next/image'
import { 
  FileText, 
  GraduationCap, 
  FolderOpen, 
  Clock, 
  CheckCircle, 
  Eye,
  ArrowRight,
  Plus,
  Upload,
  Sparkles
} from 'lucide-react'
import { DashboardHeader } from './dashboard-header'
import { DashboardStatCard } from './dashboard-stat-card'
import { formatFileSize } from '../../utils/teacher-dashboard'
import { LANGUAGES_WITH_FLAGS, LANGUAGE_TO_COUNTRY_CODE, SUPPORTED_LANGUAGES } from '@eduator/config/constants'

export interface TeacherDashboardTranslations {
  goodMorning: string
  goodAfternoon: string
  goodEvening: string
  teacher: string
  newExam: string
  uploadDocument: string
  lessonsLink: string
  classes: string
  exams: string
  nPublished: string
  documents: string
  lessonsLabel: string
  students: string
  inNClasses: string
  atAGlance: string
  publishedExamsReady: string
  activeStudents: string
  documentsInLibrary: string
  getStarted: string
  recentExams: string
  yourLatestExams: string
  viewAll: string
  all: string
  noExamsYet: string
  createFirstExam: string
  nQuestions: string
  published: string
  draft: string
  recentDocuments: string
  yourUploadedFiles: string
  noDocumentsYet: string
  uploadFirstDocument: string
  openFile: string
  openDocumentLibrary: string
  yourClasses: string
  classesYouTeach: string
  noClassesYet: string
  contactAdmin: string
  createFirstClass: string
  inactive: string
  view: string
  today: string
  yesterday: string
  nDaysAgo: string
}

const DEFAULT_TRANSLATIONS: TeacherDashboardTranslations = {
  goodMorning: 'Good morning',
  goodAfternoon: 'Good afternoon',
  goodEvening: 'Good evening',
  teacher: 'Teacher',
  newExam: 'New exam',
  uploadDocument: 'Upload document',
  lessonsLink: 'Lessons',
  classes: 'Classes',
  exams: 'Exams',
  nPublished: '#N# published',
  documents: 'Documents',
  lessonsLabel: 'Lessons',
  students: 'Students',
  inNClasses: 'in #N# class(es)',
  atAGlance: 'At a glance:',
  publishedExamsReady: '#N# published exam(s) ready for students',
  activeStudents: '#N# active student(s) across your classes',
  documentsInLibrary: '#N# document(s) in your library',
  getStarted: 'Get started by creating an exam, uploading documents, or generating lessons.',
  recentExams: 'Recent Exams',
  yourLatestExams: 'Your latest exams',
  viewAll: 'View all',
  all: 'All',
  noExamsYet: 'No exams yet',
  createFirstExam: 'Create your first exam →',
  nQuestions: '#N# question(s)',
  published: 'Published',
  draft: 'Draft',
  recentDocuments: 'Recent Documents',
  yourUploadedFiles: 'Your uploaded files',
  noDocumentsYet: 'No documents yet',
  uploadFirstDocument: 'Upload your first document →',
  openFile: 'Open file',
  openDocumentLibrary: 'Open document library',
  yourClasses: 'Your Classes',
  classesYouTeach: 'Classes you\'re teaching',
  noClassesYet: 'No classes assigned yet',
  contactAdmin: 'Contact your school admin to be assigned to classes',
  createFirstClass: 'Create your first class →',
  inactive: 'Inactive',
  view: 'View →',
  today: 'Today',
  yesterday: 'Yesterday',
  nDaysAgo: '#N# days ago',
}

export interface Exam {
  id: string
  title: string
  description?: string | null
  is_published: boolean
  created_at: string
  questions?: unknown[]
  language?: string
  translations?: Record<string, unknown>
}

export interface Document {
  id: string
  title: string
  file_type: string
  file_size: number
  created_at: string
  file_url: string
}

export interface ClassData {
  id: string
  name: string
  class_code: string | null
  description: string | null
  is_active: boolean
  created_at: string
}

export interface TeacherDashboardStats {
  classes: number
  exams: number
  publishedExams: number
  lessons: number
  documents: number
  students: number
}

export interface TeacherDashboardClientProps {
  profile: {
    full_name?: string | null
  }
  organization?: {
    name?: string | null
  } | null
  stats: TeacherDashboardStats
  recentExams: Exam[]
  recentDocuments: Document[]
  recentClasses: ClassData[]
  variant?: 'erp'
  translations?: Partial<TeacherDashboardTranslations>
}

export function TeacherDashboardClient({
  profile,
  organization,
  stats,
  recentExams,
  recentDocuments,
 
  variant = 'erp',
  translations: translationsProp
}: TeacherDashboardClientProps) {
  const isERP = variant === 'erp'
  const t = { ...DEFAULT_TRANSLATIONS, ...translationsProp }

  function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return t.goodMorning
    if (hour < 18) return t.goodAfternoon
    return t.goodEvening
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return t.today
    if (diffDays === 1) return t.yesterday
    if (diffDays < 7) return t.nDaysAgo.replace(/#N#/g, String(diffDays))
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function plural(template: string, n: number): string {
    return template.replace(/#N#/g, String(n))
  }

  const getLanguageDisplay = (language: string) => {
    if (!language) return null

    const languageKey = language.toLowerCase()

    const resolvedLanguageCode =
      SUPPORTED_LANGUAGES.find(
        (l) => l.code === languageKey || l.name.toLowerCase() === languageKey
      )?.code ??
      LANGUAGES_WITH_FLAGS.find(
        (l) => l.code === languageKey || l.name.toLowerCase() === languageKey
      )?.code ??
      languageKey

    const languageInfo = LANGUAGES_WITH_FLAGS.find((l) => l.code === resolvedLanguageCode)
    const countryCode =
      languageInfo?.countryCode ??
      LANGUAGE_TO_COUNTRY_CODE[resolvedLanguageCode] ??
      'un'

    return {
      countryCode: countryCode.toLowerCase(),
      label: languageInfo?.name ?? language,
    }
  }

  const quickActions = (
    <div className="flex flex-wrap gap-2">
      <Link
        href={isERP ? '/teacher/exams/new' : '/teacher/exams/create'}
        className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 backdrop-blur-sm px-3 py-2 text-sm font-medium text-white hover:bg-white/30 transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">{t.newExam}</span>
      </Link>
      <Link
        href="/teacher/documents"
        className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 backdrop-blur-sm px-3 py-2 text-sm font-medium text-white hover:bg-white/30 transition-colors"
      >
        <Upload className="h-4 w-4" />
        <span className="hidden sm:inline">{t.uploadDocument}</span>
      </Link>
      <Link
        href="/teacher/lessons"
        className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 backdrop-blur-sm px-3 py-2 text-sm font-medium text-white hover:bg-white/30 transition-colors"
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">{t.lessonsLink}</span>
      </Link>
    </div>
  )

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header with Gradient + Quick actions */}
      <DashboardHeader
        greeting={getGreeting()}
        name={profile.full_name || t.teacher}
        organizationName={organization?.name || undefined}
        variant={variant}
        quickActions={quickActions}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardStatCard
          href="/teacher/exams"
          label={t.exams}
          value={stats.exams}
          subtitle={stats.publishedExams > 0 ? plural(t.nPublished, stats.publishedExams) : undefined}
          icon={FileText}
          iconBgColor="bg-violet-100"
          iconColor="text-violet-600"
          borderHoverColor="violet-200"
          bgHoverColor="bg-violet-50"
        />

        <DashboardStatCard
          href="/teacher/documents"
          label={t.documents}
          value={stats.documents}
          icon={FolderOpen}
          iconBgColor="bg-amber-100"
          iconColor="text-amber-600"
          borderHoverColor="amber-200"
          bgHoverColor="bg-amber-50"
        />

        <DashboardStatCard
          href="/teacher/lessons"
          label={t.lessonsLabel}
          value={stats.lessons}
          icon={GraduationCap}
          iconBgColor="bg-emerald-100"
          iconColor="text-emerald-600"
          borderHoverColor="emerald-200"
          bgHoverColor="bg-emerald-50"
        />
      </div>

      {/* At a glance */}
      <div className="rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 text-sm text-gray-600">
        <span className="font-medium text-gray-700">{t.atAGlance}</span>{' '}
        {stats.publishedExams > 0 && <span>{plural(t.publishedExamsReady, stats.publishedExams)}</span>}
        {stats.documents > 0 && stats.publishedExams > 0 && ' • '}
        {stats.documents > 0 && <span>{plural(t.documentsInLibrary, stats.documents)}</span>}
        {stats.publishedExams === 0 && stats.documents === 0 && (
          <span>{t.getStarted}</span>
        )}
      </div>

      {/* Recent Content Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Recent Exams */}
        <div className="rounded-xl sm:rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-violet-100 text-violet-600 flex-shrink-0">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">{t.recentExams}</h3>
                <p className="text-xs text-gray-500 hidden sm:block">{t.yourLatestExams}</p>
              </div>
            </div>
            <Link 
              href="/teacher/exams" 
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 flex-shrink-0 ml-2"
            >
              <span className="hidden sm:inline">{t.viewAll}</span>
              <span className="sm:hidden">{t.all}</span>
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Link>
          </div>
          
          <div className="divide-y divide-gray-50">
            {recentExams.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="h-10 w-10 text-gray-300 mx-auto" />
                <p className="mt-2 text-sm text-gray-500">{t.noExamsYet}</p>
                <Link 
                  href="/teacher/exams/new" 
                  className="mt-3 inline-flex text-sm text-blue-600 hover:text-blue-700"
                >
                  {t.createFirstExam}
                </Link>
              </div>
            ) : (
              recentExams.map((exam) => {
                const questionCount = Array.isArray(exam.questions) ? exam.questions.length : 0
                const languages = [exam.language || 'en', ...Object.keys(exam.translations || {})]
                
                return (
                  <Link 
                    key={exam.id} 
                    href={`/teacher/exams/${exam.id}`}
                    className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl flex-shrink-0 ${
                      exam.is_published ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {exam.is_published ? <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" /> : <Clock className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base text-gray-900 truncate">{exam.title}</p>
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-500">{plural(t.nQuestions, questionCount)}</span>
                        {languages.length > 0 && (
                          <>
                            <span className="text-gray-300 hidden sm:inline">•</span>
                            <span className="hidden sm:inline-flex items-center gap-1">
                              {languages.slice(0, 3).map((lang) => {
                                const display = getLanguageDisplay(lang)
                                if (!display) return null
                                return (
                                  <Image
                                    key={lang}
                                    src={`https://flagcdn.com/w40/${display.countryCode}.png`}
                                    alt={display.label}
                                    width={16}
                                    height={12}
                                    className="rounded-sm object-cover flex-shrink-0"
                                    unoptimized
                                  />
                                )
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                        exam.is_published 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {exam.is_published ? t.published : t.draft}
                      </span>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>

        {/* Recent Documents */}
        <div className="rounded-xl sm:rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-amber-100 text-amber-600 flex-shrink-0">
                <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">{t.recentDocuments}</h3>
                <p className="text-xs text-gray-500 hidden sm:block">{t.yourUploadedFiles}</p>
              </div>
            </div>
            <Link 
              href="/teacher/documents" 
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 flex-shrink-0 ml-2"
            >
              <span className="hidden sm:inline">{t.viewAll}</span>
              <span className="sm:hidden">{t.all}</span>
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Link>
          </div>
          
          <div className="divide-y divide-gray-50">
            {recentDocuments.length === 0 ? (
              <div className="p-8 text-center">
                <FolderOpen className="h-10 w-10 text-gray-300 mx-auto" />
                <p className="mt-2 text-sm text-gray-500">{t.noDocumentsYet}</p>
                <Link 
                  href="/teacher/documents" 
                  className="mt-3 inline-flex text-sm text-blue-600 hover:text-blue-700"
                >
                  {t.uploadFirstDocument}
                </Link>
              </div>
            ) : (
              recentDocuments.map((doc) => (
                <div 
                  key={doc.id} 
                  className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-gray-50 transition-colors group/doc"
                >
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/doc flex items-center gap-3 sm:gap-4 min-w-0 flex-1"
                  >
                    <div className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl flex-shrink-0 ${
                      doc.file_type === 'pdf' ? 'bg-red-100 text-red-600' :
                      doc.file_type === 'markdown' ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base text-gray-900 truncate group-hover/doc:text-blue-600">{doc.title}</p>
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-500 uppercase">{doc.file_type}</span>
                        <span className="text-gray-300 hidden sm:inline">•</span>
                        <span className="text-xs text-gray-500">{formatFileSize(doc.file_size)}</span>
                        <span className="text-gray-300 hidden sm:inline">•</span>
                        <span className="text-xs text-gray-500 hidden sm:inline">{formatDate(doc.created_at)}</span>
                      </div>
                    </div>
                  </a>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title={t.openFile}
                    >
                      <Eye className="h-4 w-4" />
                    </a>
                    <Link
                      href="/teacher/documents"
                      className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title={t.openDocumentLibrary}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
