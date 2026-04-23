import { createAdminClient } from '@eduator/auth/supabase/admin'
import { calculateAverageScore, calculatePassRate, type TeacherReportsData, type ExamStats, type ClassStats, type MonthlyActivity, type LessonStats, type StudentPerformance } from '@eduator/core/utils/reports'

type ClassRelation = { name?: string | null }
type WithClassMeta = {
  classes?: ClassRelation | ClassRelation[] | null
  class_id?: string | null
}

function getRelatedClassName(item: WithClassMeta): string | null {
  if (Array.isArray(item.classes)) return item.classes[0]?.name ?? null
  return item.classes?.name ?? null
}

function getRelatedClassId(item: WithClassMeta): string | null {
  return item.class_id ?? null
}

export async function getTeacherStats(teacherId: string, organizationId: string, tab: 'overview' | 'exams' | 'students' = 'overview'): Promise<TeacherReportsData> {
  const supabase = createAdminClient()
  
  // Get classes
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name')
    .eq('organization_id', organizationId)
    .or(`teacher_id.eq.${teacherId},id.in.(select class_id from class_teachers where teacher_id.eq.${teacherId})`)
  
  const classIds = classes?.map((c) => c.id) || []

  // All exam IDs for this teacher in org (no limit) – for submissions, average, pass rate, monthly.
  const { data: allTeacherExamRows } = await supabase
    .from('exams')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('created_by', teacherId)
    .eq('is_archived', false)
  const allExamIds = allTeacherExamRows?.map((e) => e.id) || []

  // Limited exam list for examStats display (overview: 10, exams tab: 200).
  const { data: teacherExams } = await supabase
    .from('exams')
    .select('id, title, questions, created_at, is_published, class_id, classes(name)')
    .eq('organization_id', organizationId)
    .eq('created_by', teacherId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(tab === 'exams' ? 200 : 10)

  // Get comprehensive stats (submissions use ALL teacher exams so totals are correct)
  const [
    examsResult,
    lessonsResult,
    documentsResult,
    enrollmentsResult,
    submissionsResult,
    publishedExamsResult,
    publishedLessonsResult,
  ] = await Promise.all([
    supabase
      .from('exams')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('created_by', teacherId)
      .eq('is_archived', false)
      ,
    supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('created_by', teacherId)
      .eq('is_archived', false)
      .or('course_generated.eq.0,course_generated.is.null'),
    supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('created_by', teacherId)
      .eq('is_archived', false),
    classIds.length > 0
      ? supabase
          .from('class_enrollments')
          .select('student_id', { count: 'exact', head: true })
          .eq('status', 'active')
          .in('class_id', classIds)
      : Promise.resolve({ count: 0 }),
    allExamIds.length > 0
      ? supabase
          .from('exam_submissions')
          .select('id, score, total_points, exam_id', { count: 'exact' })
          .in('exam_id', allExamIds)
      : Promise.resolve({ count: 0, data: [] }),
    supabase
      .from('exams')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('created_by', teacherId)
      .eq('is_published', true)
      .eq('is_archived', false)
      ,
    supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('created_by', teacherId)
      .eq('is_published', true)
      .eq('is_archived', false)
      .or('course_generated.eq.0,course_generated.is.null'),
  ])
  
  // Calculate average score from submissions using shared utility
  const averageScore = calculateAverageScore(submissionsResult.data || [])
  
  let examStats: ExamStats[] = []
  let topStudents: StudentPerformance[] = []
  let atRiskStudents: StudentPerformance[] = []
  if (tab === 'exams' || tab === 'overview') {
    const displayExamIds = (teacherExams || []).map((e) => e.id)
    let submissionsByExam: Record<string, { score: number | null; total_points: number | null }[]> = {}
    let submittersByExam: Record<string, Set<string>> = {}

    const classSizeMap: Record<string, number> = {}
    if (classIds.length > 0) {
      const { data: classEnrollments } = await supabase
        .from('class_enrollments')
        .select('class_id, student_id')
        .eq('status', 'active')
        .in('class_id', classIds)

      ;(classEnrollments || []).forEach((row: { class_id: string; student_id: string }) => {
        if (!classSizeMap[row.class_id]) classSizeMap[row.class_id] = 0
        classSizeMap[row.class_id] += 1
      })
    }

    if (displayExamIds.length > 0) {
      const { data: allSubs } = await supabase
        .from('exam_submissions')
        .select('exam_id, score, total_points, student_id')
        .in('exam_id', displayExamIds)

      ;(allSubs || []).forEach((s: { exam_id: string; score: number | null; total_points: number | null; student_id: string | null }) => {
        if (!submissionsByExam[s.exam_id]) submissionsByExam[s.exam_id] = []
        submissionsByExam[s.exam_id].push({ score: s.score, total_points: s.total_points })
        if (!submittersByExam[s.exam_id]) submittersByExam[s.exam_id] = new Set<string>()
        if (s.student_id) submittersByExam[s.exam_id].add(s.student_id)
      })
    }

    examStats = (teacherExams || []).map((exam) => {
      const subs = submissionsByExam[exam.id] || []
      const submitters = submittersByExam[exam.id]?.size || 0
      const className = getRelatedClassName(exam as WithClassMeta)
      const relatedClassId = getRelatedClassId(exam as WithClassMeta)
      const targetStudentCount = relatedClassId
        ? (classSizeMap[relatedClassId] || 0)
        : (enrollmentsResult.count || 0)
      const participationRate = targetStudentCount > 0 ? Math.round((submitters / targetStudentCount) * 100) : 0
      const passRateForExam = calculatePassRate(subs)

      return {
        id: exam.id,
        title: exam.title,
        question_count: Array.isArray(exam.questions) ? exam.questions.length : 0,
        created_at: exam.created_at,
        is_published: exam.is_published,
        class_name: className,
        submissions: subs.length,
        average_score: calculateAverageScore(subs),
        participation_rate: participationRate,
        pass_rate: passRateForExam,
      }
    })

    if (allExamIds.length > 0) {
      const { data: studentSubs } = await supabase
        .from('exam_submissions')
        .select('student_id, score, total_points')
        .in('exam_id', allExamIds)
        .not('student_id', 'is', null)

      const studentBuckets: Record<string, Array<{ score: number | null; total_points: number | null }>> = {}
      ;(studentSubs || []).forEach((sub: { student_id: string; score: number | null; total_points: number | null }) => {
        if (!studentBuckets[sub.student_id]) {
          studentBuckets[sub.student_id] = []
        }
        studentBuckets[sub.student_id].push({ score: sub.score, total_points: sub.total_points })
      })

      const studentIds = Object.keys(studentBuckets)
      if (studentIds.length > 0) {
        const { data: studentProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', studentIds)

        const profileMap: Record<string, string> = {}
        ;(studentProfiles || []).forEach((profile: { id: string; full_name: string | null }) => {
          profileMap[profile.id] = profile.full_name || 'Student'
        })

        const classNamesById: Record<string, string> = {}
        ;(classes || []).forEach((cls) => {
          classNamesById[cls.id] = cls.name
        })

        const { data: studentClassRows } = classIds.length > 0
          ? await supabase
              .from('class_enrollments')
              .select('student_id, class_id')
              .eq('status', 'active')
              .in('class_id', classIds)
              .in('student_id', studentIds)
          : { data: [] as Array<{ student_id: string; class_id: string }> }

        const studentClassesMap: Record<string, string[]> = {}
        ;(studentClassRows || []).forEach((row: { student_id: string; class_id: string }) => {
          if (!studentClassesMap[row.student_id]) studentClassesMap[row.student_id] = []
          const className = classNamesById[row.class_id]
          if (className && !studentClassesMap[row.student_id].includes(className)) {
            studentClassesMap[row.student_id].push(className)
          }
        })

        topStudents = studentIds
          .map((studentId) => {
            const subs = studentBuckets[studentId]
            return {
              student_id: studentId,
              student_name: profileMap[studentId] || 'Student',
              submissions: subs.length,
              average_score: calculateAverageScore(subs),
              class_count: (studentClassesMap[studentId] || []).length,
              class_names: studentClassesMap[studentId] || [],
            }
          })
          .filter((row) => row.submissions > 0)
          .sort((a, b) => {
            if (b.average_score !== a.average_score) return b.average_score - a.average_score
            return b.submissions - a.submissions
          })
          .slice(0, 5)

        atRiskStudents = studentIds
          .map((studentId) => {
            const subs = studentBuckets[studentId]
            return {
              student_id: studentId,
              student_name: profileMap[studentId] || 'Student',
              submissions: subs.length,
              average_score: calculateAverageScore(subs),
              class_count: (studentClassesMap[studentId] || []).length,
              class_names: studentClassesMap[studentId] || [],
            }
          })
          .filter((row) => row.submissions > 0)
          .sort((a, b) => {
            if (a.average_score !== b.average_score) return a.average_score - b.average_score
            return b.submissions - a.submissions
          })
          .slice(0, 5)
      }
    }
  }
  
  // Get class stats (for overview) – aligned with what students see (exams/lessons per class)
  let classStats: ClassStats[] = []
  if (tab === 'overview') {
    const classStatsPromises = (classes || []).slice(0, 20).map(async (cls) => {
      const [enrollmentResult, classExams, classLessons] = await Promise.all([
        supabase
          .from('class_enrollments')
          .select('student_id', { count: 'exact', head: true })
          .eq('class_id', cls.id)
          .eq('status', 'active'),
        supabase
          .from('exams')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('is_published', true)
          .eq('is_archived', false)
          .eq('class_id', cls.id),
        supabase
          .from('lessons')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('is_archived', false)
          .eq('class_id', cls.id)
          .or('course_generated.eq.0,course_generated.is.null'),
      ])

      const examIdsForClass = classExams.data?.map((e) => e.id) || []
      let classAvgScore = 0
      if (examIdsForClass.length > 0) {
        const { data: classSubmissions } = await supabase
          .from('exam_submissions')
          .select('score, total_points')
          .in('exam_id', examIdsForClass)
        classAvgScore = calculateAverageScore(classSubmissions || [])
      }

      return {
        id: cls.id,
        name: cls.name,
        student_count: enrollmentResult.count || 0,
        active_exams: classExams.data?.length || 0,
        active_lessons: classLessons.count ?? 0,
        average_score: classAvgScore,
      }
    })

    classStats = await Promise.all(classStatsPromises)
  }
  
  const monthlyActivity: MonthlyActivity[] = []
  let lessonStats: LessonStats[] = []
  if (tab === 'overview') {
    const now = new Date()
    const months: { start: string; end: string; label: string }[] = []
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      months.push({
        start: month.toISOString(),
        end: nextMonth.toISOString(),
        label: month.toLocaleDateString('en-US', { month: 'short' }),
      })
    }

    const countOpt = { count: 'exact' as const, head: true }
    const allMonthlyResults = await Promise.all(
      months.flatMap((m) => [
        supabase.from('exams').select('id', countOpt).eq('organization_id', organizationId).eq('created_by', teacherId).gte('created_at', m.start).lt('created_at', m.end),
        supabase.from('lessons').select('id', countOpt).eq('organization_id', organizationId).eq('created_by', teacherId).or('course_generated.eq.0,course_generated.is.null').gte('created_at', m.start).lt('created_at', m.end),
        allExamIds.length > 0
          ? supabase.from('exam_submissions').select('id', countOpt).in('exam_id', allExamIds).gte('created_at', m.start).lt('created_at', m.end)
          : Promise.resolve({ count: 0 }),
      ])
    )

    for (let i = 0; i < months.length; i++) {
      monthlyActivity.push({
        month: months[i].label,
        exams_created: allMonthlyResults[i * 3].count || 0,
        lessons_created: allMonthlyResults[i * 3 + 1].count || 0,
        submissions: allMonthlyResults[i * 3 + 2].count || 0,
      })
    }

    const { data: teacherLessons } = await supabase
      .from('lessons')
      .select('id, title, created_at, class_id, classes(name)')
      .eq('organization_id', organizationId)
      .eq('created_by', teacherId)
      .eq('is_archived', false)
      .or('course_generated.eq.0,course_generated.is.null')
      .order('created_at', { ascending: false })
      .limit(20)

    const lessonIds = (teacherLessons || []).map((lesson) => lesson.id)
    let lessonProgressByLesson: Record<string, Array<{ student_id: string | null; completed_at: string | null }>> = {}
    if (lessonIds.length > 0) {
      const { data: lessonProgressRows } = await supabase
        .from('lesson_progress')
        .select('lesson_id, student_id, completed_at')
        .in('lesson_id', lessonIds)

      ;(lessonProgressRows || []).forEach((row: { lesson_id: string; student_id: string | null; completed_at: string | null }) => {
        if (!lessonProgressByLesson[row.lesson_id]) {
          lessonProgressByLesson[row.lesson_id] = []
        }
        lessonProgressByLesson[row.lesson_id].push({ student_id: row.student_id, completed_at: row.completed_at })
      })
    }

    const classSizeMap: Record<string, number> = {}
    if (classIds.length > 0) {
      const { data: classEnrollments } = await supabase
        .from('class_enrollments')
        .select('class_id, student_id')
        .eq('status', 'active')
        .in('class_id', classIds)

      ;(classEnrollments || []).forEach((row: { class_id: string; student_id: string }) => {
        if (!classSizeMap[row.class_id]) classSizeMap[row.class_id] = 0
        classSizeMap[row.class_id] += 1
      })
    }

    lessonStats = (teacherLessons || []).map((lesson) => {
      const progressRows = lessonProgressByLesson[lesson.id] || []
      const uniqueLearners = new Set(progressRows.map((row) => row.student_id).filter((studentId): studentId is string => Boolean(studentId)))
      const completedStudents = new Set(
        progressRows
          .filter((row) => Boolean(row.completed_at) && Boolean(row.student_id))
          .map((row) => row.student_id as string)
      )
      const completions = completedStudents.size
      const className = getRelatedClassName(lesson as WithClassMeta)
      const relatedClassId = getRelatedClassId(lesson as WithClassMeta)
      const targetStudentCount = relatedClassId
        ? (classSizeMap[relatedClassId] || 0)
        : (enrollmentsResult.count || 0)
      const completionRate = targetStudentCount > 0
        ? Math.round((completions / targetStudentCount) * 100)
        : 0

      return {
        id: lesson.id,
        title: lesson.title,
        created_at: lesson.created_at,
        class_name: className,
        learners: uniqueLearners.size,
        completions,
        completion_rate: completionRate,
      }
    })
  }
  
  // Calculate pass rate using shared utility
  const passRate = calculatePassRate(submissionsResult.data || [])
  
  return {
    classes: classes?.length || 0,
    exams: examsResult.count || 0,
    publishedExams: publishedExamsResult.count || 0,
    lessons: lessonsResult.count || 0,
    publishedLessons: publishedLessonsResult.count || 0,
    documents: documentsResult.count || 0,
    students: enrollmentsResult.count || 0,
    submissions: submissionsResult.count || 0,
    averageScore,
    passRate,
    examStats,
    classStats,
    monthlyActivity,
    lessonStats,
    topStudents,
    atRiskStudents,
  }
}
