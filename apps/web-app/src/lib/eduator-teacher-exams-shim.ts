export const TEACHER_EXAMS_PER_PAGE = 10

export type TeacherExamRow = {
  id: string
  title: string
  description: string | null
  topics: string[]
  languages: string[]
  questionCount: number
  duration_minutes: number | null
  is_published: boolean
  usedInClass: boolean
  className: string | null
  usedInCalendar: boolean
  created_at: string
}

export type TeacherExamsResult = {
  data: TeacherExamRow[]
  count: number
  page: number
}

export async function getTeacherExams(
  _supabase: unknown,
  _teacherId: string,
  _workspaceId: string,
  params?: { page?: string }
): Promise<TeacherExamsResult> {
  const page = Number(params?.page || 1)
  return { data: [], count: 0, page }
}

export async function getTeacherExamStats(_supabase: unknown, _teacherId: string, _workspaceId: string) {
  return {
    total: 0,
    published: 0,
    draft: 0,
    totalQuestions: 0,
  }
}
