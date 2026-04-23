/**
 * Lessons Repository
 * Database operations for lesson management
 */

import { normalizeLanguageCode } from '@eduator/config'
import { getDbClient } from '../client'

export interface LessonRow {
  id: string
  organization_id: string
  class_id: string | null
  created_by: string
  document_id: string | null
  title: string
  description: string | null
  subject: string | null
  grade_level: string | null
  topic: string | null
  duration_minutes: number
  content: LessonContent
  learning_objectives: string[]
  prerequisites: string[]
  materials: LessonMaterial[]
  images: LessonImage[]
  mini_test: MiniTestQuestion[]
  audio_url: string | null
  is_published: boolean
  is_archived: boolean
  /** Primary language of the lesson (e.g. en, az). Added via migration if missing. */
  language?: string | null
  /** 0 = in-app/API generated (visible in lists, class, calendar); 1 = course-generated (visible only in course). */
  course_generated?: number
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface LessonContent {
  sections?: LessonSection[]
  summary?: string | null
  key_vocabulary?: VocabularyTerm[]
  assessment_questions?: LessonQuestion[]
  // For simple markdown content
  text?: string
}

export interface LessonSection {
  id: string
  title: string
  content_type: 'text' | 'video' | 'image' | 'interactive' | 'quiz'
  content: string
  duration_minutes: number
  order: number
}

export interface VocabularyTerm {
  term: string
  definition: string
  example?: string
}

export interface LessonQuestion {
  question: string
  type: 'discussion' | 'reflection' | 'practice'
  suggested_answer?: string
}

export interface LessonMaterial {
  id: string
  name: string
  type: 'document' | 'video' | 'link' | 'image' | 'audio'
  url: string
  is_required: boolean
}

export interface LessonImage {
  url: string
  alt: string
  description: string
  position?: 'top' | 'middle' | 'bottom'
}

export interface MiniTestQuestion {
  question: string
  options: string[]
  correct_answer: number
  explanation: string
}

export interface LessonExample {
  title: string
  description: string
  code?: string
}

export interface CreateLessonInput {
  id?: string // Optional custom ID (generated if not provided)
  organization_id: string
  created_by: string
  class_id?: string | null
  document_id?: string | null
  title: string
  description?: string | null
  subject?: string | null
  grade_level?: string | null
  topic?: string | null
  duration_minutes?: number
  content?: LessonContent | string
  learning_objectives?: string[]
  prerequisites?: string[]
  materials?: LessonMaterial[]
  images?: LessonImage[]
  mini_test?: MiniTestQuestion[]
  examples?: LessonExample[]
  audio_url?: string | null
  is_published?: boolean
  /** Primary language code or name (e.g. en, az, English). Stored in DB column if migration applied. */
  language?: string | null
  /** Set to 1 when creating from course generator; 0 or omit for in-app/API. */
  course_generated?: number
  metadata?: Record<string, unknown>
}

export interface UpdateLessonInput {
  title?: string
  description?: string | null
  subject?: string | null
  grade_level?: string | null
  duration_minutes?: number
  content?: LessonContent | string
  learning_objectives?: string[]
  prerequisites?: string[]
  materials?: LessonMaterial[]
  images?: LessonImage[]
  mini_test?: MiniTestQuestion[]
  audio_url?: string | null
  is_published?: boolean
  is_archived?: boolean
  /** Primary language code (e.g. en, az). */
  language?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Lesson Repository - Database operations for lessons
 */
export const lessonRepository = {
  /**
   * Create a new lesson
   */
  async create(input: CreateLessonInput): Promise<LessonRow> {
    const supabase = getDbClient()
    
    // Process content: if string (markdown), wrap in object
    let contentToSave = input.content
    if (typeof input.content === 'string') {
      contentToSave = { text: input.content }
    }
    
    // Build insert object, including id if provided. language column must exist (see supabase/migrations).
    const insertData: Record<string, unknown> = {
      organization_id: input.organization_id,
      created_by: input.created_by,
      class_id: input.class_id || null,
      document_id: input.document_id || null,
      title: input.title,
      description: input.description || null,
      subject: input.subject || null,
      grade_level: input.grade_level || null,
      topic: input.topic || null,
      duration_minutes: input.duration_minutes || 45,
      content: contentToSave || {},
      learning_objectives: input.learning_objectives || [],
      prerequisites: input.prerequisites || [],
      materials: input.materials || [],
      images: input.images || [],
      mini_test: input.mini_test || [],
      audio_url: input.audio_url || null,
      is_published: input.is_published ?? false,
      is_archived: false,
      course_generated: input.course_generated ?? 0,
      metadata: {
        ...input.metadata,
        examples: input.examples || [],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    // Include custom ID if provided (for pre-generated IDs used with image storage)
    if (input.id) {
      insertData.id = input.id
    }
    // Always set language column to a normalized 2-letter code so flags and filters work (e.g. "Azerbaijani" -> "az").
    const languageToStore = normalizeLanguageCode(input.language ?? '') || 'en'
    insertData.language = languageToStore

    const { data, error } = await supabase
      .from('lessons')
      .insert(insertData)
      .select()
      .single()
    
    if (error) {
      console.error('Failed to create lesson:', error)
      throw new Error(`Failed to create lesson: ${error.message}`)
    }

    return data as LessonRow
  },

  /**
   * Get a lesson by ID (for teacher/owner)
   */
  async getById(lessonId: string, teacherId: string): Promise<LessonRow | null> {
    const supabase = getDbClient()
    
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .eq('created_by', teacherId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      console.error('Error fetching lesson:', error)
      return null
    }
    
    return data as LessonRow
  },

  /**
   * Get multiple lessons by IDs in one query (for teacher course detail).
   * Returns only columns needed for list display, in the order of lessonIds.
   */
  async getByIds(
    lessonIds: string[],
    teacherId: string
  ): Promise<Array<Pick<LessonRow, 'id' | 'title' | 'description' | 'topic' | 'duration_minutes' | 'is_published' | 'created_at'>>> {
    if (!lessonIds?.length) return []
    const supabase = getDbClient()
    const { data, error } = await supabase
      .from('lessons')
      .select('id, title, description, topic, duration_minutes, is_published, created_at')
      .in('id', lessonIds)
      .eq('created_by', teacherId)
    if (error) {
      console.error('Error fetching lessons by ids:', error)
      return []
    }
    const rows = (data ?? []) as Array<Pick<LessonRow, 'id' | 'title' | 'description' | 'topic' | 'duration_minutes' | 'is_published' | 'created_at'>>
    const byId = new Map(rows.map((r) => [r.id, r]))
    return lessonIds.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => r != null)
  },

  /**
   * Get multiple lessons by IDs with full content (for course run page).
   * Returns all lesson fields in the order of lessonIds.
   */
  async getByIdsFull(
    lessonIds: string[],
    teacherId: string
  ): Promise<LessonRow[]> {
    if (!lessonIds?.length) return []
    const supabase = getDbClient()
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .in('id', lessonIds)
      .eq('created_by', teacherId)
    if (error) {
      console.error('Error fetching full lessons by ids:', error)
      return []
    }
    const rows = (data ?? []) as LessonRow[]
    const byId = new Map(rows.map((r) => [r.id, r]))
    return lessonIds.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => r != null)
  },

  /**
   * Get a lesson by ID for student (must be in same class)
   */
  async getByIdForStudent(lessonId: string, studentId: string): Promise<LessonRow | null> {
    const supabase = getDbClient()
    
    // First get the lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .eq('is_published', true)
      .eq('is_archived', false)
      .single()
    
    if (lessonError || !lesson) return null
    
    // Check if student is enrolled in the class
    if (lesson.class_id) {
      const { data: enrollment } = await supabase
        .from('class_enrollments')
        .select('id')
        .eq('class_id', lesson.class_id)
        .eq('student_id', studentId)
        .eq('status', 'active')
        .single()
      
      if (!enrollment) return null
    }
    
    return lesson as LessonRow
  },

  /**
   * List lessons by teacher
   */
  async listByTeacher(
    teacherId: string, 
    organizationId: string,
    options?: {
      classId?: string | null
      includeArchived?: boolean
      limit?: number
      offset?: number
    }
  ): Promise<{ lessons: LessonRow[]; total: number }> {
    const supabase = getDbClient()
    
    let query = supabase
      .from('lessons')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('created_by', teacherId)
      .or('course_generated.eq.0,course_generated.is.null')
      .order('created_at', { ascending: false })
    
    if (!options?.includeArchived) {
      query = query.eq('is_archived', false)
    }
    
    if (options?.classId) {
      query = query.eq('class_id', options.classId)
    }
    
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
    }
    
    const { data, error, count } = await query
    
    if (error) {
      console.error('Error listing lessons:', error)
      return { lessons: [], total: 0 }
    }
    
    return {
      lessons: data as LessonRow[],
      total: count || 0,
    }
  },

