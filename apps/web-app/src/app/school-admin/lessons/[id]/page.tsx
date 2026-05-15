import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { getTranslations, getLocale } from 'next-intl/server'
import { getCurrentUser } from '@/lib/backend-auth'
import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'
import { mapLessonToViewData } from '@/lib/lesson-view-data'
import { LessonTabsClient } from './lesson-tabs-client'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Image as ImageIcon, 
  FileQuestion, 
  Calendar,
  Clock,
  Target,
  BookOpen,
} from 'lucide-react'
import { LessonActions } from '@eduator/ui'
import { updateLesson, regenerateAudio, deleteLesson } from '../actions'
import { AudioPlayer } from './audio-player'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ fromCourse?: string; fromRun?: string }>
}

type LessonRecord = {
  id: string
  title: string
  topic?: string | null
  description?: string | null
  created_at: string
  duration_minutes?: number | null
  audio_url?: string | null
  content?: unknown
  images?: unknown
  mini_test?: unknown
  metadata?: { generation_options?: { centerText?: boolean } } | null
  learning_objectives?: unknown
  documents?: { title?: string } | Array<{ title?: string }> | null
}

const LessonActionsAny = LessonActions as any

async function getTeacherInfo() {
  const user = await getCurrentUser()
  if (!user) return null
  if (user.role !== 'operator' && user.role !== 'admin') return null
  return { teacherId: user.id, organizationId: 'global' }
}

