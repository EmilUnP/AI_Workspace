'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { 
  ArrowLeft, 
  BookOpen, 
  Clock,
  CheckCircle,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Target,
  FileQuestion,
  Award,
  Menu,
  X,
  PlayCircle,
  CheckCircle2,
} from 'lucide-react'
import { LessonTabs, AudioPlayer, type Example } from '@eduator/ui'

interface CourseRunClientProps {
  course: {
    id: string
    title: string
    description: string | null
    access_code: string
  }
  lessons: Array<{
    id: string
    title: string
    description: string | null
    topic: string | null
    duration_minutes: number | null
    content: unknown
    learning_objectives: string[] | null
    images: unknown
    mini_test: unknown
    metadata: unknown
    audio_url: string | null
  }>
  finalExamId?: string
}

interface LessonTime {
  lessonId: string
  startTime: number
  totalTime: number
  completed: boolean
}

export function CourseRunClient({ course, lessons, finalExamId }: CourseRunClientProps) {
  const t = useTranslations('teacherCourseRun')
  const tLesson = useTranslations('teacherLessonDetail')
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [lessonTimes, setLessonTimes] = useState<Map<string, LessonTime>>(new Map())
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set())
  const [currentTime, setCurrentTime] = useState<number>(0) // For real-time updates
  const startTimeRef = useRef<number>(Date.now())
  
  // Initialize lesson times
  useEffect(() => {
    const times = new Map<string, LessonTime>()
    lessons.forEach(lesson => {
      times.set(lesson.id, {
        lessonId: lesson.id,
        startTime: 0,
        totalTime: 0,
        completed: false,
      })
    })
    setLessonTimes(times)
  }, [lessons])
  
  // Track time when lesson changes
  useEffect(() => {
    const currentLesson = lessons[currentLessonIndex]
    if (!currentLesson) return
    
    const now = Date.now()
    
    // Save previous lesson time
    if (startTimeRef.current > 0 && currentLessonIndex > 0) {
      const prevLesson = lessons[currentLessonIndex - 1]
      const elapsed = now - startTimeRef.current
      setLessonTimes(prev => {
        const updated = new Map(prev)
        const updatedTime = updated.get(prevLesson.id)
        if (updatedTime) {
          updated.set(prevLesson.id, {
            ...updatedTime,
            totalTime: updatedTime.totalTime + elapsed,
          })
        }
        return updated
      })
    }
    
    // Start tracking current lesson
    startTimeRef.current = now
    setLessonTimes(prev => {
      const updated = new Map(prev)
      const currentTime = updated.get(currentLesson.id)
      if (currentTime && currentTime.startTime === 0) {
        updated.set(currentLesson.id, {
          ...currentTime,
          startTime: now,
        })
      }
      return updated
    })
    
    // Update current time immediately when lesson changes
    setCurrentTime(getCurrentLessonTime())
  // eslint-disable-next-line react-hooks/exhaustive-deps -- getCurrentLessonTime reads from state/refs, omit to avoid stale closure
  }, [currentLessonIndex, lessons])
  
  // Format time helper
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }
  
  // Get current lesson time
  const getCurrentLessonTime = (): number => {
    const currentLesson = lessons[currentLessonIndex]
    if (!currentLesson) return 0
    
    const lessonTime = lessonTimes.get(currentLesson.id)
    if (!lessonTime) return 0
    
    const baseTime = lessonTime.totalTime
    if (startTimeRef.current > 0 && lessonTime.startTime > 0) {
      return baseTime + (Date.now() - startTimeRef.current)
    }
    return baseTime
  }
  
  // Real-time time update effect
  useEffect(() => {
    // Update immediately when lesson changes
    const updateTime = () => setCurrentTime(getCurrentLessonTime())
    updateTime()
    
    // Then update every second
    const interval = setInterval(updateTime, 1000) // Update every second
    
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- getCurrentLessonTime reads from refs/state, omit to avoid resetting interval every second
  }, [currentLessonIndex])
  
  // Mark lesson as completed
  const markLessonComplete = (lessonId: string) => {
    setCompletedLessons(prev => new Set(prev).add(lessonId))
    // Save time
    const now = Date.now()
    if (startTimeRef.current > 0) {
      const elapsed = now - startTimeRef.current
      setLessonTimes(prev => {
        const updated = new Map(prev)
        const updatedTime = updated.get(lessonId)
        if (updatedTime) {
          updated.set(lessonId, {
            ...updatedTime,
            totalTime: updatedTime.totalTime + elapsed,
            completed: true,
          })
        }
        return updated
      })
      startTimeRef.current = 0
    }
  }
  
  // Calculate progress
  const progress = lessons.length > 0 ? (completedLessons.size / lessons.length) * 100 : 0
  const allLessonsCompleted = completedLessons.size === lessons.length
  
  if (lessons.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('noLessonsAvailable')}</h2>
            <p className="text-gray-500 mb-6">{t('noLessonsYet')}</p>
            <Link
              href={`/teacher/courses/${course.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('backToCourse')}
            </Link>
          </div>
        </div>
      </div>
    )
  }
  
  const currentLesson = lessons[currentLessonIndex]
  const hasPrevious = currentLessonIndex > 0
  const hasNext = currentLessonIndex < lessons.length - 1
  
  // Extract content text
  const contentText = typeof currentLesson.content === 'object' && currentLesson.content && 'text' in currentLesson.content 
    ? (currentLesson.content as { text: string }).text 
    : typeof currentLesson.content === 'string' 
      ? currentLesson.content 
      : ''
  
  // Parse images and mini test
  const images = Array.isArray(currentLesson.images) ? currentLesson.images : []
  const miniTest = Array.isArray(currentLesson.mini_test) ? currentLesson.mini_test : []
  const examples: Example[] = (currentLesson.metadata as { examples?: Example[] } | null | undefined)?.examples ?? []
  const objectives = Array.isArray(currentLesson.learning_objectives) ? currentLesson.learning_objectives : []
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar — not sticky so it doesn't block app header / UserNav or stack with audio */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-12 min-h-12 gap-2">
            <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 rounded-md hover:bg-gray-100 transition-colors lg:hidden flex-shrink-0"
                aria-label={sidebarOpen ? t('closeMenu') : t('openMenu')}
              >
                {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
              <Link
                href={`/teacher/courses/${course.id}`}
                className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">{t('backToCourse')}</span>
              </Link>
              <div className="hidden sm:block h-4 w-px bg-gray-200 flex-shrink-0" />
              <div className="flex items-center gap-1.5 min-w-0">
                <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <h1 className="text-sm font-medium text-gray-900 truncate min-w-0">
                  {course.title}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(currentTime || getCurrentLessonTime())}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar - Lesson Navigation */}
        <aside className={`
          fixed lg:sticky top-0 left-0 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 z-30
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          w-80 overflow-y-auto
        `}>
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">{t('courseContent')}</h2>
              <div className="text-xs text-gray-500 mb-3">
                {t('lessonsCompleted', { completed: completedLessons.size, total: lessons.length })}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            
            <nav className="space-y-1">
              {lessons.map((lesson, index) => {
                const isActive = index === currentLessonIndex
                const isCompleted = completedLessons.has(lesson.id)
                const lessonTime = lessonTimes.get(lesson.id)
                // Calculate time spent - include current elapsed time if this is the active lesson
                let timeSpent = lessonTime ? lessonTime.totalTime : 0
                if (isActive) {
                  // Use currentTime state for real-time updates on active lesson
                  timeSpent = currentTime || (lessonTime ? lessonTime.totalTime : 0)
                }
                const timeSpentFormatted = formatTime(timeSpent)
                
                return (
                  <button
                    key={lesson.id}
                    onClick={() => {
                      setCurrentLessonIndex(index)
                      setSidebarOpen(false)
                    }}
                    className={`
                      w-full text-left p-3 rounded-lg transition-all
                      ${isActive 
                        ? 'bg-blue-50 border-2 border-blue-500 shadow-sm' 
                        : 'hover:bg-gray-50 border-2 border-transparent'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`
                        flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 mt-0.5
                        ${isActive 
                          ? 'bg-blue-600 text-white' 
                          : isCompleted 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-200 text-gray-600'
                        }
                      `}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <span className="text-xs font-semibold">{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`
                            text-sm font-medium truncate
                            ${isActive ? 'text-blue-900' : 'text-gray-900'}
                          `}>
                            {lesson.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>{lesson.duration_minutes || 0} {t('min')}</span>
                          {(timeSpent > 0 || isActive) && (
                            <>
                              <span>•</span>
                              <span>{t('spent', { time: timeSpentFormatted })}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </nav>
            
            {/* Final Exam */}
            {finalExamId && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <Link
                  href={`/teacher/exams/${finalExamId}`}
                  className={`
                    w-full text-left p-3 rounded-lg transition-all flex items-center gap-3
                    ${allLessonsCompleted 
                      ? 'bg-purple-50 border-2 border-purple-500 hover:bg-purple-100' 
                      : 'bg-gray-50 border-2 border-gray-200 opacity-60 cursor-not-allowed'
                    }
                  `}
                  onClick={(e) => {
                    if (!allLessonsCompleted) {
                      e.preventDefault()
                    }
                  }}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex-shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{t('finalExam')}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {allLessonsCompleted ? t('readyToTake') : t('completeAllLessonsFirst')}
                    </p>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {/* Lesson Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-start gap-4 mb-4">
                <div className={`
                  flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0
                  ${completedLessons.has(currentLesson.id) 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-blue-100 text-blue-700'
                  }
                `}>
                  {completedLessons.has(currentLesson.id) ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <PlayCircle className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-500">
                      {t('lessonOrdinal', { current: currentLessonIndex + 1, total: lessons.length })}
                    </span>
                    {!completedLessons.has(currentLesson.id) && (
                      <button
                        onClick={() => markLessonComplete(currentLesson.id)}
                        className="ml-auto px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {t('markComplete')}
                      </button>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentLesson.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {currentLesson.duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {currentLesson.duration_minutes} {t('minutes')}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {t('timeSpent')} {formatTime(currentTime || getCurrentLessonTime())}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Learning Objectives */}
              {objectives.length > 0 && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200">
                  <h3 className="font-semibold text-emerald-800 mb-2 flex items-center gap-2 text-sm">
                    <Target className="w-4 h-4" />
                    Learning Objectives
                  </h3>
                  <ul className="space-y-1.5">
                    {objectives.map((objective: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-emerald-700 text-sm">
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {/* Audio Player — sticky so it stays visible while scrolling */}
            {currentLesson.audio_url && (
              <AudioPlayer audioUrl={currentLesson.audio_url} title={currentLesson.title} sticky />
            )}
            
            {/* Lesson Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-6">
<LessonTabs
                content={contentText}
                images={images}
                miniTest={miniTest}
                examples={examples}
                centerText={(currentLesson.metadata as { generation_options?: { centerText?: boolean } } | null)?.generation_options?.centerText ?? false}
                labels={{
                  tabContent: tLesson('tabContent'),
                  tabExamples: tLesson('tabExamples'),
                  tabMiniTest: tLesson('tabMiniTest'),
                  chooseBestAnswers: tLesson('chooseBestAnswers'),
                  checkAnswers: tLesson('checkAnswers'),
                  tryAgain: tLesson('tryAgain'),
                  scoreLabel: tLesson('scoreLabel'),
                  noExamples: tLesson('noExamples'),
                  noTestQuestions: tLesson('noTestQuestions'),
                  contentsLabel: tLesson('contentsLabel'),
                  expand: tLesson('expand'),
                  collapse: tLesson('collapse'),
                  fullScreen: tLesson('fullScreen'),
                }}
              />
            </div>
            
            {/* Final Exam Section */}
            {finalExamId && currentLessonIndex === lessons.length - 1 && allLessonsCompleted && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl shadow-sm border-2 border-purple-200 p-6 sm:p-8 mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Award className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <FileQuestion className="w-5 h-5 text-purple-600" />
                      {t('finalExam')}
                    </h3>
                    <p className="text-gray-700 mb-4">
                      {t('examMasteryMessage')} {t('examPassingMessage')}
                    </p>
                    <Link
                      href={`/teacher/exams/${finalExamId}`}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-sm"
                    >
                      <FileQuestion className="w-5 h-5" />
                      {t('takeFinalExam')}
                    </Link>
                  </div>
                </div>
              </div>
            )}
            
            {/* Navigation */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => setCurrentLessonIndex(Math.max(0, currentLessonIndex - 1))}
                disabled={!hasPrevious}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                  hasPrevious
                    ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
                {t('previous')}
              </button>
              
              <button
                onClick={() => {
                  if (hasNext) {
                    setCurrentLessonIndex(Math.min(lessons.length - 1, currentLessonIndex + 1))
                  } else if (allLessonsCompleted && finalExamId) {
                    // Navigate to exam (with return context so Back goes to course run)
                    window.location.href = `/teacher/exams/${finalExamId}?fromCourse=${course.id}&fromRun=1`
                  }
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                  hasNext || (allLessonsCompleted && finalExamId)
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {hasNext ? (
                  <>
                    {t('next')}
                    <ChevronRight className="w-5 h-5" />
                  </>
                ) : allLessonsCompleted && finalExamId ? (
                  <>
                    {t('takeFinalExam')}
                    <Award className="w-5 h-5" />
                  </>
                ) : (
                  t('complete')
                )}
              </button>
            </div>
          </div>
        </main>
      </div>
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
