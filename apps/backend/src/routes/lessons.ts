import type { FastifyInstance } from 'fastify'
import { createReadStream } from 'node:fs'
import { access, rm } from 'node:fs/promises'
import path from 'node:path'
import { env } from '../config/env.js'
import { useDatabaseFileStorage } from '../utils/document-file.js'
import {
  contentTypeForLessonMediaFile,
  getLessonMediaFile,
  lessonMediaFileExists
} from '../utils/lesson-media-storage.js'
import { parseSourceDocumentIds, resolveSourceDocuments } from '../utils/source-documents.js'

type LessonRow = {
  id: string
  title: string
  duration_minutes: number | null
  language: string | null
  created_at: string
  objectives_count: number
}

type LessonDetailsRow = {
  id: string
  title: string
  topic: string | null
  description: string | null
  created_at: string
  duration_minutes: number | null
  audio_url?: string | null
  content: unknown
  images: unknown
  mini_test: unknown
  metadata: unknown
  learning_objectives: unknown
  document_title: string | null
}

const toAbsoluteMediaUrl = (
  request: { protocol: string; headers: Record<string, string | string[] | undefined> },
  value: unknown,
  options?: { forceAbsoluteInternalApiPath?: boolean }
): string | null => {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw
  // Web-app flow keeps internal media paths relative so it can rewrite to its proxy route.
  // API-key (third-party) clients need direct absolute URLs.
  if (raw.startsWith('/v1/lessons/') && !options?.forceAbsoluteInternalApiPath) return raw
  if (!raw.startsWith('/')) return raw
  const host = String(request.headers.host || '').trim()
  if (!host) return raw
  return `${request.protocol}://${host}${raw}`
}

const normalizeLessonImages = (
  request: { protocol: string; headers: Record<string, string | string[] | undefined> },
  value: unknown,
  options?: { forceAbsoluteInternalApiPath?: boolean }
): unknown => {
  if (!Array.isArray(value)) return value
  return value.map((item) => {
    if (!item || typeof item !== 'object') return item
    const image = item as Record<string, unknown>
    return {
      ...image,
      url: toAbsoluteMediaUrl(request, image.url, options) ?? image.url,
    }
  })
}

