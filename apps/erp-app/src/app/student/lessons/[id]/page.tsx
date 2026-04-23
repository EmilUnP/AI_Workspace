import { createClient } from '@eduator/auth/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import {
  ArrowLeft,
  Image as ImageIcon,
  FileQuestion,
  Calendar,
  Clock,
  Target,
  BookOpen,
  CheckCircle,
} from 'lucide-react'
import { LessonTabs, AudioPlayer, StudentLessonProgress } from '@eduator/ui'
import { getStudentLessonDetail, getStudentLessonProgress } from '@eduator/core/utils/student-lessons'
import { markLessonCompleted, restartLesson } from './actions'

async function getStudentInfo() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single()
  if (!profile?.organization_id) return null
  return { studentId: profile.id, organizationId: profile.organization_id }
}

export default async function StudentLessonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: lessonId } = await params
  const studentInfo = await getStudentInfo()
  if (!studentInfo) redirect('/auth/login')
  const { studentId, organizationId } = studentInfo

  const supabase = await createClient()
  const lesson = await getStudentLessonDetail(supabase, lessonId, studentId, organizationId)
  if (!lesson) notFound()

  const [progress, t] = await Promise.all([
    getStudentLessonProgress(supabase, lessonId, studentId),
    getTranslations('studentLessons'),
  ])

  const contentText =
    typeof lesson.content === 'object' && lesson.content && 'text' in (lesson.content as object)
      ? (lesson.content as { text: string }).text
      : typeof lesson.content === 'string'
        ? lesson.content
        : ''
  const images = Array.isArray(lesson.images) ? lesson.images : []
  const miniTest = Array.isArray(lesson.mini_test) ? lesson.mini_test : []
  const examples = (lesson.metadata?.examples as unknown[]) || []
  const objectives = Array.isArray(lesson.learning_objectives) ? lesson.learning_objectives : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div className="flex items-start gap-4">
            <Link
              href="/student/lessons"
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors mt-1 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{lesson.title}</h1>
              {lesson.topic && (
                <p className="text-gray-500 mt-1 text-sm sm:text-base">{t('topic')} {lesson.topic}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(lesson.created_at).toLocaleDateString()}
                </span>
                {lesson.duration_minutes != null && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {lesson.duration_minutes} min
                  </span>
                )}
                {lesson.class_name && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    <BookOpen className="w-3 h-3" />
                    {lesson.class_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <StudentLessonProgress
          lessonId={lesson.id}
          initialTimeSpentSeconds={progress?.time_spent_seconds}
          initialCompletedAt={progress?.completed_at ?? null}
          markCompleted={markLessonCompleted}
          restartLesson={restartLesson}
          labels={{
            markedAsLearned: t('markedAsLearned'),
            markAsLearned: t('markAsLearned'),
            currentSession: t('currentSession'),
            saving: t('saving'),
            progressCompleted: t('progressCompleted'),
            failedToMarkLearned: t('failedToMarkLearned'),
            pauseTimer: t('pauseTimer'),
            resumeTimer: t('resumeTimer'),
            timerPaused: t('timerPaused'),
            restartLesson: t('restartLesson'),
            failedToRestartLesson: t('failedToRestartLesson'),
          }}
        />

        {lesson.audio_url && (
          <AudioPlayer audioUrl={lesson.audio_url} title={lesson.title} sticky />
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{lesson.duration_minutes ?? 45}</p>
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

        {objectives.length > 0 && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 sm:p-5 mb-6 border border-emerald-200">
            <h3 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
              <Target className="w-5 h-5" />
              {t('learningObjectives')}
            </h3>
            <ul className="space-y-2">
              {objectives.map((objective: unknown, index: number) => (
                <li key={index} className="flex items-start gap-2 text-emerald-700">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="text-sm sm:text-base">{String(objective)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <LessonTabs
          content={contentText}
          images={images as { url: string; alt: string; description: string; position?: 'top' | 'middle' | 'bottom' }[]}
          miniTest={miniTest as { question: string; options: string[]; correct_answer: number; explanation: string }[]}
          examples={examples as { title: string; description: string; code?: string }[]}
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
      </div>
    </div>
  )
}
