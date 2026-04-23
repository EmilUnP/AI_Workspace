'use server'

import {
  quickUploadDocument as coreQuickUpload,
  updateDocument as coreUpdate,
  deleteDocument as coreDelete,
} from '@eduator/core/documents/actions'
import type { QuickUploadInput, UpdateDocumentInput } from '@eduator/core/documents'
import { createClient } from '@eduator/auth/supabase/server'
import { processDocumentOnUpload } from '@eduator/ai/services/document-rag'
import { tokenRepository } from '@eduator/db/repositories/tokens'

export async function quickUploadDocument(input: QuickUploadInput) {
  await tokenRepository.ensureRagIndexingSetting()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!profile) return { success: false, error: 'Profile not found' }

  const tokenDeduct = await tokenRepository.deductTokensForAction(profile.id, 'rag_indexing', {
    document_count: 1,
  })
  if (!tokenDeduct.success) {
    return { success: false, error: tokenDeduct.errorMessage ?? 'Insufficient tokens' }
  }

  const result = await coreQuickUpload(input)
  if (!result.success) {
    if ((tokenDeduct.cost ?? 0) > 0) {
      await tokenRepository
        .addTokens(profile.id, tokenDeduct.cost!, 'refund', undefined, { reason: 'upload_failed' })
        .catch(() => {})
    }
    return result
  }

  if (result.data) {
    processDocumentOnUpload(result.data.id, user.id)
      .then(async () => {
        const { data: doc } = await supabase
          .from('documents')
          .select('total_tokens, chunk_count, content_language')
          .eq('id', result.data!.id)
          .eq('created_by', profile.id)
          .single()
        await tokenRepository
          .attachMetadataToLatestUsageTransaction(profile.id, 'rag_indexing', {
            input_tokens: doc?.total_tokens ?? 0,
            output_tokens: 0,
            total_tokens: doc?.total_tokens ?? 0,
            chunk_count: doc?.chunk_count ?? 0,
            content_language: doc?.content_language ?? null,
            model_used: 'gemini_embedding',
          })
          .catch(() => {})
      })
      .catch((err: unknown) => {
        console.error('Background document processing failed:', err)
      })
  }
  return result
}

export async function updateDocument(input: UpdateDocumentInput) {
  return coreUpdate(input)
}

export async function deleteDocument(documentId: string) {
  return coreDelete(documentId)
}
