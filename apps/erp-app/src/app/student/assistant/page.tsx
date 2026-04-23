import { redirect } from 'next/navigation'
import { getAssistantData } from './get-assistant-data'
import { StudentAssistantClientWrapper } from './student-assistant-client-wrapper'

export const dynamic = 'force-dynamic'

export default async function StudentAssistantPage() {
  const data = await getAssistantData()
  if (!data) redirect('/auth/login')

  return (
    <StudentAssistantClientWrapper
      studentName={data.studentName}
      variant={data.variant}
      upcomingExams={data.upcomingExams}
      recentLessons={data.recentLessons}
      todayActivity={data.todayActivity}
      classUpdates={data.classUpdates}
      progress={data.progress}
      contextSummary={data.contextSummary}
      assistantActionPath={data.assistantActionPath}
      examsHref={data.examsHref}
      lessonsHref={data.lessonsHref}
      progressHref={data.progressHref}
    />
  )
}
