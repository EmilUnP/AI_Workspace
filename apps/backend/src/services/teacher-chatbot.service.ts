import { z } from 'zod'
import { generateText } from '../ai/gemini.js'
import { DocumentRagService } from './document-rag.service.js'
import { resolveGeminiApiKeyForUser } from './gemini-key-resolver.service.js'
import type { FastifyInstance } from 'fastify'

const sendSchema = z.object({
  message: z.string().min(1),
  documentIds: z.array(z.uuid()).default([]),
  shortAnswer: z.boolean().default(true)
})

const updateConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  documentIds: z.array(z.uuid()).optional(),
})

type ConversationRow = {
  id: string
  user_id: string
  title: string
  document_ids?: unknown
  context?: unknown
  created_at?: string
  updated_at?: string
}

type MessageRow = {
  id: string
  conversation_id: string
  role: string
  content: string
  metadata: unknown
  created_at: string
}

const parseDocumentIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item || '').trim())
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
}

export class TeacherChatbotService {
  private readonly rag: DocumentRagService
  constructor(private readonly app: FastifyInstance) {
    this.rag = new DocumentRagService(app)
  }

  async createConversation(userId: string, title?: string) {
    const { rows } = await this.app.db.query<ConversationRow>(
      `INSERT INTO teacher_chat_conversations (user_id, title)
       VALUES ($1, $2)
       RETURNING id, user_id, title, document_ids, context, created_at, updated_at`,
      [userId, title || 'New Conversation']
    )
    return rows[0]
  }

  async listConversations(userId: string) {
    const { rows } = await this.app.db.query<ConversationRow>(
      `SELECT id, user_id, title, document_ids, context, created_at, updated_at
       FROM teacher_chat_conversations
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    )
    return rows
  }

  async getConversation(userId: string, conversationId: string) {
    const { rows: convRows } = await this.app.db.query<ConversationRow>(
      `SELECT id, user_id, title, document_ids, context, created_at, updated_at
       FROM teacher_chat_conversations
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [conversationId, userId]
    )
    const conversation = convRows[0]
    if (!conversation) return null

    const { rows: messages } = await this.app.db.query<MessageRow>(
      `SELECT id, conversation_id, role, content, metadata, created_at
       FROM teacher_chat_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId]
    )

    return {
      ...conversation,
      messages,
    }
  }

  async deleteConversation(userId: string, conversationId: string) {
    const { rowCount } = await this.app.db.query(
      `DELETE FROM teacher_chat_conversations WHERE id = $1 AND user_id = $2`,
      [conversationId, userId]
    )
    return Boolean(rowCount)
  }

  async updateConversation(userId: string, conversationId: string, input: unknown) {
    const data = updateConversationSchema.parse(input)
    const sets: string[] = ['updated_at = NOW()']
    const values: unknown[] = []

    if (data.title !== undefined) {
      values.push(data.title.trim())
      sets.push(`title = $${values.length}`)
    }
    if (data.documentIds !== undefined) {
      values.push(JSON.stringify(data.documentIds))
      sets.push(`document_ids = $${values.length}::jsonb`)
    }

    values.push(conversationId)
    values.push(userId)

    const { rows } = await this.app.db.query<ConversationRow>(
      `UPDATE teacher_chat_conversations
       SET ${sets.join(', ')}
       WHERE id = $${values.length - 1} AND user_id = $${values.length}
       RETURNING id, user_id, title, document_ids, context, created_at, updated_at`,
      values
    )
    return rows[0] || null
  }

  async sendMessage(userId: string, conversationId: string, input: unknown) {
    const data = sendSchema.parse(input)
    const { rows: convRows } = await this.app.db.query<ConversationRow>(
      `SELECT id, user_id, title, document_ids
       FROM teacher_chat_conversations
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [conversationId, userId]
    )
    const conversation = convRows[0]
    if (!conversation) {
      const err = new Error('Conversation not found') as Error & { statusCode?: number }
      err.statusCode = 404
      throw err
    }

    const { rows: historyBefore } = await this.app.db.query<Pick<MessageRow, 'role' | 'content'>>(
      `SELECT role, content
       FROM teacher_chat_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC
       LIMIT 40`,
      [conversationId]
    )

    await this.app.db.query(
      `INSERT INTO teacher_chat_messages (conversation_id, role, content) VALUES ($1, 'user', $2)`,
      [conversationId, data.message]
    )

    const storedDocIds = parseDocumentIds(conversation.document_ids)
    const docIds = Array.from(new Set([...data.documentIds, ...storedDocIds])).slice(0, 3)
    const retrievedDocs = await Promise.all(
      docIds.map(async (id) => {
        try {
          const retrieved = await this.rag.retrieve(userId, { documentId: id, query: data.message, topK: 2 })
          const chunks = (retrieved.chunks || []).slice(0, 2).map((chunk) => String(chunk).slice(0, 700))
          if (!chunks.length) return ''
          return `\n\n[Doc:${id}]\n${chunks.join('\n')}`
        } catch {
          return ''
        }
      })
    )
    const ragContext = retrievedDocs.join('').slice(0, 3000)

    const transcript = [...historyBefore, { role: 'user', content: data.message }]
      .map((row) => `${row.role === 'assistant' ? 'Assistant' : 'User'}: ${String(row.content).slice(0, 1200)}`)
      .join('\n')
      .slice(-8000)

    const style = data.shortAnswer
      ? 'Respond briefly in 1-4 bullet points. Keep it short and practical.'
      : 'Respond with detailed guidance.'
    const apiKey = await resolveGeminiApiKeyForUser(this.app, userId)
    const replyRaw = await generateText(
      [
        `You are Eduator teacher assistant. ${style}`,
        'Use the conversation history for follow-up questions. Stay consistent with prior answers.',
        'If the user asks a direct definition, answer in max 3 short bullets when a short answer is requested.',
        'Avoid long introductions and avoid repeating the same idea.',
        transcript ? `Conversation so far:\n${transcript}` : '',
        ragContext ? `Relevant document excerpts:${ragContext}` : '',
        `Latest user message: ${data.message}`,
        'Reply as the assistant only (no role prefix).',
      ]
        .filter(Boolean)
        .join('\n\n'),
      'gemini-2.5-flash',
      { apiKey }
    )
    const reply = String(replyRaw || '').trim().slice(0, 1600)

    const { rows: msgRows } = await this.app.db.query<{ id: string; content: string }>(
      `INSERT INTO teacher_chat_messages (conversation_id, role, content, metadata)
       VALUES ($1, 'assistant', $2, $3::jsonb)
       RETURNING id, content`,
      [conversationId, reply, JSON.stringify({ followups: [] })]
    )

    await this.app.db.query(`UPDATE teacher_chat_conversations SET updated_at = NOW() WHERE id = $1`, [conversationId])

    return {
      message: msgRows[0],
      followups: []
    }
  }
}
