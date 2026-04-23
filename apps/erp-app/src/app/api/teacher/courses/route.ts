/**
 * Courses API Route
 * List and manage courses
 */

import { NextRequest, NextResponse } from 'next/server'
import { courseRepository } from '@eduator/db/repositories/courses'
import { requireCourseAuth } from '@eduator/core/utils/api-helpers'

/**
 * GET /api/teacher/courses
 * List all courses for the teacher
 */
export async function GET(_request: NextRequest) {
  try {
    const { profile, organizationId, error } = await requireCourseAuth()
    if (error) {
      return error
    }

    const courses = await courseRepository.getByTeacher(
      profile!.id,
      organizationId!
    )

    return NextResponse.json({ courses }, { status: 200 })
  } catch (error: unknown) {
    console.error('Error fetching courses:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch courses',
      },
      { status: 500 }
    )
  }
}
