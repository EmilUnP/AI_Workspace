import type { FastifyInstance } from 'fastify'
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
  const translatorService = new TranslatorAiService()
  const mediaService = new MediaAiService()

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

  app.get('/ai/chat/conversations', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const items = await chatService.listConversations(userId)
    reply.send({ items })
  })

  app.post('/ai/chat/conversations', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const body = request.body as { title?: string }
    const conversation = await chatService.createConversation(userId, body?.title)
    reply.code(201).send({ conversation })
  })

  app.post('/ai/chat/conversations/:id/messages', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const id = (request.params as { id: string }).id
    const result = await chatService.sendMessage(userId, id, request.body)
    reply.send(result)
  })

  app.post('/ai/lessons/generate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const lesson = await lessonService.generate(userId, request.body)
    reply.code(201).send({ lesson })
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
    const result = await examService.translate(request.body)
    reply.send(result)
  })

  app.post('/ai/education-plans/generate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const plan = await planService.generate(userId, request.body)
    reply.code(201).send({ plan })
  })

  app.post('/ai/translate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const result = await translatorService.translate(request.body)
    reply.send(result)
  })

  app.post('/ai/tts', { preHandler: [app.authenticate] }, async (request, reply) => {
    const result = await mediaService.tts(request.body)
    reply.send(result)
  })

  app.post('/ai/stt', { preHandler: [app.authenticate] }, async (request, reply) => {
    const result = await mediaService.stt(request.body)
    reply.send(result)
  })

  app.post('/ai/image/generate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const result = await mediaService.image(request.body)
    reply.send(result)
  })
}
