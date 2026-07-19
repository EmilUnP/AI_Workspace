import type { FastifyInstance, FastifyReply } from 'fastify'
import { readOptionalExternalUserId, resolveOwnerScope } from '../lib/chat-scope.js'
import { AiService } from '../services/ai.service.js'
import { DocumentRagService } from '../services/document-rag.service.js'
import { TeacherChatbotService } from '../services/teacher-chatbot.service.js'
import { LessonAiService } from '../services/lesson-ai.service.js'
import { ExamAiService } from '../services/exam-ai.service.js'
import { EducationPlanAiService } from '../services/education-plan-ai.service.js'
import { TranslatorAiService } from '../services/translator-ai.service.js'
import { MediaAiService } from '../services/media-ai.service.js'

export async function aiRoutes(app: FastifyInstance) {
  const aiService = new AiService(app)
  const ragService = new DocumentRagService(app)
  const chatService = new TeacherChatbotService(app)
  const lessonService = new LessonAiService(app)
  const examService = new ExamAiService(app)
  const planService = new EducationPlanAiService(app)
  const translatorService = new TranslatorAiService(app)
  const mediaService = new MediaAiService(app)

  app.post('/ai/requests', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) {
      reply.code(401).send({ error: 'Unauthorized' })
      return
    }
    const aiRequest = await aiService.create(userId, request.body)
    reply.code(201).send({ request: aiRequest })
  })

  app.get('/ai/requests/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) {
      reply.code(401).send({ error: 'Unauthorized' })
      return
    }
    const id = (request.params as { id: string }).id
    const aiRequest = await aiService.getById(userId, id)
    if (!aiRequest) {
      reply.code(404).send({ error: 'AI request not found' })
      return
    }
    reply.send({ request: aiRequest })
  })

  app.post('/ai/rag/retrieve', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const result = await ragService.retrieve(userId, request.body)
    reply.send(result)
  })

  const sendChatError = (reply: FastifyReply, error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : String(error)
    const statusCode = (error as { statusCode?: number })?.statusCode ?? 500
    const code = (error as { code?: string })?.code
    const hint = (error as { hint?: string })?.hint
    reply.code(statusCode).send({ error: message || fallback, code, hint })
  }

  app.get('/ai/chat/assistants', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const scope = resolveOwnerScope(request)
      const items = await chatService.listAssistants(scope)
      reply.send({ items })
    } catch (error) {
      sendChatError(reply, error, 'Failed to list assistants')
    }
  })

  app.post('/ai/chat/assistants', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const scope = resolveOwnerScope(request)
      const body = request.body as { title?: string; documentIds?: string[] }
      const assistant = await chatService.createAssistant(scope, body?.title, body?.documentIds)
      reply.code(201).send({ assistant })
    } catch (error) {
      request.log.error({ error, userId: request.authUser?.sub }, 'Create chat assistant failed')
      sendChatError(reply, error, 'Failed to create assistant')
    }
  })

  app.get('/ai/chat/assistants/:assistantId', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const scope = resolveOwnerScope(request)
      const assistantId = (request.params as { assistantId: string }).assistantId
      const assistant = await chatService.getAssistant(scope, assistantId)
      if (!assistant) return reply.code(404).send({ error: 'Assistant not found' })
      reply.send({ assistant })
    } catch (error) {
      sendChatError(reply, error, 'Failed to load assistant')
    }
  })

  app.patch('/ai/chat/assistants/:assistantId', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const scope = resolveOwnerScope(request)
      const assistantId = (request.params as { assistantId: string }).assistantId
      const assistant = await chatService.updateAssistant(scope, assistantId, request.body)
      if (!assistant) return reply.code(404).send({ error: 'Assistant not found' })
      reply.send({ assistant })
    } catch (error) {
      sendChatError(reply, error, 'Failed to update assistant')
    }
  })

  app.delete('/ai/chat/assistants/:assistantId', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const scope = resolveOwnerScope(request)
      const assistantId = (request.params as { assistantId: string }).assistantId
      const ok = await chatService.deleteAssistant(scope, assistantId)
      if (!ok) return reply.code(404).send({ error: 'Assistant not found' })
      reply.send({ success: true })
    } catch (error) {
      sendChatError(reply, error, 'Failed to delete assistant')
    }
  })

  app.get('/ai/chat/assistants/:assistantId/conversations', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const scope = resolveOwnerScope(request)
      const assistantId = (request.params as { assistantId: string }).assistantId
      const externalUserId = readOptionalExternalUserId(request)
      const result = await chatService.listConversations(scope, assistantId, externalUserId)
      if (!result) return reply.code(404).send({ error: 'Assistant not found' })
      reply.send(result)
    } catch (error) {
      sendChatError(reply, error, 'Failed to list conversations')
    }
  })

  app.post('/ai/chat/assistants/:assistantId/conversations', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const scope = resolveOwnerScope(request)
      const assistantId = (request.params as { assistantId: string }).assistantId
      const body = request.body as { title?: string; externalUserId?: string }
      const externalUserId = readOptionalExternalUserId(request)
      const created = await chatService.createConversation(
        scope,
        assistantId,
        body?.title,
        externalUserId
      )
      reply.code(201).send({ conversation: created, assistant: created.assistant })
    } catch (error) {
      sendChatError(reply, error, 'Failed to create conversation')
    }
  })

  /** @deprecated Prefer POST /ai/chat/assistants then POST .../conversations */
  app.post('/ai/chat/conversations', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const scope = resolveOwnerScope(request)
      const body = request.body as { title?: string; documentIds?: string[] }
      const externalUserId = readOptionalExternalUserId(request)
      const { assistant, conversation } = await chatService.createAssistantWithConversation(
        scope,
        body?.title,
        body?.documentIds,
        undefined,
        externalUserId
      )
      reply.code(201).send({
        assistant,
        conversation,
        deprecated: 'Use POST /ai/chat/assistants and POST /ai/chat/assistants/:id/conversations',
      })
    } catch (error) {
      request.log.error({ error, userId: request.authUser?.sub }, 'Create chat (legacy) failed')
      sendChatError(reply, error, 'Failed to create chat')
    }
  })

  app.get('/ai/chat/conversations/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const scope = resolveOwnerScope(request)
      const id = (request.params as { id: string }).id
      const payload = await chatService.getConversation(scope, id)
      if (!payload) return reply.code(404).send({ error: 'Conversation not found' })
      reply.send(payload)
    } catch (error) {
      sendChatError(reply, error, 'Failed to load conversation')
    }
  })

  app.post('/ai/chat/conversations/:id/messages', { preHandler: [app.authenticate] }, async (request, reply) => {
    const id = (request.params as { id: string }).id
    try {
      const scope = resolveOwnerScope(request)
      const result = await chatService.sendMessage(scope, id, request.body)
      reply.send(result)
    } catch (error) {
      request.log.error({ error, userId: request.authUser?.sub, conversationId: id }, 'Chat message failed')
      sendChatError(reply, error, 'Chat message failed')
    }
  })

  app.delete('/ai/chat/conversations/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const scope = resolveOwnerScope(request)
      const id = (request.params as { id: string }).id
      const ok = await chatService.deleteConversation(scope, id)
      if (!ok) return reply.code(404).send({ error: 'Conversation not found' })
      reply.send({ success: true })
    } catch (error) {
      sendChatError(reply, error, 'Failed to delete conversation')
    }
  })

  app.patch('/ai/chat/conversations/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const scope = resolveOwnerScope(request)
      const id = (request.params as { id: string }).id
      const conversation = await chatService.updateConversation(scope, id, request.body)
      if (!conversation) return reply.code(404).send({ error: 'Conversation not found' })
      reply.send({ conversation })
    } catch (error) {
      sendChatError(reply, error, 'Failed to update conversation')
    }
  })

  app.post('/ai/lessons/generate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    try {
      const lesson = await lessonService.generate(userId, request.body)
      reply.code(201).send({ lesson })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      request.log.error({ error, userId }, 'Lesson generation route failed')
      const statusCode = (error as { statusCode?: number })?.statusCode ?? 500
      reply.code(statusCode).send({ error: message || 'Lesson generation failed' })
    }
  })

  app.post('/ai/exams/generate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const exam = await examService.generate(userId, request.body)
    reply.code(201).send({ exam })
  })

  app.post('/ai/exams/translate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const result = await examService.translate(userId, request.body)
    reply.send(result)
  })

  app.post('/ai/education-plans/generate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    try {
      const plan = await planService.generate(userId, request.body)
      reply.code(201).send({ plan })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      request.log.error({ error, userId }, 'Education plan generation route failed')
      const statusCode = (error as { statusCode?: number })?.statusCode ?? 500
      reply.code(statusCode).send({ error: message || 'Education plan generation failed' })
    }
  })

  app.post('/ai/translate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const result = await translatorService.translate(userId, request.body)
    reply.send(result)
  })

  app.post('/ai/tts', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const result = await mediaService.tts(userId, request.body)
    reply.send(result)
  })

  app.post('/ai/stt', { preHandler: [app.authenticate] }, async (request, reply) => {
    const result = await mediaService.stt(request.body)
    reply.send(result)
  })

  app.post('/ai/image/generate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const result = await mediaService.image(userId, request.body)
    reply.send(result)
  })
}
