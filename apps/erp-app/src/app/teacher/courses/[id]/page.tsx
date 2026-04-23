import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getTranslations, getLocale } from 'next-intl/server'
import { 
  ArrowLeft, 
  BookOpen, 
  Key,
  Calendar,
  Clock,
  CheckCircle,
  Sparkles,
  GraduationCap,
  FileText,
  Eye,
  Play,
  FileQuestion,
  Award,
} from 'lucide-react'
import { getCourseById } from '../actions'
import { lessonRepository } from '@eduator/db/repositories/lessons'
import { examRepository } from '@eduator/db/repositories/exams'
import { CourseActions } from './course-actions'
import { CourseContentGenerating } from './course-content-generating'
import { LANGUAGE_TO_COUNTRY_CODE, LANGUAGES_WITH_FLAGS, SUPPORTED_LANGUAGES } from '@eduator/config/constants'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { id } = await params
  const [result, t, locale] = await Promise.all([
    getCourseById(id),
    getTranslations('teacherCourseDetail'),
    getLocale(),
  ])
  
  if (result.error || !result.course) {
    notFound()
  }
  
  const course = result.course
  
  // Single query for all lessons (batch fetch)
  const lessons = await lessonRepository.getByIds(course.lesson_ids || [], course.created_by)
  
  // Fetch final exam if it exists
  const finalExamId = course.metadata?.final_exam_id as string | undefined
  const finalExam = finalExamId ? await examRepository.getById(finalExamId) : null
  
  // Get language info for flag display
  const languageKey = course.language.trim().toLowerCase()
  const resolvedLanguageCode =
    SUPPORTED_LANGUAGES.find((l) => l.code === languageKey || l.name.toLowerCase() === languageKey)?.code ??
    LANGUAGES_WITH_FLAGS.find((l) => l.code === languageKey || l.name.toLowerCase() === languageKey)?.code ??
    languageKey

  const languageInfo = LANGUAGES_WITH_FLAGS.find((l) => l.code === resolvedLanguageCode)
  const countryCode = languageInfo?.countryCode || LANGUAGE_TO_COUNTRY_CODE[resolvedLanguageCode] || 'un'
  
  const difficultyLabels: Record<string, string> = {
    grade_1: 'Grade 1',
    grade_2: 'Grade 2',
    grade_3: 'Grade 3',
    grade_4: 'Grade 4',
    grade_5: 'Grade 5',
    grade_6: 'Grade 6',
    grade_7: 'Grade 7',
    grade_8: 'Grade 8',
    grade_9: 'Grade 9',
    grade_10: 'Grade 10',
    grade_11: 'Grade 11',
    grade_12: 'Grade 12',
    undergraduate: 'Undergraduate',
    graduate: 'Graduate',
    phd: 'PhD',
  }
  
  const styleLabels: Record<string, string> = {
    serious_academic: t('styleSerious'),
    fun_gamified: t('styleFun'),
  }
  const typeLabels: Record<string, string> = {
    multiple_choice: t('multipleChoice'),
    multiple_select: t('multipleSelect'),
    fill_blank: t('fillBlank'),
    true_false: t('trueFalse'),
  }
  const questionTypeColors: Record<string, string> = {
    multiple_choice: 'bg-blue-50 text-blue-700 border-blue-200',
    true_false: 'bg-green-50 text-green-700 border-green-200',
    multiple_select: 'bg-purple-50 text-purple-700 border-purple-200',
    fill_blank: 'bg-orange-50 text-orange-700 border-orange-200',
  }
  const difficultyLabelsI18n: Record<string, string> = {
    easy: t('easy'),
    medium: t('medium'),
    hard: t('hard'),
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            <Link
              href="/teacher/courses"
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors mt-1 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-blue-600" />
                {course.title}
              </h1>
              {course.description && (
                <p className="text-gray-500 mt-1 text-sm sm:text-base">{course.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(course.created_at).toLocaleDateString()}
                </span>
                {course.estimated_duration_minutes > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {course.estimated_duration_minutes} min
                  </span>
                )}
                {course.is_published ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    <CheckCircle className="w-3 h-3" />
                    {t('published')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                    <Clock className="w-3 h-3" />
                    {t('unused')}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CourseActions
              courseId={course.id}
              isPublished={course.is_published}
              totalLessons={course.total_lessons ?? 0}
              hasFinalExam={!!finalExamId}
              labels={{
                edit: t('edit'),
                delete: t('delete'),
                editCourseTitle: t('editCourseTitle'),
                deleteCourseTitle: t('deleteCourseTitle'),
                publish: t('publish'),
                unpublish: t('unpublish'),
                publishCourse: t('publishCourse'),
                unpublishCourse: t('unpublishCourse'),
                deleteConfirmTitle: t('deleteConfirmTitle'),
                deleteConfirmWithContent: t('deleteConfirmWithContent', { lessons: '{lessons}', finalExam: '{finalExam}' }),
                deleteConfirmEmpty: t('deleteConfirmEmpty'),
                oneFinalExam: t('oneFinalExam'),
                noFinalExam: t('noFinalExam'),
                cancel: t('cancel'),
                deleting: t('deleting'),
              }}
            />
            <Link
              href={`/teacher/courses/${course.id}/run`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Play className="w-5 h-5" />
              {t('runCourse')}
            </Link>
          </div>
        </div>
        
        {/* Course Info Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{course.total_lessons || 0}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{t('lessons')}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Key className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-bold text-gray-900 font-mono">{course.access_code}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{t('accessCode')}</p>
              </div>
            </div>
          </div>
          
          {course.difficulty_level && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-bold text-gray-900 truncate">
                    {difficultyLabels[course.difficulty_level] || course.difficulty_level}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Level</p>
                </div>
              </div>
            </div>
          )}
          
          {course.language && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <Image
                    src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
                    alt={languageInfo?.name || course.language}
                    width={40}
                    height={30}
                    className="object-cover rounded-sm"
                    unoptimized
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-bold text-gray-900 truncate">
                    {languageInfo?.name || course.language.toUpperCase()}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">
                    {styleLabels[course.course_style] || course.course_style}
                  </p>
                  {(course.subject || course.grade_level) && (
                    <p className="text-xs sm:text-sm text-gray-400 truncate">
                      {course.subject}
                      {course.subject && course.grade_level ? ' · ' : ''}
                      {course.grade_level}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Final Exam Section */}
        {finalExam && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                Final Exam
              </h2>
              <Link
                href={`/teacher/exams/${finalExam.id}?fromCourse=${course.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" />
                View Exam
              </Link>
            </div>
            <div className="space-y-3">
              <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <FileQuestion className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <h3 className="text-base font-semibold text-gray-900 truncate">
                        {finalExam.title}
                      </h3>
                    </div>
                    {finalExam.description && (
                      <p className="text-sm text-gray-600 ml-8 mb-2 line-clamp-2">
                        {finalExam.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 ml-8 mb-3">
                      {finalExam.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {finalExam.duration_minutes} min
                        </span>
                      )}
                      {finalExam.questions && Array.isArray(finalExam.questions) && (
                        <span className="flex items-center gap-1">
                          <FileQuestion className="w-3 h-3" />
                          {finalExam.questions.length} questions
                        </span>
                      )}
                    </div>
                    
                    {/* Question Types Breakdown */}
                    {finalExam.questions && Array.isArray(finalExam.questions) && finalExam.questions.length > 0 && (
                      <div className="ml-8 mb-3">
                        <div className="text-xs font-medium text-gray-700 mb-2">Question Types:</div>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const typeCounts: Record<string, number> = {}
                            finalExam.questions.forEach((q) => {
                              const type = q.type || 'unknown'
                              typeCounts[type] = (typeCounts[type] || 0) + 1
                            })
                            
                            const typeLabels: Record<string, string> = {
                              multiple_choice: 'Multiple Choice',
                              multiple_select: 'Multiple Select',
                              fill_blank: 'Fill in the Blank',
                              true_false: 'True/False',
                            }
                            
                            return Object.entries(typeCounts).map(([type, count]) => (
                              <span
                                key={type}
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border ${questionTypeColors[type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}
                              >
                                {typeLabels[type] || type}: {count}
                              </span>
                            ))
                          })()}
                        </div>
                      </div>
                    )}
                    
                    {/* Difficulty Distribution */}
                    {finalExam.questions && Array.isArray(finalExam.questions) && finalExam.questions.length > 0 && (
                      <div className="ml-8 mb-3">
                        <div className="text-xs font-medium text-gray-700 mb-2">Difficulty Distribution:</div>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const difficultyCounts: Record<string, number> = {}
                            finalExam.questions.forEach((q) => {
                              const difficulty = q.difficulty || 'unknown'
                              difficultyCounts[difficulty] = (difficultyCounts[difficulty] || 0) + 1
                            })
                            
                            const difficultyLabels: Record<string, string> = {
                              easy: 'Easy',
                              medium: 'Medium',
                              hard: 'Hard',
                            }
                            
                            const difficultyColors: Record<string, string> = {
                              easy: 'bg-green-50 text-green-700 border-green-200',
                              medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
                              hard: 'bg-red-50 text-red-700 border-red-200',
                            }
                            
                            return Object.entries(difficultyCounts).map(([difficulty, count]) => (
                              <span
                                key={difficulty}
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border ${
                                  difficultyColors[difficulty] || 'bg-gray-50 text-gray-700 border-gray-200'
                                }`}
                              >
                                {difficultyLabels[difficulty] || difficulty}: {count}
                              </span>
                            ))
                          })()}
                        </div>
                      </div>
                    )}
                    
                    {/* Exam Settings */}
                    {finalExam.settings && (
                      <div className="ml-8">
                        <div className="text-xs font-medium text-gray-700 mb-2">Exam Settings:</div>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                          {finalExam.settings.passing_score && (
                            <span>Passing Score: {finalExam.settings.passing_score}%</span>
                          )}
                          {finalExam.settings.max_attempts && (
                            <span>Max Attempts: {finalExam.settings.max_attempts}</span>
                          )}
                          {finalExam.settings.shuffle_questions && (
                            <span className="text-green-600">Questions Shuffled</span>
                          )}
                          {finalExam.settings.shuffle_options && (
                            <span className="text-green-600">Options Shuffled</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Lessons List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              {t('courseLessons')} ({lessons.length})
            </h2>
          </div>
          
          {lessons.length === 0 ? (
            <CourseContentGenerating
              courseId={course.id}
              courseTitle={course.title}
              totalLessonsExpected={course.total_lessons ?? 0}
              labels={{
                contentGenerating: t('contentGenerating'),
                contentGeneratingMessage: t('contentGeneratingMessage'),
                contentGeneratingHint: t('contentGeneratingHint'),
                refreshPage: t('refreshPage'),
                analyzingLabel: t('analyzingLabel'),
              }}
            />
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson, index) => (
                <Link
                  key={lesson.id}
                  href={`/teacher/lessons/${lesson.id}?fromCourse=${course.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm flex-shrink-0">
                          {index + 1}
                        </span>
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {lesson.title}
                        </h3>
                      </div>
                      {lesson.description && (
                        <p className="text-sm text-gray-600 ml-11 mb-2 line-clamp-2">
                          {lesson.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500 ml-11">
                        {lesson.topic && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {lesson.topic}
                          </span>
                        )}
                        {lesson.duration_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {lesson.duration_minutes} {t('min')}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(lesson.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Eye className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
