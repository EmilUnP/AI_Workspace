'use server'

/**
 * Shared utilities for course management
 * Works for both ERP and ERP apps
 */

import { createClient } from '@eduator/auth/supabase/server'
import type { UpdateCourseInput } from '../types/course'
import { courseRepository } from '@eduator/db/repositories/courses'
import { lessonRepository } from '@eduator/db/repositories/lessons'
import { examRepository } from '@eduator/db/repositories/exams'
import { getTeacherContext } from './get-teacher-context'

/**
 * Get teacher info and organization ID for course operations
 * Handles both ERP (real org) and ERP (demo org) cases
 */
export async function getTeacherCourseContext() {
  const context = await getTeacherContext()
  
  if (context.error || !context.teacherId) {
    return context
  }

  // Additional validation: check if teacher
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_type')
    .eq('id', context.teacherId)
    .single()

  if (profile && profile.profile_type !== 'teacher' && profile.profile_type !== 'school_superadmin') {
    return { error: 'Only teachers can manage courses', teacherId: null, organizationId: null, userId: null }
  }

  return context
}

/**
 * Update a course
 */
export async function updateCourse(courseId: string, input: UpdateCourseInput) {
  try {
    const context = await getTeacherCourseContext()
    if (context.error || !context.teacherId) {
      return { error: context.error || 'Not authenticated' }
    }

    const course = await courseRepository.update(courseId, context.teacherId, input)
    return { success: true, data: course }
  } catch (error) {
    console.error('Update course error:', error)
    return { error: error instanceof Error ? error.message : 'Failed to update course' }
  }
}

/**
 * Toggle course published status
 */
export async function toggleCoursePublished(courseId: string, isPublished: boolean) {
  try {
    const context = await getTeacherCourseContext()
    if (context.error || !context.teacherId) {
      return { error: context.error || 'Not authenticated' }
    }

    const course = await courseRepository.setPublished(courseId, context.teacherId, isPublished)
    return { success: true, data: course }
  } catch (error) {
    console.error('Toggle course published error:', error)
    return { error: error instanceof Error ? error.message : 'Failed to update course' }
  }
}

/**
 * Delete a course (soft delete) and cascade: archive all related lessons and the course final exam.
 */
export async function deleteCourse(courseId: string) {
  try {
    const context = await getTeacherCourseContext()
    if (context.error || !context.teacherId) {
      return { error: context.error || 'Not authenticated' }
    }

    const course = await courseRepository.getById(courseId, context.teacherId)
    if (!course) {
      return { error: 'Course not found or access denied' }
    }

    // Block delete if any lesson or the final exam is assigned to a class
    const blockedMessage = 'A lesson or exam from this course was added to a class. Remove it from the class first, then try again.'
    const lessonIds = course.lesson_ids || []
    for (const lessonId of lessonIds) {
      const lesson = await lessonRepository.getById(lessonId, context.teacherId)
      if (lesson?.class_id) {
        return { error: blockedMessage }
      }
    }
    const metadata = course.metadata as { final_exam_id?: string } | null
    const finalExamId = metadata?.final_exam_id
    if (finalExamId) {
      const exam = await examRepository.getById(finalExamId)
      if (exam?.class_id) {
        return { error: blockedMessage }
      }
    }

    // Cascade: archive lessons that belong to this course
    for (const lessonId of lessonIds) {
      await lessonRepository.delete(lessonId, context.teacherId)
    }

    // Cascade: archive the course final exam if it exists
    if (finalExamId) {
      await examRepository.archive(finalExamId)
    }

    await courseRepository.delete(courseId, context.teacherId)
    return { success: true }
  } catch (error) {
    console.error('Delete course error:', error)
    return { error: error instanceof Error ? error.message : 'Failed to delete course' }
  }
}

/**
 * Get courses for a teacher
 */
export async function getTeacherCourses() {
  try {
    const context = await getTeacherCourseContext()
    if (context.error || !context.teacherId || !context.organizationId) {
      return { error: context.error || 'Not authenticated', courses: [] }
    }

    const courses = await courseRepository.getByTeacher(
      context.teacherId,
      context.organizationId
    )

    return { success: true, courses }
  } catch (error) {
    console.error('Get courses error:', error)
    return { error: error instanceof Error ? error.message : 'Failed to fetch courses', courses: [] }
  }
}

/**
 * Get a course by ID
 */
export async function getCourseById(courseId: string) {
  try {
    const context = await getTeacherCourseContext()
    if (context.error || !context.teacherId) {
      return { error: context.error || 'Not authenticated', course: null }
    }

    const course = await courseRepository.getById(courseId, context.teacherId)
    if (!course) {
      return { error: 'Course not found', course: null }
    }

    return { success: true, course }
  } catch (error) {
    console.error('Get course error:', error)
    return { error: error instanceof Error ? error.message : 'Failed to fetch course', course: null }
  }
}
