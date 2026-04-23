import { notFound } from 'next/navigation'
import { getCourseById } from '../../actions'
import { lessonRepository } from '@eduator/db/repositories/lessons'
import { CourseRunClient } from './course-run-client'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getLessonsByIds(lessonIds: string[], teacherId: string) {
  if (!lessonIds || lessonIds.length === 0) {
    return []
  }

  // Fetch lessons using the repository pattern
  const lessons = await Promise.all(
    lessonIds.map(id => lessonRepository.getById(id, teacherId))
  )
  
  // Filter out nulls and maintain order, and get full lesson data
  return lessons
    .filter((lesson): lesson is NonNullable<typeof lesson> => lesson !== null)
    .map(lesson => ({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      topic: lesson.topic,
      duration_minutes: lesson.duration_minutes,
      is_published: lesson.is_published,
      created_at: lesson.created_at,
      content: lesson.content,
      learning_objectives: lesson.learning_objectives,
      images: lesson.images,
      mini_test: lesson.mini_test,
      metadata: lesson.metadata,
      audio_url: lesson.audio_url,
    }))
}

export default async function CourseRunPage({ params }: PageProps) {
  const { id } = await params
  
  const result = await getCourseById(id)
  
  if (result.error || !result.course) {
    notFound()
  }
  
  const course = result.course
  
  // Fetch lessons for this course
  const lessons = await getLessonsByIds(course.lesson_ids || [], course.created_by)
  
  // Extract final exam ID from metadata
  const finalExamId = course.metadata && typeof course.metadata === 'object' && 'final_exam_id' in course.metadata
    ? (course.metadata as { final_exam_id?: string }).final_exam_id
    : undefined
  
  return (
    <CourseRunClient course={course} lessons={lessons} finalExamId={finalExamId} />
  )
}
