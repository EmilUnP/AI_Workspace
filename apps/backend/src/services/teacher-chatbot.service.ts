import { z } from 'zod'
import { generateJson, generateText } from '../ai/gemini.js'
import { DocumentRagService } from './document-rag.service.js'
import type { FastifyInstance } from 'fastify'

const sendSchema = z.object({
  message: z.string().min(1),
  documentIds: z.array(z.uuid()).default([]),
  shortAnswer: z.boolean().default(false)
})

type ConversationRow = {
  id: string
  user_id: string
  title: string
}

export class TeacherChatbotService {
  private readonly rag: DocumentRagService
  constructor(private readonly app: FastifyInstance) {
    this.rag = new DocumentRagService(app)
  }

  async createConversation(userId: string, title?: string) {
    const { rows } = await this.app.db.query<ConversationRow>(
      `INSERT INTO teacher_chat_conversations (user_id, title) VALUES ($1, $2) RETURNING id, user_id, title`,
      [userId, title || 'New Conversation']
    )
    return rows[0]
  }

  async listConversations(userId: string) {
    const { rows } = await this.app.db.query<ConversationRow>(
      `SELECT id, user_id, title FROM teacher_chat_conversations WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId]
    )
    return rows
  }

  async sendMessage(userId: string, conversationId: string, input: unknown) {
    const data = sendSchema.parse(input)
    const { rows: convRows } = await this.app.db.query<ConversationRow>(
      `SELECT id, user_id, title FROM teacher_chat_conversations WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [conversationId, userId]
    )
    const conversation = convRows[0]
    if (!conversation) {
      const err = new Error('Conversation not found') as Error & { statusCode?: number }
      err.statusCode = 404
      throw err
    }

    await this.app.db.query(
      `INSERT INTO teacher_chat_messages (conversation_id, role, content) VALUES ($1, 'user', $2)`,
      [conversationId, data.message]
    )

    let context = ''
    for (const id of data.documentIds) {
      const retrieved = await this.rag.retrieve(userId, { documentId: id, query: data.message, topK: 3 })
      context += `\n\n[Doc:${id}]\n${retrieved.chunks.join('\n')}`
    }

    const style = data.shortAnswer ? 'Respond briefly in 1-3 bullets.' : 'Respond with detailed guidance.'
    const reply = await generateText(
      `You are Eduator teacher assistant. ${style}\nUser question: ${data.message}\nRelevant context:${context}`
    )

    const followups = await generateJson<string[]>(
      `Create 3 short follow-up questions for this teacher chat.\nQuestion: ${data.message}\nAssistant answer: ${reply}`
    ).catch(() => [])

    const { rows: msgRows } = await this.app.db.query<{ id: string; content: string }>(
      `INSERT INTO teacher_chat_messages (conversation_id, role, content, metadata)
       VALUES ($1, 'assistant', $2, $3::jsonb)
       RETURNING id, content`,
      [conversationId, reply, JSON.stringify({ followups })]
    )

    await this.app.db.query(`UPDATE teacher_chat_conversations SET updated_at = NOW() WHERE id = $1`, [conversationId])

    return {
      message: msgRows[0],
      followups
    }
  }
}