export async function lessonsRoutes(app: FastifyInstance) {
  app.get('/lessons', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const query = request.query as { search?: string; page?: string; perPage?: string }
    const page = Math.max(1, Number(query.page || 1))
    const perPage = Math.min(50, Math.max(1, Number(query.perPage || 10)))
    const offset = (page - 1) * perPage
    const search = (query.search || '').trim()

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM lessons
      WHERE user_id = $1
        AND (
          $2 = ''
          OR title ILIKE '%' || $2 || '%'
          OR COALESCE(topic, '') ILIKE '%' || $2 || '%'
        )
    `
    const dataSql = `
      SELECT
        id,
        title,
        duration_minutes,
        language,
        created_at,
        COALESCE(jsonb_array_length(learning_objectives), 0) AS objectives_count
      FROM lessons
      WHERE user_id = $1
        AND (
          $2 = ''
          OR title ILIKE '%' || $2 || '%'
          OR COALESCE(topic, '') ILIKE '%' || $2 || '%'
        )
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `

    const [{ rows: countRows }, { rows }] = await Promise.all([
      app.db.query<{ total: number }>(countSql, [userId, search]),
      app.db.query<LessonRow>(dataSql, [userId, search, perPage, offset]),
    ])

    const items = rows.map((row) => ({
      id: row.id,
      title: row.title,
      duration_minutes: row.duration_minutes ?? 45,
      languages: row.language ? [row.language] : [],
      objectivesCount: Number(row.objectives_count || 0),
      created_at: row.created_at,
    }))

    return reply.send({
      items,
      total: Number(countRows[0]?.total || 0),
      page,
      perPage,
    })
  })

  app.get('/lessons/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const { id } = request.params as { id: string }
    let lesson: LessonDetailsRow | undefined

    try {
      const { rows } = await app.db.query<LessonDetailsRow>(
      `SELECT
         l.id,
         l.title,
         l.topic,
         l.description,
         l.created_at,
         l.duration_minutes,
         l.audio_url,
         l.content,
         l.images,
         l.mini_test,
         l.metadata,
         l.learning_objectives,
         d.title AS document_title
       FROM lessons l
       LEFT JOIN documents d ON d.id = l.document_id
       WHERE l.id = $1 AND l.user_id = $2
       LIMIT 1`,
      [id, userId]
    )
      lesson = rows[0]
    } catch (error) {
      // Backward compatibility: some local DBs may not have newer lesson columns yet.
      const message = error instanceof Error ? error.message : String(error)
      const isSchemaMismatch =
        message.includes('column') &&
        (message.includes('audio_url'))

      if (!isSchemaMismatch) throw error

      const { rows } = await app.db.query<LessonDetailsRow>(
        `SELECT
           l.id,
           l.title,
           l.topic,
           l.description,
           l.created_at,
           l.duration_minutes,
           l.content,
           l.images,
           l.mini_test,
           l.metadata,
           l.learning_objectives,
           d.title AS document_title
         FROM lessons l
         LEFT JOIN documents d ON d.id = l.document_id
         WHERE l.id = $1 AND l.user_id = $2
         LIMIT 1`,
        [id, userId]
      )

      lesson = rows[0]
      if (lesson) {
        lesson = {
          ...lesson,
          audio_url: null,
        }
      }
    }

    if (!lesson) return reply.code(404).send({ error: 'Lesson not found' })

    let resolvedAudioUrl =
      lesson.audio_url ||
      ((lesson.metadata as Record<string, unknown> | null)?.audio_url as string | null) ||
      null

    // Fallback: audio file exists in DB or on disk but audio_url not set yet.
    if (!resolvedAudioUrl) {
      const candidates = ['audio.mp3', 'audio.wav'] as const
      for (const fileName of candidates) {
        const hasAudio = useDatabaseFileStorage()
          ? await lessonMediaFileExists(lesson.id, fileName)
          : await access(path.join(env.AI_STORAGE_DIR, 'lessons', lesson.id, fileName))
              .then(() => true)
              .catch(() => false)
        if (hasAudio) {
          resolvedAudioUrl = `/v1/lessons/${lesson.id}/media/${fileName}`
          break
        }
      }
    }

    const thirdPartyApiKeyAccess = Boolean(request.authApiKeyId)
    const mediaUrlOptions = { forceAbsoluteInternalApiPath: thirdPartyApiKeyAccess }
    const images = normalizeLessonImages(request, lesson.images, mediaUrlOptions)
    const audioUrl = toAbsoluteMediaUrl(request, resolvedAudioUrl, mediaUrlOptions)

    const metadataObj = (lesson.metadata as Record<string, unknown> | null) || {}
    const sourceDocumentIds = parseSourceDocumentIds(metadataObj.source_documents)
    const sourceDocuments = await resolveSourceDocuments(app, userId, sourceDocumentIds)
    if (sourceDocuments.length === 0 && lesson.document_title) {
      sourceDocuments.push({ id: '', title: lesson.document_title })
    }

    return reply.send({
      lesson: {
        id: lesson.id,
        title: lesson.title,
        topic: lesson.topic,
        description: lesson.description,
        created_at: lesson.created_at,
        duration_minutes: lesson.duration_minutes ?? 45,
        audio_url: audioUrl,
        content: lesson.content,
        images,
        mini_test: lesson.mini_test,
        metadata: lesson.metadata,
        learning_objectives: lesson.learning_objectives,
        documents: lesson.document_title ? { title: lesson.document_title } : null,
        source_documents: sourceDocuments,
        source_document_ids: sourceDocumentIds,
      },
    })
  })

  app.get('/lessons/:id/media/:file', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const { id, file } = request.params as { id: string; file: string }
    const { rows } = await app.db.query<{ id: string }>('SELECT id FROM lessons WHERE id = $1 AND user_id = $2 LIMIT 1', [id, userId])
    if (!rows[0]) return reply.code(404).send({ error: 'Lesson not found' })

    const safeFile = path.basename(file)

    if (useDatabaseFileStorage()) {
      const media = await getLessonMediaFile(id, safeFile)
      if (!media) {
        return reply.code(404).send({ error: 'Media file not found' })
      }
      reply.header('Content-Type', media.content_type)
      return reply.send(media.file_data)
    }

    const mediaPath = path.join(env.AI_STORAGE_DIR, 'lessons', id, safeFile)
    try {
      await access(mediaPath)
    } catch {
      return reply.code(404).send({ error: 'Media file not found' })
    }

    reply.header('Content-Type', contentTypeForLessonMediaFile(safeFile))
    return reply.send(createReadStream(mediaPath))
  })

  app.patch('/lessons/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const { id } = request.params as { id: string }
    const body = (request.body ?? {}) as {
      title?: string
      topic?: string
      description?: string
      content?: string
      duration_minutes?: number
    }

    const sets: string[] = []
    const values: unknown[] = []
    let i = 1

    if (typeof body.title === 'string') {
      sets.push(`title = $${i++}`)
      values.push(body.title.trim())
    }
    if (typeof body.topic === 'string') {
      sets.push(`topic = $${i++}`)
      values.push(body.topic.trim())
    }
    if (typeof body.description === 'string') {
      sets.push(`description = $${i++}`)
      values.push(body.description.trim())
    }
    if (typeof body.duration_minutes === 'number' && Number.isFinite(body.duration_minutes)) {
      sets.push(`duration_minutes = $${i++}`)
      values.push(Math.max(1, Math.round(body.duration_minutes)))
    }
    if (typeof body.content === 'string') {
      sets.push(`content = $${i++}::jsonb`)
      values.push(JSON.stringify({ text: body.content }))
    }

    if (sets.length === 0) {
      return reply.code(400).send({ error: 'No valid fields to update' })
    }

    sets.push('updated_at = now()')
    values.push(id, userId)

    const { rows } = await app.db.query<{ id: string }>(
      `UPDATE lessons
       SET ${sets.join(', ')}
       WHERE id = $${i++} AND user_id = $${i}
       RETURNING id`,
      values
    )

    if (!rows[0]) return reply.code(404).send({ error: 'Lesson not found' })
    return reply.send({ ok: true, id: rows[0].id })
  })

  app.post('/lessons/:id/audio', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const { id } = request.params as { id: string }
    const { rows } = await app.db.query<{
      id: string
      title: string
      content: unknown
      language: string | null
    }>(
      `SELECT id, title, content, language
       FROM lessons
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [id, userId]
    )
    const lesson = rows[0]
    if (!lesson) return reply.code(404).send({ error: 'Lesson not found' })

    const contentText =
      typeof lesson.content === 'object' && lesson.content && 'text' in (lesson.content as object)
        ? String((lesson.content as { text?: unknown }).text ?? '')
        : typeof lesson.content === 'string'
          ? lesson.content
          : ''

    if (!contentText.trim()) {
      return reply.code(400).send({ error: 'Lesson has no content to narrate' })
    }

    const { runWithAiContext } = await import('../ai/request-context.js')
    const { generateLessonAudioWithUsage } = await import('../services/lesson-media.service.js')

    try {
      const tts = await runWithAiContext({ app, userId }, () =>
        generateLessonAudioWithUsage(lesson.id, lesson.title || 'Lesson', contentText, lesson.language || undefined)
      )

      if (!tts.audioUrl) {
        await app.db.query(
          `UPDATE lessons
           SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
               updated_at = now()
           WHERE id = $1`,
          [id, JSON.stringify({ audio_failed: true, tts_usage: tts.usage })]
        )
        return reply.code(502).send({ error: 'TTS generation failed', audio_url: null })
      }

      await app.db.query(
        `UPDATE lessons
         SET audio_url = $2,
             metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
             updated_at = now()
         WHERE id = $1`,
        [
          id,
          tts.audioUrl,
          JSON.stringify({ audio_url: tts.audioUrl, audio_failed: false, tts_usage: tts.usage }),
        ]
      )

      return reply.send({ ok: true, audio_url: tts.audioUrl, model_used: tts.usage.model_used ?? null })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      request.log.error({ error, lessonId: id }, 'Lesson audio regeneration failed')
      try {
        await app.db.query(
          `UPDATE lessons
           SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
               updated_at = now()
           WHERE id = $1`,
          [id, JSON.stringify({ audio_failed: true, audio_error: message.slice(0, 500) })]
        )
      } catch {
        // ignore
      }
      return reply.code(502).send({ error: message.slice(0, 300) })
    }
  })

  app.delete('/lessons/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const { id } = request.params as { id: string }
    const { rows } = await app.db.query<{ id: string }>(
      `DELETE FROM lessons
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, userId]
    )

    if (!rows[0]) return reply.code(404).send({ error: 'Lesson not found' })

    // Best-effort cleanup of on-disk lesson media (DB rows cascade via FK).
    if (!useDatabaseFileStorage()) {
      const lessonDir = path.join(env.AI_STORAGE_DIR, 'lessons', id)
      try {
        await rm(lessonDir, { recursive: true, force: true })
      } catch (error) {
        request.log.warn(
          { error, lessonId: id, lessonDir },
          'Failed to remove lesson media directory after delete'
        )
      }
    }

    return reply.send({ ok: true })
  })
}