  /**
   * List lessons for student (from enrolled classes)
   */
  async listByStudent(
    studentId: string,
    options?: {
      classId?: string | null
      limit?: number
      offset?: number
    }
  ): Promise<{ lessons: LessonRow[]; total: number }> {
    const supabase = getDbClient()
    
    // Get student's enrolled classes (use class_enrollments for consistency with rest of app)
    const { data: enrollments } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('student_id', studentId)
      .eq('status', 'active')
    
    if (!enrollments || enrollments.length === 0) {
      return { lessons: [], total: 0 }
    }
    
    const classIds = enrollments.map(e => e.class_id)
    
    let query = supabase
      .from('lessons')
      .select('*', { count: 'exact' })
      .in('class_id', classIds)
      .eq('is_published', true)
      .eq('is_archived', false)
      .or('course_generated.eq.0,course_generated.is.null')
      .order('created_at', { ascending: false })
    
    if (options?.classId && classIds.includes(options.classId)) {
      query = query.eq('class_id', options.classId)
    }
    
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
    }
    
    const { data, error, count } = await query
    
    if (error) {
      console.error('Error listing student lessons:', error)
      return { lessons: [], total: 0 }
    }
    
    return {
      lessons: data as LessonRow[],
      total: count || 0,
    }
  },

  /**
   * Update a lesson
   */
  async update(lessonId: string, teacherId: string, input: UpdateLessonInput): Promise<LessonRow | null> {
    const supabase = getDbClient()
    
    // Process content
    let contentToSave = input.content
    if (typeof input.content === 'string') {
      contentToSave = { text: input.content }
    }
    
    const updateData: Record<string, unknown> = {
      ...input,
      content: contentToSave,
      updated_at: new Date().toISOString(),
    }
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key]
    })
    
    const { data, error } = await supabase
      .from('lessons')
      .update(updateData)
      .eq('id', lessonId)
      .eq('created_by', teacherId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating lesson:', error)
      return null
    }
    
    return data as LessonRow
  },

  /**
   * Delete a lesson (soft delete by archiving)
   */
  async delete(lessonId: string, teacherId: string): Promise<boolean> {
    const supabase = getDbClient()
    
    const { error } = await supabase
      .from('lessons')
      .update({ 
        is_archived: true,
        updated_at: new Date().toISOString() 
      })
      .eq('id', lessonId)
      .eq('created_by', teacherId)
    
    if (error) {
      console.error('Error deleting lesson:', error)
      return false
    }
    
    return true
  },

  /**
   * Hard delete a lesson
   */
  async hardDelete(lessonId: string, teacherId: string): Promise<boolean> {
    const supabase = getDbClient()
    
    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId)
      .eq('created_by', teacherId)
    
    if (error) {
      console.error('Error hard deleting lesson:', error)
      return false
    }
    
    return true
  },

  /**
   * Publish/unpublish a lesson
   */
  async setPublished(lessonId: string, teacherId: string, isPublished: boolean): Promise<boolean> {
    const result = await this.update(lessonId, teacherId, { is_published: isPublished })
    return result !== null
  },

  /**
   * Update lesson audio URL
   */
  async updateAudioUrl(lessonId: string, audioUrl: string): Promise<boolean> {
    const supabase = getDbClient()
    
    const { error } = await supabase
      .from('lessons')
      .update({ 
        audio_url: audioUrl,
        updated_at: new Date().toISOString() 
      })
      .eq('id', lessonId)
    
    if (error) {
      console.error('Error updating lesson audio URL:', error)
      return false
    }
    
    return true
  },
}

export type { LessonRow as Lesson }
