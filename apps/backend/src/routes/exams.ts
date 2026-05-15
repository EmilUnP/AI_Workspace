import type { FastifyInstance } from 'fastify'

type ExamRow = {
  id: string
  title: string
  description: string | null
  duration_minutes: number | null
  language: string | null
  metadata: Record<string, unknown> | null
  questions: unknown
  created_at: string
}

const parseQuestions = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value
  return []
}

const parseObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
}

export async function examsRoutes(app: FastifyInstance) {
  app.get('/exams/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const id = String((request.params as { id?: string }).id || '')
    if (!id) return reply.code(400).send({ error: 'Exam id is required' })

    const { rows } = await app.db.query<ExamRow & { grade_level: string | null }>(
      `SELECT
        id,
        title,
        description,
        grade_level,
        duration_minutes,
        language,
        metadata,
        questions,
        created_at
      FROM exams
      WHERE id = $1 AND user_id = $2
      LIMIT 1`,
      [id, userId]
    )

    const row = rows[0]
    if (!row) return reply.code(404).send({ error: 'Exam not found' })

    const metadata = (row.metadata || {}) as Record<string, unknown>
    return reply.send({
      exam: {
        id: row.id,
        title: row.title,
        description: row.description,
        grade_level: row.grade_level,
        duration_minutes: row.duration_minutes ?? 60,
        language: row.language ?? 'en',
        questions: parseQuestions(row.questions),
        translations: parseObject(metadata.translations),
        settings: parseObject(metadata.settings),
        topics: toStringArray(metadata.topics),
        created_at: row.created_at,
      },
    })
  })

  app.post('/exams', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const body = parseObject(request.body)
    const title = String(body.title || '').trim()
    if (!title) return reply.code(400).send({ error: 'Title is required' })

    const description = body.description == null ? null : String(body.description)
    const gradeLevel = body.gradeLevel == null ? null : String(body.gradeLevel)
    const durationMinutes = Number(body.durationMinutes || 60)
    const language = String(body.language || 'en')
    const questions = parseQuestions(body.questions)
    const topics = toStringArray(body.topics)
    const translations = parseObject(body.translations)
    const settings = parseObject(body.settings)

    const metadata = {
      topics,
      translations,
      settings,
    }

    const { rows } = await app.db.query<{ id: string }>(
      `INSERT INTO exams (
        user_id, title, description, grade_level, duration_minutes,
        language, questions, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)
      RETURNING id`,
      [
        userId,
        title,
        description,
        gradeLevel,
        Number.isFinite(durationMinutes) ? durationMinutes : 60,
        language,
        JSON.stringify(questions),
        JSON.stringify(metadata),
      ]
    )

    return reply.code(201).send({ exam: { id: rows[0]?.id } })
  })

  app.patch('/exams/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const id = String((request.params as { id?: string }).id || '')
    if (!id) return reply.code(400).send({ error: 'Exam id is required' })

    const body = parseObject(request.body)
    const keys: string[] = []
    const values: unknown[] = []
    const add = (column: string, value: unknown) => {
      values.push(value)
      keys.push(`${column} = $${values.length}`)
    }

    if (body.title !== undefined) add('title', String(body.title || '').trim())
    if (body.description !== undefined) add('description', body.description == null ? null : String(body.description))
    if (body.gradeLevel !== undefined) add('grade_level', body.gradeLevel == null ? null : String(body.gradeLevel))
    if (body.durationMinutes !== undefined) add('duration_minutes', Number(body.durationMinutes || 60))
    if (body.language !== undefined) add('language', String(body.language || 'en'))
    if (body.questions !== undefined) add('questions', JSON.stringify(parseQuestions(body.questions)))
    if (body.metadata !== undefined) add('metadata', JSON.stringify(parseObject(body.metadata)))
    add('updated_at', new Date().toISOString())

    if (keys.length === 0) return reply.send({ ok: true })

    values.push(id)
    values.push(userId)

    const sql = `
      UPDATE exams
      SET ${keys.join(', ')}
      WHERE id = $${values.length - 1} AND user_id = $${values.length}
      RETURNING id
    `

    const { rows } = await app.db.query<{ id: string }>(sql, values)
    if (!rows[0]) return reply.code(404).send({ error: 'Exam not found' })

    return reply.send({ exam: { id: rows[0].id } })
  })

  app.delete('/exams/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const id = String((request.params as { id?: string }).id || '')
    if (!id) return reply.code(400).send({ error: 'Exam id is required' })

    const { rowCount } = await app.db.query(
      `DELETE FROM exams WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    if (!rowCount) return reply.code(404).send({ error: 'Exam not found' })
    return reply.send({ ok: true })
  })

  app.get('/exams', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const query = request.query as { search?: string; page?: string; perPage?: string }
    const page = Math.max(1, Number(query.page || 1))
    const perPage = Math.min(50, Math.max(1, Number(query.perPage || 10)))
    const offset = (page - 1) * perPage
    const search = (query.search || '').trim()

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM exams
      WHERE user_id = $1
        AND (
          $2 = ''
          OR title ILIKE '%' || $2 || '%'
        )
    `

    const dataSql = `
      SELECT
        id,
        title,
        description,
        duration_minutes,
        language,
        metadata,
        questions,
        created_at
      FROM exams
      WHERE user_id = $1
        AND (
          $2 = ''
          OR title ILIKE '%' || $2 || '%'
        )
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `

    const [{ rows: countRows }, { rows }] = await Promise.all([
      app.db.query<{ total: number }>(countSql, [userId, search]),
      app.db.query<ExamRow>(dataSql, [userId, search, perPage, offset]),
    ])

    const items = rows.map((row) => {
      const metadata = (row.metadata || {}) as Record<string, unknown>
      const topics = toStringArray(metadata.topics)
      const translations = (metadata.translations || {}) as Record<string, unknown>
      const translationLanguages = Object.keys(translations).filter(Boolean)
      const baseLanguage = row.language ? [row.language] : []

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        topics,
        languages: Array.from(new Set([...baseLanguage, ...translationLanguages])),
        questionCount: parseQuestions(row.questions).length,
        duration_minutes: row.duration_minutes ?? 60,
        created_at: row.created_at,
      }
    })

    return reply.send({
      items,
      total: Number(countRows[0]?.total || 0),
      page,
      perPage,
    })
  })

  app.get('/exams/stats', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const statsSql = `
      SELECT
        COUNT(*)::int AS total,
        COALESCE(SUM(CASE
          WHEN jsonb_typeof(questions) = 'array' THEN jsonb_array_length(questions)
          ELSE 0
        END), 0)::int AS total_questions
      FROM exams
      WHERE user_id = $1
    `

    const { rows } = await app.db.query<{
      total: number
      total_questions: number
    }>(statsSql, [userId])

    const row = rows[0]
    return reply.send({
      total: Number(row?.total || 0),
      totalQuestions: Number(row?.total_questions || 0),
    })
  })
}