async function getLesson(lessonId: string): Promise<LessonRecord | null> {
  const token = (await cookies()).get('access_token')?.value
  if (!token) return null

  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'
  const response = await fetch(`${backendBase}/v1/lessons/${lessonId}`, {
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store',
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    console.error('Error fetching lesson:', payload.error || `HTTP ${response.status}`)
    return null
  }

  const payload = (await response.json()) as { lesson?: LessonRecord }
  const lesson = payload.lesson
  if (!lesson) return null
  if (typeof lesson.audio_url === 'string' && lesson.audio_url.startsWith('/v1/')) {
    if (lesson.audio_url.startsWith('/v1/lessons/')) {
      const mediaMatch = lesson.audio_url.match(/^\/v1\/lessons\/([^/]+)\/media\/([^/?#]+)$/)
      if (mediaMatch) {
        const [, lessonId, fileName] = mediaMatch
        lesson.audio_url = `/api/school-admin/lessons/${lessonId}/media/${fileName}`
      } else {
        lesson.audio_url = `${backendBase.replace(/\/+$/, '')}${lesson.audio_url}`
      }
    } else {
      lesson.audio_url = `${backendBase.replace(/\/+$/, '')}${lesson.audio_url}`
    }
  }
  return lesson
}

export default async function LessonDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { fromCourse: _fromCourse, fromRun: _fromRun } = await searchParams
  const teacherData = await getTeacherInfo()
  if (!teacherData) {
    redirect('/school-admin/lessons')
  }
  const [lesson, t, locale] = await Promise.all([
    getLesson(id),
    getTranslations('teacherLessonDetail'),
    getLocale(),
  ])
  const tl = (key: string, fallback: string, values?: Record<string, string | number>) => {
    const value = t(key as never, values as never)
    return value === key ? fallback : value
  }

  if (!lesson) {
    notFound()
  }
  
  const { contentText, images, miniTest, objectives, centerText } = mapLessonToViewData(lesson)
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            <Link
              href="/school-admin/lessons"
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors mt-1 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{lesson.title}</h1>
              {lesson.topic && (
                <p className="text-gray-500 mt-1 text-sm sm:text-base">{tl('topicLabel', 'Topic:')} {lesson.topic}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(lesson.created_at).toLocaleDateString(locale)}
                </span>
                {lesson.duration_minutes && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {lesson.duration_minutes} {tl('minuteShort', 'min')}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    lesson.audio_url ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  {lesson.audio_url ? tl('audioReady', 'Audio ready') : tl('audioProcessing', 'Audio processing')}
                </span>
              </div>
              {lesson.documents && (
                <div className="mt-3 text-sm text-gray-500">
                  <span className="font-medium">{tl('sourceDocument', 'Source document:')}</span>{' '}
                  {Array.isArray(lesson.documents) ? lesson.documents[0]?.title : lesson.documents.title}
                </div>
              )}
            </div>
          </div>
          
          <div className="ml-14 sm:ml-0">
              <LessonActionsAny
                lessonId={lesson.id}
                title={lesson.title}
                topic={lesson.topic}
                description={lesson.description}
                content={contentText}
                durationMinutes={lesson.duration_minutes}
                hasAudio={!!lesson.audio_url}
                onUpdateLesson={updateLesson}
                onRegenerateAudio={regenerateAudio}
                onDeleteLesson={deleteLesson}
                labels={{
                  edit: tl('edit', 'Edit'),
                  generateAudio: tl('generateAudio', 'Generate audio'),
                  regenerateAudio: tl('regenerateAudio', 'Regenerate audio'),
                  deleteLesson: tl('deleteLesson', 'Delete lesson'),
                  editLesson: tl('editLesson', 'Edit lesson'),
                  cancel: tl('cancel', 'Cancel'),
                  saveChanges: tl('saveChanges', 'Save changes'),
                  saving: tl('saving', 'Saving...'),
                  titleLabel: tl('titleLabel', 'Title'),
                  topicLabel: tl('topicLabelForm', 'Topic'),
                  descriptionLabel: tl('descriptionLabel', 'Description'),
                  durationLabel: tl('durationLabel', 'Duration'),
                  contentLabel: tl('contentLabel', 'Content'),
                  titlePlaceholder: tl('titlePlaceholder', 'Lesson title'),
                  topicPlaceholder: tl('topicPlaceholder', 'Lesson topic'),
                  descriptionPlaceholder: tl('descriptionPlaceholder', 'Short description'),
                  contentPlaceholder: tl('contentPlaceholder', 'Lesson content'),
                  deleteConfirmTitle: tl('deleteConfirmTitle', 'Delete lesson?'),
                  deleteConfirmMessage: tl('deleteConfirmMessage', `Are you sure you want to delete "${lesson.title}"?`, { title: lesson.title }),
                  deleting: tl('deleting', 'Deleting...'),
                }}
              />
          </div>
        </div>
        
        {/* Audio Player — sticky so it stays visible while scrolling */}
        {lesson.audio_url && (
          <AudioPlayer audioUrl={lesson.audio_url} title={lesson.title} sticky />
        )}
        
        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-gray-700" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{lesson.duration_minutes || 45}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{tl('minutes', 'minutes')}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <ImageIcon className="w-5 h-5 text-gray-700" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{images.length}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{tl('images', 'images')}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <FileQuestion className="w-5 h-5 text-gray-700" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{miniTest.length}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{tl('questions', 'questions')}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-gray-700" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{objectives.length}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{tl('objectives', 'objectives')}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Learning Objectives */}
        {objectives.length > 0 && (
          <div className="bg-white rounded-xl p-4 sm:p-5 mb-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Target className="w-5 h-5" />
              {tl('learningObjectives', 'Learning objectives')}
            </h3>
            <ul className="space-y-2">
              {objectives.map((objective: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-gray-700">
                  <Target className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="text-sm sm:text-base">{objective}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Tabbed Content */}
        <LessonTabsClient
          content={contentText} 
          images={images} 
          miniTest={miniTest} 
          centerText={centerText}
          labels={{
            tabContent: tl('tabContent', 'Content'),
            tabMiniTest: tl('tabMiniTest', 'Mini test'),
            chooseBestAnswers: tl('chooseBestAnswers', 'Choose the best answers'),
            checkAnswers: tl('checkAnswers', 'Check answers'),
            tryAgain: tl('tryAgain', 'Try again'),
            scoreLabel: tl('scoreLabel', 'Score'),
            noTestQuestions: tl('noTestQuestions', 'No test questions'),
          }}
        />
        
      </div>
    </div>
  )
}

