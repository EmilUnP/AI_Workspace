'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { LANGUAGE_TO_COUNTRY_CODE, LANGUAGES_WITH_FLAGS, SUPPORTED_LANGUAGES } from '@eduator/config/constants'
import { updateCourse } from '../../actions'
import type { Course } from '@eduator/core/types/course'

export interface CourseEditFormLabels {
  courseTitleLabel?: string
  descriptionLabel?: string
  subjectLabel?: string
  gradeLevelLabel?: string
  titlePlaceholder?: string
  descriptionPlaceholder?: string
  subjectPlaceholder?: string
  gradeLevelPlaceholder?: string
  save?: string
  saving?: string
  successMessage?: string
  styleSerious?: string
  styleFun?: string
  cancel?: string
  difficultyLevelLabel?: string
  courseStyleLabel?: string
  languageLabel?: string
  accessCodeLabel?: string
  grade1?: string
  grade2?: string
  grade3?: string
  grade4?: string
  grade5?: string
  grade6?: string
  grade7?: string
  grade8?: string
  grade9?: string
  grade10?: string
  grade11?: string
  grade12?: string
  undergraduate?: string
  graduate?: string
  phd?: string
}

interface CourseEditFormProps {
  course: Course
  labels?: CourseEditFormLabels
}

const DEFAULT_LABELS: CourseEditFormLabels = {
  courseTitleLabel: 'Course Title *',
  descriptionLabel: 'Description',
  subjectLabel: 'Subject',
  gradeLevelLabel: 'Grade Level',
  titlePlaceholder: 'Enter course title',
  descriptionPlaceholder: 'Enter course description',
  subjectPlaceholder: 'e.g., Mathematics, Science, History',
  gradeLevelPlaceholder: 'e.g., Grade 5, High School',
  save: 'Save Changes',
  saving: 'Saving...',
  successMessage: 'Course updated successfully! Redirecting...',
  styleSerious: 'Serious & Academic',
  styleFun: 'Fun & Gamified',
  cancel: 'Cancel',
  difficultyLevelLabel: 'Difficulty Level',
  courseStyleLabel: 'Course Style',
  languageLabel: 'Language',
  accessCodeLabel: 'Access Code',
}

export function CourseEditForm({ course, labels = {} }: CourseEditFormProps) {
  const router = useRouter()
  const L = { ...DEFAULT_LABELS, ...labels }
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [title, setTitle] = useState(course.title)
  const [description, setDescription] = useState(course.description || '')
  const [subject, setSubject] = useState(course.subject || '')
  const [gradeLevel, setGradeLevel] = useState(course.grade_level || '')
  
  const getDifficultyLabel = (level: string | null | undefined): string | null => {
    if (!level) return null
    const key = level.replace(/^grade_/, 'grade').replace(/_/g, '') as keyof CourseEditFormLabels
    const label = L[key]
    if (typeof label === 'string') return label
    return level.replace(/_/g, ' ')
  }

  const styleLabels: Record<string, string> = {
    serious_academic: L.styleSerious!,
    fun_gamified: L.styleFun!,
  }

  // Resolve language for flag display (same logic as course detail page)
  const languageKey = (course.language || '').trim().toLowerCase()
  const resolvedLanguageCode =
    SUPPORTED_LANGUAGES.find((l) => l.code === languageKey || l.name.toLowerCase() === languageKey)?.code ??
    LANGUAGES_WITH_FLAGS.find((l) => l.code === languageKey || l.name.toLowerCase() === languageKey)?.code ??
    languageKey
  const languageInfo = LANGUAGES_WITH_FLAGS.find((l) => l.code === resolvedLanguageCode)
  const countryCode = languageInfo?.countryCode || LANGUAGE_TO_COUNTRY_CODE[resolvedLanguageCode] || 'un'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    
    startTransition(async () => {
      const result = await updateCourse(course.id, {
        title: title.trim(),
        description: description.trim() || null,
        subject: subject.trim() || null,
        grade_level: gradeLevel.trim() || null,
      })
      
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/teacher/courses/${course.id}`)
          router.refresh()
        }, 1000)
      }
    })
  }
  
  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800">{L.successMessage}</p>
        </div>
      )}
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      
      <div className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            {L.courseTitleLabel}
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={L.titlePlaceholder}
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            {L.descriptionLabel}
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={L.descriptionPlaceholder}
          />
        </div>
        
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
            {L.subjectLabel}
          </label>
          <input
            type="text"
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={L.subjectPlaceholder}
          />
        </div>
        
        <div>
          <label htmlFor="gradeLevel" className="block text-sm font-medium text-gray-700 mb-2">
            {L.gradeLevelLabel}
          </label>
          <input
            type="text"
            id="gradeLevel"
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={L.gradeLevelPlaceholder}
          />
        </div>
        
        {/* Read-only Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">{L.difficultyLevelLabel ?? 'Difficulty Level'}</label>
            <p className="text-sm text-gray-900">{getDifficultyLabel(course.difficulty_level) ?? course.difficulty_level}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">{L.courseStyleLabel ?? 'Course Style'}</label>
            <p className="text-sm text-gray-900">{styleLabels[course.course_style] || course.course_style}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">{L.languageLabel ?? 'Language'}</label>
            {course.language ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 rounded-sm overflow-hidden flex-shrink-0 bg-gray-100">
                  <Image
                    src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
                    alt={languageInfo?.name || course.language}
                    width={24}
                    height={16}
                    className="object-cover w-6 h-4"
                    unoptimized
                  />
                </div>
                <p className="text-sm text-gray-900">{languageInfo?.name || course.language.toUpperCase()}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-900">—</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">{L.accessCodeLabel ?? 'Access Code'}</label>
            <p className="text-sm text-gray-900 font-mono">{course.access_code}</p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isPending}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {L.cancel}
          </button>
          <button
            type="submit"
            disabled={isPending || !title.trim()}
            className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {L.saving}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {L.save}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  )
}
