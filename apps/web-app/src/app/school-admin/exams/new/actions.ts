'use server'

import { createClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'

interface Question {
  id: string
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank'
  text: string
  options: string[]
  correctAnswer: string | string[]
  explanation?: string
}

interface CreateExamInput {
  organizationId: string
  title: string
  description?: string | null
  classId?: string | null
  subject?: string | null
  gradeLevel?: string | null
  durationMinutes: number
  questions: Question[]
  isPublished: boolean
  language?: string // Primary language code (e.g., 'en', 'az', 'tr')
  translations?: Record<string, Question[]> // Translations in other languages
  /** Teacher setting: show correct answers in learner results (default true) */
  showCorrectAnswers?: boolean
  /** Teacher setting: show explanations in learner results (default true) */
  showExplanations?: boolean
}

export async function createExam(input: CreateExamInput) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Get teacher profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return { error: 'Profile not found' }
    }

    // Prepare exam data
    const examData = {
      organization_id: input.organizationId,
      created_by: profile.id,
      title: input.title,
      description: input.description,
      class_id: input.classId,
      subject: input.subject,
      grade_level: input.gradeLevel,
      duration_minutes: input.durationMinutes,
      questions: input.questions,
      language: input.language || 'en',
      translations: input.translations || {},
      settings: {
        questionTypes: {
          multipleChoice: input.questions.filter(q => q.type === 'multiple_choice').length,
          trueFalse: input.questions.filter(q => q.type === 'true_false').length,
          shortAnswer: input.questions.filter(q => q.type === 'short_answer').length,
          fillBlank: input.questions.filter(q => q.type === 'fill_blank').length,
        },
        totalQuestions: input.questions.length,
        show_correct_answers: input.showCorrectAnswers !== false,
        show_explanations: input.showExplanations !== false,
      },
      is_published: input.isPublished,
      is_archived: false,
    }

    // Create exam in database
    const { data: exam, error: dbError } = await adminSupabase
      .from('exams')
      .insert(examData)
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return { error: 'Failed to create exam' }
    }

    return { success: true, data: exam }
  } catch (error) {
    console.error('Create exam error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function updateExam(examId: string, input: Partial<CreateExamInput>) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Get teacher profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return { error: 'Profile not found' }
    }

    // Verify ownership
    const { data: existingExam } = await adminSupabase
      .from('exams')
      .select('id, created_by')
      .eq('id', examId)
      .single()

    if (!existingExam || existingExam.created_by !== profile.id) {
      return { error: 'Exam not found or access denied' }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (input.title !== undefined) updateData.title = input.title
    if (input.description !== undefined) updateData.description = input.description
    if (input.classId !== undefined) updateData.class_id = input.classId
    if (input.subject !== undefined) updateData.subject = input.subject
    if (input.gradeLevel !== undefined) updateData.grade_level = input.gradeLevel
    if (input.durationMinutes !== undefined) updateData.duration_minutes = input.durationMinutes
    if (input.isPublished !== undefined) updateData.is_published = input.isPublished
    if (input.language !== undefined) updateData.language = input.language
    if (input.translations !== undefined) updateData.translations = input.translations
    
    if (input.questions !== undefined) {
      updateData.questions = input.questions
      updateData.settings = {
        questionTypes: {
          multipleChoice: input.questions.filter(q => q.type === 'multiple_choice').length,
          trueFalse: input.questions.filter(q => q.type === 'true_false').length,
          shortAnswer: input.questions.filter(q => q.type === 'short_answer').length,
          fillBlank: input.questions.filter(q => q.type === 'fill_blank').length,
        },
        totalQuestions: input.questions.length,
        show_correct_answers: input.showCorrectAnswers !== false,
        show_explanations: input.showExplanations !== false,
      }
    } else if (input.showCorrectAnswers !== undefined || input.showExplanations !== undefined) {
      const { data: currentExam } = await adminSupabase
        .from('exams')
        .select('settings')
        .eq('id', examId)
        .single()
      const currentSettings = (currentExam?.settings as Record<string, unknown>) || {}
      updateData.settings = {
        ...currentSettings,
        show_correct_answers: input.showCorrectAnswers !== false,
        show_explanations: input.showExplanations !== false,
      }
    }

    // Update exam
    const { data: exam, error: dbError } = await adminSupabase
      .from('exams')
      .update(updateData)
      .eq('id', examId)
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return { error: 'Failed to update exam' }
    }

    return { success: true, data: exam }
  } catch (error) {
    console.error('Update exam error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function deleteExam(examId: string) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Get teacher profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return { error: 'Profile not found' }
    }

    // Verify ownership and check if in use
    const { data: existingExam } = await adminSupabase
      .from('exams')
      .select('id, created_by, class_id, start_time, end_time')
      .eq('id', examId)
      .single()

    if (!existingExam || existingExam.created_by !== profile.id) {
      return { error: 'Exam not found or access denied' }
    }

    if (existingExam.class_id) {
      return { error: 'This exam is assigned to a class. Remove it from the class first (Classes → select the class → remove this exam), then try again.' }
    }
    if (existingExam.start_time && existingExam.end_time) {
      return { error: 'This exam is scheduled on the calendar. Remove the schedule first, then try again.' }
    }

    // Delete exam
    const { error: dbError } = await adminSupabase
      .from('exams')
      .delete()
      .eq('id', examId)

    if (dbError) {
      console.error('Database error:', dbError)
      return { error: 'Failed to delete exam' }
    }

    return { success: true }
  } catch (error) {
    console.error('Delete exam error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function updateExamTranslations(examId: string, translations: Record<string, Question[]>) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Get teacher profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return { error: 'Profile not found' }
    }

    // Verify ownership
    const { data: existingExam } = await adminSupabase
      .from('exams')
      .select('id, created_by')
      .eq('id', examId)
      .single()

    if (!existingExam || existingExam.created_by !== profile.id) {
      return { error: 'Exam not found or access denied' }
    }

    // Update translations
    const { data: exam, error: dbError } = await adminSupabase
      .from('exams')
      .update({ 
        translations,
        updated_at: new Date().toISOString(),
      })
      .eq('id', examId)
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return { error: 'Failed to update translations' }
    }

    return { success: true, data: exam }
  } catch (error) {
    console.error('Update translations error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function toggleExamPublished(examId: string, isPublished: boolean) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Get teacher profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return { error: 'Profile not found' }
    }

    // Verify ownership
    const { data: existingExam } = await adminSupabase
      .from('exams')
      .select('id, created_by')
      .eq('id', examId)
      .single()

    if (!existingExam || existingExam.created_by !== profile.id) {
      return { error: 'Exam not found or access denied' }
    }

    // Update published status
    const { data: exam, error: dbError } = await adminSupabase
      .from('exams')
      .update({ 
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      })
      .eq('id', examId)
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return { error: 'Failed to update exam' }
    }

    return { success: true, data: exam }
  } catch (error) {
    console.error('Toggle published error:', error)
    return { error: 'An unexpected error occurred' }
  }
}
