import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { requireRole } from '../../../middleware/auth'
import { normalizeLanguageCode } from '@eduator/config'
import { examRepository, classRepository, lessonRepository, teacherApiKeyRepository } from '@eduator/db'
import { tokenRepository } from '@eduator/db/repositories/tokens'
import { questionGenerator, generateLesson, generateLessonAudio } from '@eduator/ai'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { getSafeStorageFileName } from '@eduator/core/documents'
import { createExamSchema, examGenerationSchema } from '@eduator/core/validation/exam'
import type { CreateExamInput } from '@eduator/core/types/exam'
import type { Question as CoreQuestion } from '@eduator/core/types/exam'

function universalizeExamQuestion(q: CoreQuestion): CoreQuestion & {
  // UI/app field aliases
  text: string
  correctAnswer: string | string[]
  topics?: string[]
} {
  return {
    ...q,
    text: q.question,
    correctAnswer: q.correct_answer,
    // topics is what the in-app UI expects; core/API uses tags
    ...(q.tags ? { topics: q.tags } : {}),
  }
}

/**
 * Teacher routes
 * Transitional role support:
 * - teacher (legacy)
 * - school_superadmin (new primary access path)
 */
export async function teacherRoutes(fastify: FastifyInstance): Promise<void> {
  // Apply role check to all routes
  fastify.addHook('preHandler', requireRole('teacher', 'school_superadmin'))

  // Root: GET /api/v1/teacher — quick auth check and list of available endpoints
  fastify.get('/', {
    schema: {
      description: 'Teacher API root. Use this to verify your API key (200 = valid).',
      tags: ['Teacher'],
      security: [{ bearerAuth: [] }],
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      success: true,
      message: 'Teacher API ready. Your API key is valid.',
      endpoints: {
        dashboard: 'GET /api/v1/teacher/dashboard',
        tokens: 'GET /api/v1/teacher/tokens',
        exams: 'GET/POST /api/v1/teacher/exams',
        'exams/generate': 'POST /api/v1/teacher/exams/generate',
        documents: 'GET /api/v1/teacher/documents',
        'documents/upload': 'POST /api/v1/teacher/documents/upload',
        'documents/:id': 'GET /api/v1/teacher/documents/:id',
        lessons: 'GET /api/v1/teacher/lessons',
        'lessons/:id': 'GET /api/v1/teacher/lessons/:id',
        'lessons/generate': 'POST /api/v1/teacher/lessons/generate',
        classes: 'GET/POST /api/v1/teacher/classes',
        analytics: 'GET /api/v1/teacher/analytics',
      },
    })
  })

  // Dashboard
  fastify.get('/dashboard', {
    schema: {
      description: 'Get teacher dashboard data',
      tags: ['Teacher'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const teacherId = request.user!.profile!.id

    const [classes, examResult, balance] = await Promise.all([
      classRepository.getByTeacher(teacherId),
      examRepository.getByTeacher(teacherId),
      tokenRepository.getBalance(teacherId),
    ])
    const exams = examResult.data
    const examCount = examResult.count

    return reply.send({
      success: true,
      data: {
        overview: {
          total_classes: classes.length,
          total_exams: examCount,
          total_students: 0, // Would calculate from enrollments
          token_balance: balance,
        },
        recent_exams: exams.slice(0, 5),
        classes,
      },
    })
  })

  // Token balance (for third-party: check before calling exams/generate or lessons/generate)
  fastify.get('/tokens', {
    schema: {
      description: 'Get current token balance. Check before POST /exams/generate or POST /lessons/generate — both deduct tokens and return 402 if insufficient.',
      tags: ['Teacher'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                balance: { type: 'integer', example: 100 },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const teacherId = request.user!.profile!.id
    const balance = await tokenRepository.getBalance(teacherId)
    return reply.send({
      success: true,
      data: { balance },
    })
  })

  // === EXAM ROUTES ===

  // List exams
  fastify.get('/exams', {
    schema: {
      description: 'List teacher exams',
      tags: ['Teacher', 'Exams'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          per_page: { type: 'integer', default: 20 },
          class_id: { type: 'string' },
          is_published: { type: 'boolean' },
        },
      },
    },
  }, async (request: FastifyRequest<{
    Querystring: { page?: number; per_page?: number; class_id?: string; is_published?: boolean }
  }>, reply: FastifyReply) => {
    const teacherId = request.user!.profile!.id
    const { page = 1, per_page = 20, class_id, is_published } = request.query

    const { data, count } = await examRepository.getByTeacher(teacherId, {
      page,
      perPage: per_page,
      classId: class_id,
      isPublished: is_published,
    })

    return reply.send({
      success: true,
      data: {
        items: data,
        pagination: {
          page,
          per_page,
          total: count,
          total_pages: Math.ceil(count / per_page),
        },
      },
    })
  })

  // Get single exam
  fastify.get('/exams/:id', {
    schema: {
      description: 'Get exam by ID',
      tags: ['Teacher', 'Exams'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params
    const teacherId = request.user!.profile!.id

    const exam = await examRepository.getByIdWithQuestions(id)

    if (!exam || exam.created_by !== teacherId) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Exam not found' },
      })
    }

    return reply.send({
      success: true,
      data: exam,
    })
  })

  // Create exam
  fastify.post('/exams', {
    schema: {
      description: 'Create new exam',
      tags: ['Teacher', 'Exams'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest<{ Body: CreateExamInput }>, reply: FastifyReply) => {
    const validation = createExamSchema.safeParse(request.body)
    if (!validation.success) {
      return reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: validation.error.errors },
      })
    }

    const organizationId = request.user!.profile!.organization_id!
    const teacherId = request.user!.profile!.id

    const exam = await examRepository.create(organizationId, teacherId, validation.data)

    if (!exam) {
      return reply.code(500).send({
        success: false,
        error: { code: 'CREATE_FAILED', message: 'Failed to create exam' },
      })
    }

    return reply.code(201).send({
      success: true,
      data: exam,
    })
  })

  // Generate exam with AI (supports document_text, document_id, or document_ids; RAG used for stored documents)
  fastify.post('/exams/generate', {
    schema: {
      description: 'Generate exam questions using AI. Use document_id or document_ids for RAG-based generation from uploaded documents.',
      tags: ['Teacher', 'Exams', 'AI'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest<{ Body: {
    document_text?: string
    document_id?: string
    document_ids?: string[]
    title?: string
    subject?: string
    grade_level?: string
    settings: {
      question_count: number
      difficulty_distribution: { easy: number; medium: number; hard: number }
      question_types: string[]
      include_explanations?: boolean
      include_hints?: boolean
    }
    custom_instructions?: string
    topics?: string
    language?: string
  } }>, reply: FastifyReply) => {
    const validation = examGenerationSchema.safeParse(request.body)
    if (!validation.success) {
      return reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: validation.error.errors },
      })
    }

    const { document_text, document_id, document_ids, title, subject, grade_level, settings, custom_instructions, topics, language } = validation.data
    const organizationId = request.user!.profile!.organization_id!
    const teacherId = request.user!.profile!.id
    const userId = request.user!.id

    let documentText: string
    if (document_text && document_text.trim().length >= 50) {
      documentText = document_text
    } else if (document_id || (document_ids && document_ids.length > 0)) {
      const ids = document_ids ?? (document_id ? [document_id] : [])
      const adminSupabase = createAdminClient()
      const { data: docs } = await adminSupabase
        .from('documents')
        .select('id')
        .in('id', ids)
        .eq('created_by', teacherId)
        .eq('organization_id', organizationId)
      if (!docs?.length) {
        return reply.code(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document(s) not found or access denied' },
        })
      }
      const query = topics?.trim() || custom_instructions?.trim() || 'exam questions'
      const { getRelevantContentFromDocuments } = await import('@eduator/ai/services/document-rag')
      documentText = await getRelevantContentFromDocuments(docs.map((d) => d.id), userId, query, 5)
      if (!documentText || documentText.trim().length < 50) {
        return reply.code(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Document(s) not ready or empty. Upload documents first and wait for processing (check GET /documents/:id for processing_status).' },
        })
      }
    } else {
      return reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Provide document_text, document_id, or document_ids' },
      })
    }

    const tokenDeduct = await tokenRepository.deductTokensForAction(teacherId, 'exam_generation', { question_count: settings.question_count })
    if (!tokenDeduct.success) {
      return reply.code(402).send({
        success: false,
        error: { code: 'INSUFFICIENT_TOKENS', message: tokenDeduct.errorMessage ?? 'Insufficient tokens' },
      })
    }

    try {
      request.log.info({ questionCount: settings.question_count }, 'Starting AI exam generation')

      const result = await questionGenerator.generateFromDocument({
        documentText,
        settings: {
          question_count: settings.question_count,
          difficulty_distribution: settings.difficulty_distribution,
          question_types: settings.question_types as ('multiple_choice' | 'multiple_select' | 'fill_blank' | 'true_false')[],
          include_explanations: settings.include_explanations ?? true,
          include_hints: settings.include_hints ?? false,
        },
        subject,
        gradeLevel: grade_level,
        language,
        customInstructions: custom_instructions,
      })

      request.log.info({
        questionsGenerated: result.questions.length,
        tokensUsed: result.tokensUsed,
        timeMs: result.generationTimeMs,
      }, 'AI exam generation completed')

      const universalQuestions = result.questions.map(universalizeExamQuestion)

      // Optionally create exam in database (pass language so DB stores the same language as generated content)
      const exam = await examRepository.create(organizationId, teacherId, {
        title: title || 'Generated Exam',
        subject,
        grade_level,
        language: language ?? 'en',
        settings: {
          question_count: settings.question_count,
          difficulty_distribution: settings.difficulty_distribution,
          question_types: settings.question_types as ('multiple_choice' | 'multiple_select' | 'fill_blank' | 'true_false')[],
          time_limit_minutes: 60,
          shuffle_questions: true,
          shuffle_options: true,
          show_results_immediately: true,
          show_correct_answers: true,
          allow_review: true,
          passing_score: 60,
          max_attempts: 1,
          require_webcam: false,
          require_lockdown: false,
        },
      })

      if (exam) {
        // Store universal shape so exams created via API render correctly in-app too
        await examRepository.updateQuestions(exam.id, universalQuestions as any)
      }

      // Record usage before sending so serverless runtimes don't miss it (onResponse may run after process freezes)
      const apiKeyId = (request as { apiKeyId?: string }).apiKeyId
      if (apiKeyId) {
        await teacherApiKeyRepository.recordUsage({
          apiKeyId,
          method: 'POST',
          endpoint: (request as { routeOptions?: { url?: string } }).routeOptions?.url ?? '/api/v1/teacher/exams/generate',
          status: 'success',
          statusCode: 200,
        }).catch((err) => request.log.warn({ err }, 'Failed to record API usage'))
      }

      return reply.send({
        success: true,
        data: {
          exam_id: exam?.id,
          // Return universal question shape (keeps original API fields + adds UI aliases)
          questions: universalQuestions,
          generation_time_ms: result.generationTimeMs,
          tokens_used: result.tokensUsed,
          warnings: result.warnings,
        },
      })
    } catch (error) {
      const cost = tokenDeduct.cost ?? 0
      if (cost > 0) {
        await tokenRepository.addTokens(teacherId, cost, 'refund', undefined, { reason: 'ai_failed' }).catch((err) =>
          request.log.warn({ err }, 'Failed to refund tokens after exam generation failure')
        )
      }
      request.log.error({ error }, 'AI exam generation failed')
      const apiKeyId = (request as { apiKeyId?: string }).apiKeyId
      if (apiKeyId) {
        await teacherApiKeyRepository.recordUsage({
          apiKeyId,
          method: 'POST',
          endpoint: (request as { routeOptions?: { url?: string } }).routeOptions?.url ?? '/api/v1/teacher/exams/generate',
          status: 'error',
          statusCode: 500,
        }).catch((err) => request.log.warn({ err }, 'Failed to record API usage'))
      }
      return reply.code(500).send({
        success: false,
        error: { code: 'GENERATION_FAILED', message: (error as Error).message },
      })
    }
  })

  // Update exam
  fastify.put('/exams/:id', {
    schema: {
      description: 'Update exam',
      tags: ['Teacher', 'Exams'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>, reply: FastifyReply) => {
    const { id } = request.params
    const teacherId = request.user!.profile!.id

    // Verify ownership
    const existing = await examRepository.getById(id)
    if (!existing || existing.created_by !== teacherId) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Exam not found' },
      })
    }

    const updated = await examRepository.update(id, request.body)

    return reply.send({
      success: true,
      data: updated,
    })
  })

  // Publish exam
  fastify.patch('/exams/:id/publish', {
    schema: {
      description: 'Publish exam',
      tags: ['Teacher', 'Exams'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params
    const teacherId = request.user!.profile!.id

    const existing = await examRepository.getById(id)
    if (!existing || existing.created_by !== teacherId) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Exam not found' },
      })
    }

    await examRepository.setPublished(id, true)

    return reply.send({
      success: true,
      message: 'Exam published successfully',
    })
  })

  // Delete exam
  fastify.delete('/exams/:id', {
    schema: {
      description: 'Delete exam',
      tags: ['Teacher', 'Exams'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params
    const teacherId = request.user!.profile!.id

    const existing = await examRepository.getById(id)
    if (!existing || existing.created_by !== teacherId) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Exam not found' },
      })
    }

    await examRepository.delete(id)

    return reply.send({
      success: true,
      message: 'Exam deleted successfully',
    })
  })

  // === DOCUMENT ROUTES (upload → RAG → use in exams/lessons) ===

  // List teacher documents (for API: pick document_id for exam/lesson generation)
  fastify.get('/documents', {
    schema: {
      description: 'List teacher documents. Use document id in exams/generate or lessons/generate.',
      tags: ['Teacher', 'Documents'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          per_page: { type: 'integer', default: 20 },
        },
      },
    },
  }, async (request: FastifyRequest<{
    Querystring: { page?: number; per_page?: number }
  }>, reply: FastifyReply) => {
    const profile = request.user!.profile!
    const orgId = profile.organization_id
    const createdBy = profile.id
    if (!orgId) {
      return reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Profile has no organization' },
      })
    }
    const { page = 1, per_page = 20 } = request.query
    const from = (page - 1) * per_page
    const to = from + per_page - 1
    const adminSupabase = createAdminClient()
    const [listResult, countResult] = await Promise.all([
      adminSupabase
        .from('documents')
        .select('id, title, file_name, file_type, processing_status, created_at')
        .eq('organization_id', orgId)
        .eq('created_by', createdBy)
        .order('created_at', { ascending: false })
        .range(from, to),
      adminSupabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('created_by', createdBy),
    ])
    const { data: items, error } = listResult
    if (error) {
      request.log.error({ error }, 'List documents failed')
      return reply.code(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
      })
    }
    const count = countResult.count ?? 0
    return reply.send({
      success: true,
      data: {
        items: items ?? [],
pagination: {
        page,
        per_page,
        total: count,
        total_pages: Math.ceil(count / per_page),
      },
      },
    })
  })

  // Get single document (e.g. to poll processing_status after upload)
  fastify.get('/documents/:id', {
    schema: {
      description: 'Get document by ID. Check processing_status before using in exam/lesson generation.',
      tags: ['Teacher', 'Documents'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params
    const profile = request.user!.profile!
    const adminSupabase = createAdminClient()
    const { data: doc, error } = await adminSupabase
      .from('documents')
      .select('id, title, file_name, file_type, file_size, processing_status, created_at')
      .eq('id', id)
      .eq('organization_id', profile.organization_id!)
      .eq('created_by', profile.id)
      .single()
    if (error || !doc) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found' },
      })
    }
    return reply.send({ success: true, data: doc })
  })

  // Upload document (PDF/text/markdown) → stored and RAG processed in background
  fastify.post('/documents/upload', {
    schema: {
      description: 'Upload a document. File is stored and RAG processing runs in background. Use GET /documents/:id to poll processing_status, then use document id in exams/generate or lessons/generate.',
      tags: ['Teacher', 'Documents', 'AI'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const profile = request.user!.profile!
    const orgId = profile.organization_id
    const createdBy = profile.id
    const userId = request.user!.id
    if (!orgId) {
      return reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Profile has no organization' },
      })
    }
    const data = await (request as unknown as { file: () => Promise<{ filename: string; mimetype: string; toBuffer: () => Promise<Buffer> } | undefined> }).file()
    if (!data) {
      return reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No file in request. Send multipart/form-data with a file field.' },
      })
    }
    const buffer = await data.toBuffer()
    const MAX_SIZE = 15 * 1024 * 1024 // 15MB
    if (buffer.length > MAX_SIZE) {
      return reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'File size must be 15MB or less.' },
      })
    }
    const allowedExtensions = ['.pdf', '.md', '.markdown', '.txt', '.doc', '.docx']
    const fileExtension = data.filename.split('.').pop()?.toLowerCase() ?? ''
    const ext = fileExtension ? `.${fileExtension}` : ''
    if (!allowedExtensions.includes(ext)) {
      return reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Allowed formats: PDF, Word (.doc, .docx), Markdown (.md), or Text (.txt).' },
      })
    }
    let fileType: 'pdf' | 'markdown' | 'text' | 'doc' | 'docx' = 'text'
    if (fileExtension === 'pdf') fileType = 'pdf'
    else if (fileExtension === 'md' || fileExtension === 'markdown') fileType = 'markdown'
    else if (fileExtension === 'doc') fileType = 'doc'
    else if (fileExtension === 'docx') fileType = 'docx'
    let mimeType = data.mimetype || 'application/octet-stream'
    if (fileType === 'pdf') mimeType = 'application/pdf'
    else if (fileType === 'markdown') mimeType = 'text/markdown'
    else if (fileType === 'doc') mimeType = 'application/msword'
    else if (fileType === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    else mimeType = 'text/plain'
    const title = data.filename.replace(/\.[^/.]+$/, '')
    const safeFileName = getSafeStorageFileName(data.filename)
    const filePath = `documents/${orgId}/${createdBy}/${safeFileName}`
    const adminSupabase = createAdminClient()
    const { error: uploadError } = await adminSupabase.storage
      .from('documents')
      .upload(filePath, buffer, { contentType: mimeType, upsert: false })
    if (uploadError) {
      request.log.error({ error: uploadError }, 'Document storage upload failed')
      return reply.code(500).send({
        success: false,
        error: { code: 'UPLOAD_FAILED', message: uploadError.message },
      })
    }
    const { data: urlData } = adminSupabase.storage.from('documents').getPublicUrl(filePath)
    const { data: document, error: dbError } = await adminSupabase
      .from('documents')
      .insert({
        organization_id: orgId,
        created_by: createdBy,
        class_id: null,
        title,
        description: null,
        file_name: data.filename,
        file_path: filePath,
        file_url: urlData?.publicUrl ?? '',
        file_size: buffer.length,
        mime_type: mimeType,
        file_type: fileType,
        tags: [],
        is_public: false,
        is_archived: false,
      })
      .select()
      .single()
    if (dbError || !document) {
      await adminSupabase.storage.from('documents').remove([filePath]).catch(() => {})
      request.log.error({ error: dbError }, 'Document record create failed')
      return reply.code(500).send({
        success: false,
        error: { code: 'CREATE_FAILED', message: dbError?.message ?? 'Failed to create document record' },
      })
    }
    const { processDocumentOnUpload } = await import('@eduator/ai/services/document-rag')
    try {
      await processDocumentOnUpload(document.id, userId)
    } catch (err) {
      request.log.warn({ err, documentId: document.id }, 'Document RAG processing failed')
    }
    const { data: updatedDoc } = await adminSupabase
      .from('documents')
      .select('processing_status, processing_error_message')
      .eq('id', document.id)
      .single()
    const status = updatedDoc?.processing_status ?? 'processing'
    return reply.code(201).send({
      success: true,
      data: {
        document_id: document.id,
        title: document.title,
        file_name: document.file_name,
        processing_status: status,
        processing_error_message: updatedDoc?.processing_error_message ?? undefined,
        message: status === 'completed'
          ? 'Document uploaded and processed. Ready for exam/lesson generation.'
          : status === 'failed'
            ? 'Document uploaded but processing failed.'
            : 'Poll GET /documents/:id for processing_status.',
      },
    })
  })

  // Generate lesson from stored document (RAG)
  fastify.post('/lessons/generate', {
    schema: {
      description: 'Generate a lesson from a stored document (RAG). Use language as 2-letter code (en, az, ru, tr, de, fr, es, ar) — same as exam generation. Choose content: text only (default), with images, with audio, or full.',
      tags: ['Teacher', 'Lessons', 'AI'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest<{ Body: {
    document_id: string
    topic: string
    class_id?: string | null
    /** 2-letter language code (en, az, ru, tr, de, fr, es, ar). Default: en. */
    language?: string
    /** Preset: "text" (default), "text_and_images", "text_and_audio", "full". Ignored if options.includeImages/includeAudio are set. */
    include?: 'text' | 'text_and_images' | 'text_and_audio' | 'full'
    /** Optional: teacher-provided learning objectives (e.g. newline-separated). AI uses these instead of generating its own. */
    objectives?: string
    /** Optional: target grade level (e.g. grade_9, grade_10, undergraduate). AI tailors complexity and examples. */
    grade_level?: string
    options?: { includeImages?: boolean; includeAudio?: boolean; centerText?: boolean; includeTables?: boolean; includeFigures?: boolean; includeCharts?: boolean; contentLength?: 'short' | 'medium' | 'full' }
  } }>, reply: FastifyReply) => {
    const body = request.body as {
      document_id: string
      topic: string
      class_id?: string | null
      language?: string
      include?: 'text' | 'text_and_images' | 'text_and_audio' | 'full'
      objectives?: string
      grade_level?: string
      options?: { includeImages?: boolean; includeAudio?: boolean; centerText?: boolean; includeTables?: boolean; includeFigures?: boolean; includeCharts?: boolean; contentLength?: 'short' | 'medium' | 'full' }
    }
    const { document_id, topic, class_id, language, include, objectives, grade_level, options } = body
    if (!document_id || !topic?.trim()) {
      return reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'document_id and topic are required' },
      })
    }
    const profile = request.user!.profile!
    const orgId = profile.organization_id
    const userId = request.user!.id
    if (!orgId) {
      return reply.code(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Profile has no organization' },
      })
    }
    const adminSupabase = createAdminClient()
    const { data: document, error: docError } = await adminSupabase
      .from('documents')
      .select('id, title, organization_id, created_by')
      .eq('id', document_id)
      .single()
    if (docError || !document || document.organization_id !== orgId || document.created_by !== profile.id) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found or access denied' },
      })
    }
    const genOptions = options ?? {}
    const contentOptions = {
      includeTables: genOptions.includeTables !== false,
      includeFigures: genOptions.includeFigures === true,
      includeCharts: genOptions.includeCharts === true,
      contentLength: (genOptions.contentLength ?? 'medium') as 'short' | 'medium' | 'full',
    }
    // Resolve includeImages / includeAudio: preset "include" or explicit options (default: text only)
    let includeImages: boolean
    let includeAudio: boolean
    if (typeof genOptions.includeImages === 'boolean' || typeof genOptions.includeAudio === 'boolean') {
      includeImages = genOptions.includeImages === true
      includeAudio = genOptions.includeAudio === true
    } else {
      const preset = include ?? 'text'
      switch (preset) {
        case 'text':
          includeImages = false
          includeAudio = false
          break
        case 'text_and_images':
          includeImages = true
          includeAudio = false
          break
        case 'text_and_audio':
          includeImages = false
          includeAudio = true
          break
        case 'full':
          includeImages = true
          includeAudio = true
          break
        default:
          includeImages = false
          includeAudio = false
      }
    }
    const lessonId = crypto.randomUUID()
    // Normalize so we accept both 2-letter code and full name (e.g. Azerbaijani -> az)
    const rawLanguage = language && typeof language === 'string' ? language.trim() : ''
    const selectedLanguage = normalizeLanguageCode(rawLanguage || undefined)

    const tokenDeduct = await tokenRepository.deductTokensForAction(profile.id, 'lesson_generation', {
      include_images: includeImages,
      include_audio: includeAudio,
      image_count: includeImages ? 3 : 0,
    })
    if (!tokenDeduct.success) {
      return reply.code(402).send({
        success: false,
        error: { code: 'INSUFFICIENT_TOKENS', message: tokenDeduct.errorMessage ?? 'Insufficient tokens' },
      })
    }

    try {
      const generatedLesson = await generateLesson(
        document_id,
        topic.trim(),
        userId,
        selectedLanguage,
        includeImages,
        lessonId,
        contentOptions,
        undefined, // documentIds (multi-doc) — REST uses single document_id
        objectives?.trim() || undefined,
        grade_level?.trim() || undefined
      )
      // Store raw markdown only (same as course generation). Center text is applied at render from metadata.generation_options.centerText.
      const lessonImages = includeImages ? (generatedLesson.images ?? []) : []
      const savedLesson = await lessonRepository.create({
        id: lessonId,
        organization_id: orgId,
        created_by: profile.id,
        class_id: class_id ?? null,
        document_id,
        title: generatedLesson.title,
        topic: generatedLesson.title,
        description: `AI-generated lesson: ${generatedLesson.title}`,
        duration_minutes: generatedLesson.duration_minutes ?? 10,
        content: { text: generatedLesson.content },
        images: lessonImages,
        mini_test: generatedLesson.mini_test ?? [],
        learning_objectives: generatedLesson.learning_objectives ?? [],
        grade_level: grade_level?.trim() || null,
        prerequisites: [],
        materials: [],
        language: selectedLanguage,
        metadata: {
          examples: generatedLesson.examples,
          source_document: document.title,
          language: selectedLanguage,
          ai_generated: true,
          original_topic_request: topic.trim(),
          custom_objectives: objectives?.trim() || undefined,
          grade_level: grade_level?.trim() || undefined,
          generation_options: {
            includeImages,
            includeAudio,
            centerText: genOptions.centerText !== false,
            includeTables: contentOptions.includeTables,
            includeFigures: contentOptions.includeFigures,
            includeCharts: contentOptions.includeCharts,
            contentLength: contentOptions.contentLength,
          },
        },
      })
      if (includeAudio) {
        generateLessonAudio(savedLesson.id, generatedLesson.title, generatedLesson.content, selectedLanguage)
          .then(async (audioUrl) => {
            if (audioUrl) await lessonRepository.updateAudioUrl(savedLesson.id, audioUrl)
          })
          .catch((err) => request.log.warn({ err }, 'Lesson TTS failed'))
      }

      const apiKeyId = (request as { apiKeyId?: string }).apiKeyId
      if (apiKeyId) {
        await teacherApiKeyRepository.recordUsage({
          apiKeyId,
          method: 'POST',
          endpoint: (request as { routeOptions?: { url?: string } }).routeOptions?.url ?? '/api/v1/teacher/lessons/generate',
          status: 'success',
          statusCode: 201,
        }).catch((err) => request.log.warn({ err }, 'Failed to record API usage'))
      }

      return reply.code(201).send({
        success: true,
        data: {
          lesson_id: savedLesson.id,
          title: savedLesson.title,
          topic: savedLesson.topic,
          content: typeof savedLesson.content === 'object' && savedLesson.content && 'text' in savedLesson.content
            ? (savedLesson.content as { text: string }).text
            : savedLesson.content,
          images: savedLesson.images,
          audio_url: savedLesson.audio_url ?? null,
          mini_test: savedLesson.mini_test,
          document_id: savedLesson.document_id,
          created_at: savedLesson.created_at,
        },
      })
    } catch (error) {
      const cost = tokenDeduct.cost ?? 0
      if (cost > 0) {
        await tokenRepository.addTokens(profile.id, cost, 'refund', undefined, { reason: 'ai_failed' }).catch((err) =>
          request.log.warn({ err }, 'Failed to refund tokens after lesson generation failure')
        )
      }
      request.log.error({ error }, 'Lesson generation failed')
      const apiKeyId = (request as { apiKeyId?: string }).apiKeyId
      if (apiKeyId) {
        await teacherApiKeyRepository.recordUsage({
          apiKeyId,
          method: 'POST',
          endpoint: (request as { routeOptions?: { url?: string } }).routeOptions?.url ?? '/api/v1/teacher/lessons/generate',
          status: 'error',
          statusCode: 500,
        }).catch((err) => request.log.warn({ err }, 'Failed to record API usage'))
      }
      return reply.code(500).send({
        success: false,
        error: { code: 'GENERATION_FAILED', message: (error as Error).message },
      })
    }
  })

  // List lessons
  fastify.get('/lessons', {
    schema: {
      description: 'List teacher lessons. Use lesson id in GET /lessons/:id to fetch full lesson (images, audio_url).',
      tags: ['Teacher', 'Lessons'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          per_page: { type: 'integer', default: 20 },
          class_id: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest<{
    Querystring: { page?: number; per_page?: number; class_id?: string }
  }>, reply: FastifyReply) => {
    const teacherId = request.user!.profile!.id
    const organizationId = request.user!.profile!.organization_id!
    const { page = 1, per_page = 20, class_id } = request.query
    const limit = Math.min(per_page, 100)
    const offset = (page - 1) * limit

    const { lessons, total } = await lessonRepository.listByTeacher(teacherId, organizationId, {
      classId: class_id ?? null,
      includeArchived: false,
      limit,
      offset,
    })

    return reply.send({
      success: true,
      data: {
        items: lessons.map((l) => ({
          id: l.id,
          title: l.title,
          topic: l.topic,
          document_id: l.document_id,
          duration_minutes: l.duration_minutes,
          has_images: Array.isArray(l.images) && l.images.length > 0,
          has_audio: !!l.audio_url,
          created_at: l.created_at,
        })),
        pagination: {
          page,
          per_page: limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      },
    })
  })

  // Get single lesson (full content, images, audio_url)
  fastify.get('/lessons/:id', {
    schema: {
      description: 'Get lesson by ID. Returns full content, images (public URLs), and audio_url (when TTS is ready). Use this to get image and audio URLs for third-party display.',
      tags: ['Teacher', 'Lessons'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params
    const teacherId = request.user!.profile!.id

    const lesson = await lessonRepository.getById(id, teacherId)

    if (!lesson) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Lesson not found' },
      })
    }

    const contentText = typeof lesson.content === 'object' && lesson.content && 'text' in lesson.content
      ? (lesson.content as { text: string }).text
      : lesson.content

    return reply.send({
      success: true,
      data: {
        id: lesson.id,
        title: lesson.title,
        topic: lesson.topic,
        description: lesson.description,
        document_id: lesson.document_id,
        class_id: lesson.class_id,
        duration_minutes: lesson.duration_minutes,
        content: contentText,
        images: lesson.images ?? [],
        audio_url: lesson.audio_url ?? null,
        mini_test: lesson.mini_test ?? [],
        learning_objectives: lesson.learning_objectives ?? [],
        metadata: lesson.metadata,
        created_at: lesson.created_at,
        updated_at: lesson.updated_at,
      },
    })
  })

  // === CLASS ROUTES ===

  // List classes
  fastify.get('/classes', {
    schema: {
      description: 'List teacher classes',
      tags: ['Teacher', 'Classes'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const teacherId = request.user!.profile!.id

    const classes = await classRepository.getByTeacher(teacherId)

    return reply.send({
      success: true,
      data: classes,
    })
  })

  // Create class
  fastify.post('/classes', {
    schema: {
      description: 'Create new class',
      tags: ['Teacher', 'Classes'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest<{ Body: { name: string; description?: string; subject?: string; grade_level?: string } }>, reply: FastifyReply) => {
    const organizationId = request.user!.profile!.organization_id!
    const teacherId = request.user!.profile!.id

    const newClass = await classRepository.create(organizationId, teacherId, request.body)

    if (!newClass) {
      return reply.code(500).send({
        success: false,
        error: { code: 'CREATE_FAILED', message: 'Failed to create class' },
      })
    }

    return reply.code(201).send({
      success: true,
      data: newClass,
    })
  })

  // Get class students
  fastify.get('/classes/:id/students', {
    schema: {
      description: 'Get students in class',
      tags: ['Teacher', 'Classes'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params
    const teacherId = request.user!.profile!.id

    const classData = await classRepository.getById(id)
    if (!classData || classData.teacher_id !== teacherId) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Class not found' },
      })
    }

    const students = await classRepository.getStudents(id)

    return reply.send({
      success: true,
      data: students,
    })
  })

  // Analytics
  fastify.get('/analytics', {
    schema: {
      description: 'Get teacher analytics',
      tags: ['Teacher', 'Analytics'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const teacherId = request.user!.profile!.id

    const classes = await classRepository.getByTeacher(teacherId)
    const { count: examCount } = await examRepository.getByTeacher(teacherId)

    return reply.send({
      success: true,
      data: {
        summary: {
          total_classes: classes.length,
          total_exams: examCount,
          total_students: 0,
          average_score: 0,
        },
        classes: classes.map((c) => ({
          id: c.id,
          name: c.name,
          student_count: 0,
          average_score: 0,
        })),
      },
    })
  })
}
