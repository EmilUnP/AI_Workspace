/**
 * Courses Repository
 * Database operations for course management
 */

import { normalizeLanguageCode } from '@eduator/config'
import { getDbClient } from '../client'
import type { 
  CreateCourseInput, 
  UpdateCourseInput,
  CourseDifficultyLevel,
  CourseStyle 
} from '@eduator/core/types/course'

export interface CourseRow {
  id: string
  organization_id: string
  created_by: string
  title: string
  description: string | null
  subject: string | null
  grade_level: string | null
  difficulty_level: CourseDifficultyLevel
  language: string
  course_style: CourseStyle
  access_code: string
  lesson_ids: string[]
  total_lessons: number
  estimated_duration_minutes: number
  is_published: boolean
  is_archived: boolean
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

/**
 * Generate a unique 6-digit access code
 */
function generateAccessCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Ensure access code is unique
 */
async function ensureUniqueAccessCode(supabase: any, accessCode: string): Promise<string> {
  const { data } = await supabase
    .from('courses')
    .select('id')
    .eq('access_code', accessCode)
    .limit(1)
  
  if (data && data.length > 0) {
    // Code exists, generate a new one
    return ensureUniqueAccessCode(supabase, generateAccessCode())
  }
  
  return accessCode
}

export const courseRepository = {
  /**
   * Create a new course
   */
  async create(input: CreateCourseInput): Promise<CourseRow> {
    const supabase = getDbClient()
    
    // Generate unique access code
    const accessCode = await ensureUniqueAccessCode(supabase, generateAccessCode())
    
    const languageToStore = normalizeLanguageCode(input.language ?? '') || 'en'
    const insertData = {
      organization_id: input.organization_id,
      created_by: input.created_by,
      title: input.title,
      description: input.description || null,
      subject: input.subject || null,
      grade_level: input.grade_level || null,
      difficulty_level: input.difficulty_level,
      language: languageToStore,
      course_style: input.course_style,
      access_code: accessCode,
      lesson_ids: input.lesson_ids || [],
      total_lessons: input.lesson_ids?.length || 0,
      estimated_duration_minutes: 0, // Will be calculated from lessons
      is_published: false,
      is_archived: false,
      metadata: input.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    const { data, error } = await supabase
      .from('courses')
      .insert(insertData)
      .select()
      .single()
    
    if (error) {
      console.error('Failed to create course:', error)
      throw new Error(`Failed to create course: ${error.message}`)
    }
    
    return data as CourseRow
  },

  /**
   * Get a course by ID
   */
  async getById(courseId: string, userId: string): Promise<CourseRow | null> {
    const supabase = getDbClient()
    
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('created_by', userId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      console.error('Failed to get course:', error)
      throw new Error(`Failed to get course: ${error.message}`)
    }
    
    return data as CourseRow
  },

  /**
   * Get a course by access code (for learners) — only published, non-archived
   */
  async getByAccessCode(accessCode: string): Promise<CourseRow | null> {
    const supabase = getDbClient()
    
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('access_code', accessCode)
      .eq('is_published', true)
      .eq('is_archived', false)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      console.error('Failed to get course by access code:', error)
      throw new Error(`Failed to get course: ${error.message}`)
    }
    
    return data as CourseRow
  },

  /**
   * Get a course by access code for the shareable page (allows unpublished so teachers can preview share link)
   */
  async getByAccessCodeForSharePage(accessCode: string): Promise<CourseRow | null> {
    const supabase = getDbClient()
    
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('access_code', accessCode)
      .eq('is_archived', false)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      console.error('Failed to get course by access code:', error)
      throw new Error(`Failed to get course: ${error.message}`)
    }
    
    return data as CourseRow
  },

  /**
   * Get all courses for an owner profile id.
   */
  async getByOwner(ownerId: string, organizationId?: string): Promise<CourseRow[]> {
    const supabase = getDbClient()
    
    const courseListColumns = 'id, organization_id, created_by, title, description, subject, grade_level, difficulty_level, language, course_style, access_code, lesson_ids, total_lessons, estimated_duration_minutes, is_published, is_archived, metadata, created_at, updated_at'
    let query = supabase
      .from('courses')
      .select(courseListColumns)
      .eq('created_by', ownerId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
    
    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Failed to get courses:', error)
      throw new Error(`Failed to get courses: ${error.message}`)
    }
    
    return (data || []) as CourseRow[]
  },
  /**
   * Update a course
   */
  async update(courseId: string, userId: string, input: UpdateCourseInput): Promise<CourseRow> {
    const supabase = getDbClient()
    
    // Calculate total lessons if lesson_ids is updated
    const totalLessons = input.lesson_ids ? input.lesson_ids.length : undefined
    
    const updateData: Record<string, unknown> = {
      ...input,
      updated_at: new Date().toISOString(),
    }
    
    if (totalLessons !== undefined) {
      updateData.total_lessons = totalLessons
    }
    
    const { data, error } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', courseId)
      .eq('created_by', userId)
      .select()
      .single()
    
    if (error) {
      console.error('Failed to update course:', error)
      throw new Error(`Failed to update course: ${error.message}`)
    }
    
    return data as CourseRow
  },

  /**
   * Delete a course (soft delete by archiving)
   */
  async delete(courseId: string, userId: string): Promise<void> {
    const supabase = getDbClient()
    
    const { error } = await supabase
      .from('courses')
      .update({ 
        is_archived: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', courseId)
      .eq('created_by', userId)
    
    if (error) {
      console.error('Failed to delete course:', error)
      throw new Error(`Failed to delete course: ${error.message}`)
    }
  },

  /**
   * Publish/unpublish a course
   */
  async setPublished(courseId: string, userId: string, isPublished: boolean): Promise<CourseRow> {
    const supabase = getDbClient()
    
    const { data, error } = await supabase
      .from('courses')
      .update({ 
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      })
      .eq('id', courseId)
      .eq('created_by', userId)
      .select()
      .single()
    
    if (error) {
      console.error('Failed to update course publish status:', error)
      throw new Error(`Failed to update course: ${error.message}`)
    }
    
    return data as CourseRow
  },
}
