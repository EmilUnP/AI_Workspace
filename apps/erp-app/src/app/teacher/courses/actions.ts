// Re-export shared course actions (they already have 'use server' in the source file)
export {
  updateCourse,
  toggleCoursePublished,
  deleteCourse,
  getTeacherCourses,
  getCourseById,
} from '@eduator/core/utils/teacher-courses'
