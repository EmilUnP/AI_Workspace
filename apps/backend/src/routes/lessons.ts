import type { FastifyInstance } from 'fastify'
import { createReadStream } from 'node:fs'
import { access, rm } from 'node:fs/promises'
import path from 'node:path'
import { env } from '../config/env.js'

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
  is_published?: boolean | null
  audio_url?: string | null
  content: unknown
  images: unknown
  mini_test: unknown
  metadata: unknown
  learning_objectives: unknown
  document_title: string | null
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
      is_published: false,
      usedInClass: false,
      usedInCalendar: false,
      className: null as string | null,
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
         l.is_published,
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
        (message.includes('audio_url') || message.includes('is_published'))

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
          is_published: false,
          audio_url: null,
        }
      }
    }

    if (!lesson) return reply.code(404).send({ error: 'Lesson not found' })

    return reply.send({
      lesson: {
        id: lesson.id,
        title: lesson.title,
        topic: lesson.topic,
        description: lesson.description,
        created_at: lesson.created_at,
        duration_minutes: lesson.duration_minutes ?? 45,
        is_published: lesson.is_published ?? false,
        audio_url:
          lesson.audio_url ||
          ((lesson.metadata as Record<string, unknown> | null)?.audio_url as string | null) ||
          null,
        content: lesson.content,
        images: lesson.images,
        mini_test: lesson.mini_test,
        metadata: lesson.metadata,
        learning_objectives: lesson.learning_objectives,
        documents: lesson.document_title ? { title: lesson.document_title } : null,
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
    const mediaPath = path.join(env.AI_STORAGE_DIR, 'lessons', id, safeFile)
    try {
      await access(mediaPath)
    } catch {
      return reply.code(404).send({ error: 'Media file not found' })
    }

    const ext = path.extname(safeFile).toLowerCase()
    const contentType =
      ext === '.wav'
        ? 'audio/wav'
        : ext === '.png'
          ? 'image/png'
          : ext === '.svg'
            ? 'image/svg+xml'
          : ext === '.jpg' || ext === '.jpeg'
            ? 'image/jpeg'
            : 'application/octet-stream'

    reply.header('Content-Type', contentType)
    reply.send(createReadStream(mediaPath))
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

    // Best-effort cleanup: remove local lesson media folder (images/audio).
    const lessonDir = path.join(env.AI_STORAGE_DIR, 'lessons', id)
    try {
      await rm(lessonDir, { recursive: true, force: true })
    } catch (error) {
      request.log.warn(
        { error, lessonId: id, lessonDir },
        'Failed to remove lesson media directory after delete'
      )
    }

    return reply.send({ ok: true })
  })
}
