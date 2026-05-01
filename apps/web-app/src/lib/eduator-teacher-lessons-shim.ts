export const TEACHER_LESSONS_PER_PAGE = 10

export async function getTeacherLessons(
  _supabase: unknown,
  _teacherId: string,
  _workspaceId: string,
  params?: { page?: string }
) {
  const page = Number(params?.page || 1)
  return { data: [], count: 0, page }
}

export async function getTeacherLessonStats(_supabase: unknown, _teacherId: string, _workspaceId: string) {
  return {
    total: 0,
    published: 0,
    draft: 0,
    totalDuration: 0,
  }
}
