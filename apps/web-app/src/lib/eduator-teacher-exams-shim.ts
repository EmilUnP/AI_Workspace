export const TEACHER_EXAMS_PER_PAGE = 10

export async function getTeacherExams(
  _supabase: unknown,
  _teacherId: string,
  _workspaceId: string,
  params?: { page?: string }
) {
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
