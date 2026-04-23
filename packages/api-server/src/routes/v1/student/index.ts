import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { requireRole } from '../../../middleware/auth'
import { examRepository, classRepository } from '@eduator/db'
import { createChatbot } from '@eduator/ai'

/**
 * Student routes
 * All routes require student role
 */
export async function studentRoutes(fastify: FastifyInstance): Promise<void> {
  // Apply role check to all routes
  fastify.addHook('preHandler', requireRole('student'))

  // Dashboard
  fastify.get('/dashboard', {
    schema: {
      description: 'Get student dashboard data',
      tags: ['Student'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const studentId = request.user!.profile!.id

    // Get enrolled classes
    const classes = await classRepository.getForStudent(studentId)
    const classIds = (classes as unknown as { id: string }[]).map((c) => c.id)

    // Get available exams
    const availableExams = classIds.length > 0
      ? await examRepository.getAvailableForStudent(studentId, classIds)
      : []

    return reply.send({
      success: true,
      data: {
        overview: {
          enrolled_classes: classes.length,
          available_exams: availableExams.length,
          completed_exams: 0, // Would come from submissions
          average_score: 0,
        },
        classes,
        upcoming_exams: availableExams.slice(0, 5),
      },
    })
  })

  // === CLASS ROUTES ===

  // List enrolled classes
  fastify.get('/classes', {
    schema: {
      description: 'List enrolled classes',
      tags: ['Student', 'Classes'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const studentId = request.user!.profile!.id

    const classes = await classRepository.getForStudent(studentId)

    return reply.send({
      success: true,
      data: classes,
    })
  })

  // Join class by code
  fastify.post('/classes/join', {
    schema: {
      description: 'Join a class using class code',
      tags: ['Student', 'Classes'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          code: { type: 'string' },
        },
        required: ['code'],
      },
    },
  }, async (request: FastifyRequest<{ Body: { code: string } }>, reply: FastifyReply) => {
    const studentId = request.user!.profile!.id
    const { code } = request.body

    const result = await classRepository.joinByCode(code, studentId)

    if (!result.success) {
      return reply.code(400).send({
        success: false,
        error: { code: 'JOIN_FAILED', message: result.error },
      })
    }

    return reply.send({
      success: true,
      message: 'Successfully joined class',
    })
  })

  // === EXAM ROUTES ===

  // List available exams
  fastify.get('/exams', {
    schema: {
      description: 'List available exams',
      tags: ['Student', 'Exams'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const studentId = request.user!.profile!.id

    const classes = await classRepository.getForStudent(studentId)
    const classIds = (classes as unknown as { id: string }[]).map((c) => c.id)

    if (classIds.length === 0) {
      return reply.send({
        success: true,
        data: [],
      })
    }

    const exams = await examRepository.getAvailableForStudent(studentId, classIds)

    return reply.send({
      success: true,
      data: exams,
    })
  })

  // Get exam for taking
  fastify.get('/exams/:id', {
    schema: {
      description: 'Get exam details for taking',
      tags: ['Student', 'Exams'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params
    const studentId = request.user!.profile!.id

    const exam = await examRepository.getById(id)

    if (!exam || !exam.is_published) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Exam not found' },
      })
    }

    // Check if student has already submitted
    const existingSubmission = await examRepository.getStudentSubmission(id, studentId)

    // Return exam without correct answers
    const examForStudent = {
      ...exam,
      questions: exam.questions.map((q) => ({
        id: q.id,
        type: q.type,
        question: q.question,
        options: q.options,
        difficulty: q.difficulty,
        hint: exam.settings.show_correct_answers ? q.hint : undefined,
        // Remove correct_answer and explanation
      })),
    }

    return reply.send({
      success: true,
      data: {
        exam: examForStudent,
        has_submitted: !!existingSubmission,
        submission: existingSubmission,
      },
    })
  })

  // Start exam
  fastify.post('/exams/:id/start', {
    schema: {
      description: 'Start an exam attempt',
      tags: ['Student', 'Exams'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params
    const studentId = request.user!.profile!.id

    const exam = await examRepository.getById(id)
    if (!exam || !exam.is_published) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Exam not found' },
      })
    }

    // Check existing attempts
    const existingSubmission = await examRepository.getStudentSubmission(id, studentId)
    const attemptNumber = existingSubmission ? existingSubmission.attempt_number + 1 : 1

    if (attemptNumber > exam.settings.max_attempts) {
      return reply.code(400).send({
        success: false,
        error: { code: 'MAX_ATTEMPTS', message: 'Maximum attempts reached' },
      })
    }

    const submission = await examRepository.createSubmission(id, studentId, attemptNumber)

    return reply.send({
      success: true,
      data: submission,
    })
  })

  // Submit exam
  fastify.post('/exams/:id/submit', {
    schema: {
      description: 'Submit exam answers',
      tags: ['Student', 'Exams'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          submission_id: { type: 'string' },
          answers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question_id: { type: 'string' },
                answer: {},
              },
            },
          },
          time_spent_seconds: { type: 'number' },
        },
        required: ['answers', 'time_spent_seconds'],
      },
    },
  }, async (request: FastifyRequest<{
    Params: { id: string }
    Body: {
      submission_id?: string
      answers: Array<{ question_id: string; answer: string | string[] }>
      time_spent_seconds: number
    }
  }>, reply: FastifyReply) => {
    const { id } = request.params
    const studentId = request.user!.profile!.id
    const { answers, time_spent_seconds } = request.body

    const exam = await examRepository.getById(id)
    if (!exam) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Exam not found' },
      })
    }

    // Get or create submission
    let submission = await examRepository.getStudentSubmission(id, studentId)
    if (!submission || submission.status !== 'in_progress') {
      submission = await examRepository.createSubmission(id, studentId, 1)
    }

    if (!submission) {
      return reply.code(500).send({
        success: false,
        error: { code: 'SUBMISSION_ERROR', message: 'Failed to create submission' },
      })
    }

    // Grade answers (1 per question: score = correct count, total = question count)
    let correctCount = 0
    const gradedAnswers = answers.map((answer) => {
      const question = exam.questions.find((q) => q.id === answer.question_id)
      if (!question) return { ...answer, is_correct: false, points_earned: 0 }

      const isCorrect = Array.isArray(question.correct_answer)
        ? JSON.stringify(answer.answer) === JSON.stringify(question.correct_answer)
        : answer.answer === question.correct_answer

      if (isCorrect) correctCount += 1

      return {
        ...answer,
        is_correct: isCorrect,
        points_earned: isCorrect ? 1 : 0,
      }
    })

    const totalQuestions = exam.questions.length
    const percentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0

    const submittedExam = await examRepository.submitExam(
      submission.id,
      gradedAnswers,
      time_spent_seconds
    )

    return reply.send({
      success: true,
      data: {
        submission: submittedExam,
        score: correctCount,
        total_questions: totalQuestions,
        percentage,
        passed: percentage >= exam.settings.passing_score,
      },
    })
  })

  // === CHATBOT ROUTES ===

  // Send message to chatbot
  fastify.post('/chatbot', {
    schema: {
      description: 'Send message to AI teaching assistant',
      tags: ['Student', 'Chatbot'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          conversation_id: { type: 'string' },
          context: { type: 'object' },
        },
        required: ['message'],
      },
    },
  }, async (request: FastifyRequest<{
    Body: {
      message: string
      conversation_id?: string
      context?: { subject?: string; grade_level?: string }
    }
  }>, reply: FastifyReply) => {
    const { message, context } = request.body
    const profile = request.user!.profile!

    try {
      const chatbot = createChatbot({
        student_grade_level: context?.grade_level || profile.metadata?.grade_levels?.[0],
        subject: context?.subject,
        student_preferences: {
          explanation_style: 'simple',
          language: profile.metadata?.preferred_language || 'en',
          reading_level: 'high_school',
        },
      })

      const response = await chatbot.sendMessage(message)

      return reply.send({
        success: true,
        data: response,
      })
    } catch (error) {
      request.log.error({ error }, 'Chatbot error')
      return reply.code(500).send({
        success: false,
        error: { code: 'CHATBOT_ERROR', message: 'Failed to get response' },
      })
    }
  })

  // === PROGRESS ROUTES ===

  // Get progress overview
  fastify.get('/progress', {
    schema: {
      description: 'Get student progress overview',
      tags: ['Student', 'Progress'],
      security: [{ bearerAuth: [] }],
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    // This would aggregate data from submissions (request.user!.profile!.id available when needed)
    return reply.send({
      success: true,
      data: {
        overall: {
          exams_taken: 0,
          average_score: 0,
          total_time_hours: 0,
          streak_days: 0,
        },
        by_subject: [],
        recent_activity: [],
        badges: [],
      },
    })
  })
}
