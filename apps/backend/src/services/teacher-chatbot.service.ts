import { z } from 'zod'
import { generateText } from '../ai/gemini.js'
import { DocumentRagService } from './document-rag.service.js'
import { resolveGeminiApiKeyForUser } from './gemini-key-resolver.service.js'
import type { ChatScope } from '../lib/chat-scope.js'
import type { FastifyInstance } from 'fastify'

const sendSchema = z.object({
  message: z.string().min(1),
  documentIds: z.array(z.uuid()).default([]),
  shortAnswer: z.boolean().default(true),
})

const updateAssistantSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  documentIds: z.array(z.uuid()).optional(),
})

const updateConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
})

type AssistantRow = {
  id: string
  user_id: string
  external_user_id?: string | null
  title: string
  document_ids?: unknown
  context?: unknown
  created_at?: string
  updated_at?: string
}

type ConversationRow = {
  id: string
  assistant_id: string
  title: string
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

const ASSISTANT_COLUMNS =
  'id, user_id, external_user_id, title, document_ids, context, created_at, updated_at'
const CONVERSATION_COLUMNS = 'id, assistant_id, title, created_at, updated_at'

const parseDocumentIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item || '').trim())
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
}

const assistantScopeWhere = 'user_id = $1 AND external_user_id IS NOT DISTINCT FROM $2'

export class TeacherChatbotService {
  private readonly rag: DocumentRagService
  constructor(private readonly app: FastifyInstance) {
    this.rag = new DocumentRagService(app)
  }

  private async getAssistantForScope(scope: ChatScope, assistantId: string) {
    const { rows } = await this.app.db.query<AssistantRow>(
      `SELECT ${ASSISTANT_COLUMNS}
       FROM teacher_chat_assistants
       WHERE id = $3 AND ${assistantScopeWhere}
       LIMIT 1`,
      [scope.ownerUserId, scope.externalUserId, assistantId]
    )
    return rows[0] || null
  }

  private async getConversationWithAssistant(scope: ChatScope, conversationId: string) {
    const { rows } = await this.app.db.query<
      ConversationRow & { document_ids?: unknown; assistant_title?: string }
    >(
      `SELECT c.id, c.assistant_id, c.title, c.created_at, c.updated_at,
              a.document_ids, a.title AS assistant_title
       FROM teacher_chat_conversations c
       INNER JOIN teacher_chat_assistants a ON a.id = c.assistant_id
       WHERE c.id = $3 AND a.user_id = $1 AND a.external_user_id IS NOT DISTINCT FROM $2
       LIMIT 1`,
      [scope.ownerUserId, scope.externalUserId, conversationId]
    )
    return rows[0] || null
  }

  async createAssistant(scope: ChatScope, title?: string, documentIds?: string[]) {
    const { rows } = await this.app.db.query<AssistantRow>(
      `INSERT INTO teacher_chat_assistants (user_id, external_user_id, title, document_ids)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING ${ASSISTANT_COLUMNS}`,
      [
        scope.ownerUserId,
        scope.externalUserId,
        title || 'New Assistant',
        JSON.stringify(documentIds || []),
      ]
    )
    return rows[0]
  }

  async listAssistants(scope: ChatScope) {
    const { rows } = await this.app.db.query<AssistantRow>(
      `SELECT ${ASSISTANT_COLUMNS}
       FROM teacher_chat_assistants
       WHERE ${assistantScopeWhere}
       ORDER BY updated_at DESC`,
      [scope.ownerUserId, scope.externalUserId]
    )
    return rows
  }

  async getAssistant(scope: ChatScope, assistantId: string) {
    return this.getAssistantForScope(scope, assistantId)
  }

  async updateAssistant(scope: ChatScope, assistantId: string, input: unknown) {
    const data = updateAssistantSchema.parse(input)
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

    values.push(assistantId, scope.ownerUserId, scope.externalUserId)

    const { rows } = await this.app.db.query<AssistantRow>(
      `UPDATE teacher_chat_assistants
       SET ${sets.join(', ')}
       WHERE id = $${values.length - 2}
         AND user_id = $${values.length - 1}
         AND external_user_id IS NOT DISTINCT FROM $${values.length}
       RETURNING ${ASSISTANT_COLUMNS}`,
      values
    )
    return rows[0] || null
  }

  async deleteAssistant(scope: ChatScope, assistantId: string) {
    const { rowCount } = await this.app.db.query(
      `DELETE FROM teacher_chat_assistants
       WHERE id = $1 AND user_id = $2 AND external_user_id IS NOT DISTINCT FROM $3`,
      [assistantId, scope.ownerUserId, scope.externalUserId]
    )
    return Boolean(rowCount)
  }

