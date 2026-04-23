'use server'

import { createClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { toUploadErrorMessage, UPLOAD_ERROR_USER_MESSAGE } from './errors'
import { getSafeStorageFileName } from './storage-key'
import type { QuickUploadInput, UpdateDocumentInput } from './types'

export async function quickUploadDocument(input: QuickUploadInput) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) return { error: 'Profile not found' }

    const fileExtension = input.file.name.split('.').pop()?.toLowerCase()
    let fileType: 'pdf' | 'markdown' | 'text' | 'doc' | 'docx'
    if (fileExtension === 'pdf') fileType = 'pdf'
    else if (fileExtension === 'md' || fileExtension === 'markdown') fileType = 'markdown'
    else if (fileExtension === 'doc') fileType = 'doc'
    else if (fileExtension === 'docx') fileType = 'docx'
    else fileType = 'text'

    let mimeType = input.file.type
    if (!mimeType) {
      if (fileType === 'pdf') mimeType = 'application/pdf'
      else if (fileType === 'markdown') mimeType = 'text/markdown'
      else if (fileType === 'doc') mimeType = 'application/msword'
      else if (fileType === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      else mimeType = 'text/plain'
    }

    const title = input.file.name.replace(/\.[^/.]+$/, '')
    const safeFileName = getSafeStorageFileName(input.file.name)
    const filePath = `documents/${input.organizationId}/${profile.id}/${safeFileName}`

    let fileBuffer: ArrayBuffer
    try {
      fileBuffer = await input.file.arrayBuffer()
    } catch (e) {
      console.error('Upload document: arrayBuffer failed', e)
      return { error: toUploadErrorMessage(e) }
    }

    const fileBlob = new Blob([fileBuffer], { type: mimeType })

    const { error: uploadError } = await adminSupabase.storage
      .from('documents')
      .upload(filePath, fileBlob, { contentType: mimeType, upsert: false })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return { error: toUploadErrorMessage(uploadError) }
    }

    const { data: urlData } = adminSupabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    if (!urlData?.publicUrl) return { error: UPLOAD_ERROR_USER_MESSAGE }

    const { data: document, error: dbError } = await adminSupabase
      .from('documents')
      .insert({
        organization_id: input.organizationId,
        created_by: profile.id,
        class_id: null,
        title,
        description: null,
        file_name: input.file.name,
        file_path: filePath,
        file_url: urlData.publicUrl,
        file_size: input.file.size,
        mime_type: mimeType,
        file_type: fileType,
        tags: [],
        is_public: false,
        is_archived: false,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      await adminSupabase.storage.from('documents').remove([filePath])
      return { error: toUploadErrorMessage(dbError) }
    }

    return { success: true, data: document }
  } catch (error) {
    console.error('Upload document error:', error)
    return { error: toUploadErrorMessage(error) }
  }
}

export async function updateDocument(input: UpdateDocumentInput) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) return { error: 'Profile not found' }

    const { data: existingDoc } = await adminSupabase
      .from('documents')
      .select('id, created_by')
      .eq('id', input.documentId)
      .single()

    if (!existingDoc || existingDoc.created_by !== profile.id) {
      return { error: 'Document not found or access denied' }
    }

    const { data: document, error: dbError } = await adminSupabase
      .from('documents')
      .update({
        title: input.title,
        description: input.description,
        tags: input.tags ?? [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.documentId)
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return { error: 'Failed to update document' }
    }

    return { success: true, data: document }
  } catch (error) {
    console.error('Update document error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function deleteDocument(documentId: string) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) return { error: 'Profile not found' }

    const { data: existingDoc } = await adminSupabase
      .from('documents')
      .select('id, created_by, file_path')
      .eq('id', documentId)
      .single()

    if (!existingDoc || existingDoc.created_by !== profile.id) {
      return { error: 'Document not found or access denied' }
    }

    if (existingDoc.file_path) {
      await adminSupabase.storage.from('documents').remove([existingDoc.file_path])
    }

    const { error: dbError } = await adminSupabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (dbError) {
      console.error('Database error:', dbError)
      return { error: 'Failed to delete document' }
    }

    return { success: true }
  } catch (error) {
    console.error('Delete document error:', error)
    return { error: 'An unexpected error occurred' }
  }
}
