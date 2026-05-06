import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getAccessToken, getCurrentUser } from '@/lib/backend-auth'
import { createExam, updateExam } from './actions'
import { generateExamFromDocuments, translateExam } from './ai-actions'
import { ExamCreatorWithIntl } from '../exam-creator-with-intl'

async function getTeacherInfo() {
  const user = await getCurrentUser()
  if (!user) return null
  if (user.role !== 'operator' && user.role !== 'admin') return null
  return { teacherId: user.id, workspaceId: 'global' }
}

async function getTeacherDocuments(teacherId: string, workspaceId: string) {
  void teacherId
  void workspaceId

  const accessToken = await getAccessToken()
  if (!accessToken) return []

  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'
  try {
    const response = await fetch(`${backendBase}/v1/documents`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
    if (!response.ok) return []

    const payload = (await response.json()) as { items?: Array<Record<string, unknown>> }
    const items = payload.items || []
    return items.map((doc) => ({
      id: String(doc.id || ''),
      title: String(doc.title || ''),
      file_type: String(doc.file_type || doc.fileType || 'text'),
      file_name: String(doc.file_name || doc.fileName || ''),
    }))
  } catch {
    return []
  }
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