  async createConversation(scope: ChatScope, assistantId: string, title?: string) {
    const assistant = await this.getAssistantForScope(scope, assistantId)
    if (!assistant) {
      const err = new Error('Assistant not found') as Error & { statusCode?: number }
      err.statusCode = 404
      throw err
    }
    const { rows } = await this.app.db.query<ConversationRow>(
      `INSERT INTO teacher_chat_conversations (assistant_id, title)
       VALUES ($1, $2)
       RETURNING ${CONVERSATION_COLUMNS}`,
      [assistantId, title || 'New chat']
    )
    await this.app.db.query(`UPDATE teacher_chat_assistants SET updated_at = NOW() WHERE id = $1`, [
      assistantId,
    ])
    return { ...rows[0], assistant }
  }

  async listConversations(scope: ChatScope, assistantId: string) {
    const assistant = await this.getAssistantForScope(scope, assistantId)
    if (!assistant) return null
    const { rows } = await this.app.db.query<ConversationRow>(
      `SELECT ${CONVERSATION_COLUMNS}
       FROM teacher_chat_conversations
       WHERE assistant_id = $1
       ORDER BY updated_at DESC`,
      [assistantId]
    )
    return { assistant, items: rows }
  }

  async getConversation(scope: ChatScope, conversationId: string) {
    const row = await this.getConversationWithAssistant(scope, conversationId)
    if (!row) return null

    const { rows: messages } = await this.app.db.query<MessageRow>(
      `SELECT id, conversation_id, role, content, metadata, created_at
       FROM teacher_chat_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId]
    )

    const { document_ids, assistant_title, ...conversation } = row
    const assistant = await this.getAssistantForScope(scope, conversation.assistant_id)

    return {
      conversation,
      assistant: assistant
        ? { ...assistant, document_ids: assistant.document_ids ?? document_ids }
        : null,
      messages,
    }
  }

  async deleteConversation(scope: ChatScope, conversationId: string) {
    const row = await this.getConversationWithAssistant(scope, conversationId)
    if (!row) return false
    const { rowCount } = await this.app.db.query(
      `DELETE FROM teacher_chat_conversations WHERE id = $1`,
      [conversationId]
    )
    if (rowCount) {
      await this.app.db.query(`UPDATE teacher_chat_assistants SET updated_at = NOW() WHERE id = $1`, [
        row.assistant_id,
      ])
    }
    return Boolean(rowCount)
  }

  async updateConversation(scope: ChatScope, conversationId: string, input: unknown) {
    const row = await this.getConversationWithAssistant(scope, conversationId)
    if (!row) return null
    const data = updateConversationSchema.parse(input)
    if (data.title === undefined) return row

    const { rows } = await this.app.db.query<ConversationRow>(
      `UPDATE teacher_chat_conversations
       SET title = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING ${CONVERSATION_COLUMNS}`,
      [data.title.trim(), conversationId]
    )
    return rows[0] || null
  }

  /** Legacy: create assistant + first conversation in one step (third-party quick start). */
  async createAssistantWithConversation(
    scope: ChatScope,
    title?: string,
    documentIds?: string[],
    conversationTitle?: string
  ) {
    const assistant = await this.createAssistant(scope, title, documentIds)
    const conversation = await this.createConversation(
      scope,
      assistant.id,
      conversationTitle || 'New chat'
    )
    return { assistant, conversation }
  }

  async sendMessage(scope: ChatScope, conversationId: string, input: unknown) {
    const data = sendSchema.parse(input)
    const row = await this.getConversationWithAssistant(scope, conversationId)
    if (!row) {
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

    const storedDocIds = parseDocumentIds(row.document_ids)
    const docIds = Array.from(new Set([...data.documentIds, ...storedDocIds])).slice(0, 3)
    const retrievedDocs = await Promise.all(
      docIds.map(async (id) => {
        try {
          const retrieved = await this.rag.retrieve(scope.ownerUserId, {
            documentId: id,
            query: data.message,
            topK: 2,
          })
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
    const apiKey = await resolveGeminiApiKeyForUser(this.app, scope.ownerUserId)
    const replyRaw = await generateText(
      [
        `You are Eduator teacher assistant${row.assistant_title ? ` "${row.assistant_title}"` : ''}. ${style}`,
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

    await this.app.db.query(`UPDATE teacher_chat_conversations SET updated_at = NOW() WHERE id = $1`, [
      conversationId,
    ])
    await this.app.db.query(`UPDATE teacher_chat_assistants SET updated_at = NOW() WHERE id = $1`, [
      row.assistant_id,
    ])

    return {
      message: msgRows[0],
      followups: [],
    }
  }
}
