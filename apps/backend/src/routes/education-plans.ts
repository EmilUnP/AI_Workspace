import type { FastifyInstance } from 'fastify'

type PlanRow = {
  id: string
  name: string
  description: string | null
  class_id: string | null
  period_months: number
  sessions_per_week: number
  hours_per_session: number
  audience: string | null
  is_shared_with_students: boolean
  document_ids: unknown
  content: unknown
  created_at: string
}

const parseObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

const parseArray = <T = unknown>(value: unknown): T[] => {
  if (!Array.isArray(value)) return []
  return value as T[]
}

const parseJsonContent = (value: unknown): unknown => {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') return value
  return []
}

export async function educationPlansRoutes(app: FastifyInstance) {
  app.get('/education-plans', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })

    const query = request.query as { search?: string; shared?: string; classId?: string }
    const search = String(query.search || '').trim()
    const shared = String(query.shared || '').trim()
    const classId = String(query.classId || '').trim()

    const clauses = ['user_id = $1']
    const values: unknown[] = [userId]

    if (search) {
      values.push(search)
      clauses.push(`(name ILIKE '%' || $${values.length} || '%' OR COALESCE(description, '') ILIKE '%' || $${values.length} || '%')`)
    }
    if (shared === 'shared') clauses.push('is_shared_with_students = true')
    if (shared === 'not_shared') clauses.push('is_shared_with_students = false')
    if (classId) {
      values.push(classId)
      clauses.push(`class_id = $${values.length}`)
    }

    const sql = `
      SELECT
        id, name, description, class_id, period_months, sessions_per_week,
        hours_per_session, audience, is_shared_with_students, document_ids,
        content, created_at
      FROM education_plans
      WHERE ${clauses.join(' AND ')}
      ORDER BY created_at DESC
    `

    const { rows } = await app.db.query<PlanRow>(sql, values)
    return reply.send({
      items: rows.map((row) => ({
        ...row,
        document_ids: parseArray<string>(row.document_ids),
        content: parseJsonContent(row.content),
      })),
    })
  })

  app.post('/education-plans', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const body = parseObject(request.body)

    const name = String(body.name || '').trim()
    if (!name) return reply.code(400).send({ error: 'Name is required' })

    const description = body.description == null ? null : String(body.description)
    const classId = body.class_id == null ? null : String(body.class_id)
    const periodMonths = Number(body.period_months || 3)
    const sessionsPerWeek = Number(body.sessions_per_week || 3)
    const hoursPerSession = Number(body.hours_per_session || 1)
    const audience = body.audience == null ? null : String(body.audience)
    const isShared = Boolean(body.is_shared_with_students)
    const documentIds = parseArray<string>(body.document_ids)
    const content = parseJsonContent(body.content)

    const { rows } = await app.db.query<{ id: string }>(
      `INSERT INTO education_plans (
        user_id, name, description, class_id, period_months, sessions_per_week,
        hours_per_session, audience, is_shared_with_students, document_ids, content
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb)
      RETURNING id`,
      [
        userId,
        name,
        description,
        classId,
        Number.isFinite(periodMonths) ? periodMonths : 3,
        Number.isFinite(sessionsPerWeek) ? sessionsPerWeek : 3,
        Number.isFinite(hoursPerSession) ? hoursPerSession : 1,
        audience,
        isShared,
        JSON.stringify(documentIds),
        JSON.stringify(content),
      ]
    )

    return reply.code(201).send({ plan: { id: rows[0]?.id } })
  })

  app.patch('/education-plans/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const id = String((request.params as { id?: string }).id || '')
    if (!id) return reply.code(400).send({ error: 'Plan id is required' })
    const body = parseObject(request.body)

    const keys: string[] = []
    const values: unknown[] = []
    const add = (column: string, value: unknown) => {
      values.push(value)
      keys.push(`${column} = $${values.length}`)
    }

    if (body.name !== undefined) add('name', String(body.name || '').trim())
    if (body.description !== undefined) add('description', body.description == null ? null : String(body.description))
    if (body.class_id !== undefined) add('class_id', body.class_id == null ? null : String(body.class_id))
    if (body.period_months !== undefined) add('period_months', Number(body.period_months || 3))
    if (body.sessions_per_week !== undefined) add('sessions_per_week', Number(body.sessions_per_week || 3))
    if (body.hours_per_session !== undefined) add('hours_per_session', Number(body.hours_per_session || 1))
    if (body.audience !== undefined) add('audience', body.audience == null ? null : String(body.audience))
    if (body.is_shared_with_students !== undefined) add('is_shared_with_students', Boolean(body.is_shared_with_students))
    if (body.document_ids !== undefined) add('document_ids', JSON.stringify(parseArray<string>(body.document_ids)))
    if (body.content !== undefined) add('content', JSON.stringify(parseJsonContent(body.content)))
    add('updated_at', new Date().toISOString())

    if (keys.length === 0) return reply.send({ ok: true })

    values.push(id)
    values.push(userId)

    const sql = `
      UPDATE education_plans
      SET ${keys.join(', ')}
      WHERE id = $${values.length - 1} AND user_id = $${values.length}
      RETURNING id
    `

    const { rows } = await app.db.query<{ id: string }>(sql, values)
    if (!rows[0]) return reply.code(404).send({ error: 'Education plan not found' })

    return reply.send({ plan: { id: rows[0].id } })
  })

  app.delete('/education-plans/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.authUser?.sub
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' })
    const id = String((request.params as { id?: string }).id || '')
    if (!id) return reply.code(400).send({ error: 'Plan id is required' })

    const { rowCount } = await app.db.query(
      `DELETE FROM education_plans WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    if (!rowCount) return reply.code(404).send({ error: 'Education plan not found' })
    return reply.send({ ok: true })
  })
}

