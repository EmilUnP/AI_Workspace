import { createClient } from '@eduator/auth/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getTranslations, getLocale } from 'next-intl/server'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Image as ImageIcon, 
  FileQuestion, 
  Calendar,
  CheckCircle,
  Clock,
  Target,
  BookOpen,
} from 'lucide-react'
import { LessonTabs, AudioPlayer, LessonActions } from '@eduator/ui'
import { updateLesson, regenerateAudio, deleteLesson } from '../actions'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ fromCourse?: string; fromRun?: string }>
}

async function getTeacherInfo() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single()
  
  if (!profile?.organization_id) return null
  
  return { teacherId: profile.id, organizationId: profile.organization_id }
}

async function getLesson(lessonId: string, teacherId: string) {
  const supabase = await createClient()
  
  const { data: lesson, error } = await supabase
    .from('lessons')
    .select(`
      *,
      classes(id, name, class_code),
      documents(id, title, file_type)
    `)
    .eq('id', lessonId)
    .eq('created_by', teacherId)
    .single()
  
  if (error) {
    console.error('Error fetching lesson:', error)
    return null
  }
  
  return lesson
}

export default async function LessonDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { fromCourse: _fromCourse, fromRun: _fromRun } = await searchParams
  const teacherData = await getTeacherInfo()
  if (!teacherData) {
    redirect('/auth/login')
  }
  const { teacherId } = teacherData
  const [lesson, t, locale] = await Promise.all([
    getLesson(id, teacherId),
    getTranslations('teacherLessonDetail'),
    getLocale(),
  ])
  if (!lesson) {
    notFound()
  }
  
  // Extract content text
  const contentText = typeof lesson.content === 'object' && lesson.content && 'text' in lesson.content 
    ? (lesson.content as { text: string }).text 
    : typeof lesson.content === 'string' 
      ? lesson.content 
      : ''
  
  // Parse images and mini test
  const images = Array.isArray(lesson.images) ? lesson.images : []
  const miniTest = Array.isArray(lesson.mini_test) ? lesson.mini_test : []
  const examples = lesson.metadata?.examples || []
  const objectives = Array.isArray(lesson.learning_objectives) ? lesson.learning_objectives : []
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            <Link
              href="/school-admin/lessons"
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors mt-1 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{lesson.title}</h1>
              {lesson.topic && (
                <p className="text-gray-500 mt-1 text-sm sm:text-base">{t('topicLabel')} {lesson.topic}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(lesson.created_at).toLocaleDateString(locale)}
                </span>
                {lesson.duration_minutes && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {lesson.duration_minutes} min
                  </span>
                )}
                {lesson.is_published ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    <CheckCircle className="w-3 h-3" />
                    {t('inClass')}
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
          
          <div className="ml-14 sm:ml-0">
              <LessonActions
                lessonId={lesson.id}
                title={lesson.title}
                topic={lesson.topic}
                description={lesson.description}
                content={contentText}
                durationMinutes={lesson.duration_minutes}
                isPublished={lesson.is_published}
                hasAudio={!!lesson.audio_url}
                onUpdateLesson={updateLesson}
                onRegenerateAudio={regenerateAudio}
                onDeleteLesson={deleteLesson}
                labels={{
                  edit: t('edit'),
                  generateAudio: t('generateAudio'),
                  regenerateAudio: t('regenerateAudio'),
                  deleteLesson: t('deleteLesson'),
                  editLesson: t('editLesson'),
                  cancel: t('cancel'),
                  saveChanges: t('saveChanges'),
                  saving: t('saving'),
                  titleLabel: t('titleLabel'),
                  topicLabel: t('topicLabelForm'),
                  descriptionLabel: t('descriptionLabel'),
                  durationLabel: t('durationLabel'),
                  contentLabel: t('contentLabel'),
                  titlePlaceholder: t('titlePlaceholder'),
                  topicPlaceholder: t('topicPlaceholder'),
                  descriptionPlaceholder: t('descriptionPlaceholder'),
                  contentPlaceholder: t('contentPlaceholder'),
                  deleteConfirmTitle: t('deleteConfirmTitle'),
                  deleteConfirmMessage: t('deleteConfirmMessage', { title: lesson.title }),
                  deleting: t('deleting'),
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
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{lesson.duration_minutes || 45}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{t('minutes')}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <ImageIcon className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{images.length}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{t('images')}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <FileQuestion className="w-5 h-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{miniTest.length}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{t('questions')}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{objectives.length}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{t('objectives')}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Learning Objectives */}
        {objectives.length > 0 && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 sm:p-5 mb-6 border border-emerald-200">
            <h3 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
              <Target className="w-5 h-5" />
              {t('learningObjectives')}
            </h3>
            <ul className="space-y-2">
              {objectives.map((objective: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-emerald-700">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="text-sm sm:text-base">{objective}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Tabbed Content */}
        <LessonTabs 
          content={contentText} 
          images={images} 
          miniTest={miniTest} 
          examples={examples}
          centerText={(lesson.metadata as { generation_options?: { centerText?: boolean } } | null)?.generation_options?.centerText ?? false}
          labels={{
            tabContent: t('tabContent'),
            tabExamples: t('tabExamples'),
            tabMiniTest: t('tabMiniTest'),
            chooseBestAnswers: t('chooseBestAnswers'),
            checkAnswers: t('checkAnswers'),
            tryAgain: t('tryAgain'),
            scoreLabel: t('scoreLabel'),
            noExamples: t('noExamples'),
            noTestQuestions: t('noTestQuestions'),
            contentsLabel: t('contentsLabel'),
            expand: t('expand'),
            collapse: t('collapse'),
            fullScreen: t('fullScreen'),
          }}
        />
        
        {/* Source Document */}
        {lesson.documents && (
          <div className="mt-6 bg-gray-100 rounded-xl p-4 text-sm text-gray-600">
            <span className="font-medium">{t('sourceDocument')}</span>{' '}
            {Array.isArray(lesson.documents) ? lesson.documents[0]?.title : lesson.documents.title}
          </div>
        )}
      </div>
    </div>
  )
}

