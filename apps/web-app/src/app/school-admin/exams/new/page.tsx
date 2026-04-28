import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createExam, updateExam } from './actions'
import { generateExamFromDocuments, translateExam } from './ai-actions'
import { ExamCreatorWithIntl } from '../exam-creator-with-intl'

async function getTeacherInfo() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()
  
  if (!profile?.id) return null
  
  return { teacherId: profile.id, workspaceId: 'global' }
}

async function getTeacherDocuments(teacherId: string, workspaceId: string) {
  const supabase = await createServerClient()
  void workspaceId
  
  const { data: documents } = await supabase
    .from('documents')
    .select('id, title, file_type, file_name')
    .eq('created_by', teacherId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
  
  return documents || []
}

export default async function NewExamPage() {
  const teacherData = await getTeacherInfo()
  
  if (!teacherData) {
    redirect('/auth/login')
  }
  
  const { teacherId, workspaceId } = teacherData
  const [documents, t] = await Promise.all([
    getTeacherDocuments(teacherId, workspaceId),
    getTranslations('teacherExamCreate'),
  ])

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">{t('title')}</h1>
        <p className="mt-1.5 text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      {/* Exam Creator – translations resolved on client via useTranslations('teacherExamCreator') */}
      <ExamCreatorWithIntl
        organizationId={workspaceId}
        documents={documents}
        onCreateExam={createExam}
        onUpdateExam={updateExam}
        onGenerateExam={generateExamFromDocuments}
        onTranslateExam={translateExam}
      />
    </div>
  )
}
