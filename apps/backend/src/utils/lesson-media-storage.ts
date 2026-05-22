import { pool } from '../db/client.js'

export async function saveLessonMediaFile(
  lessonId: string,
  fileName: string,
  contentType: string,
  data: Buffer
) {
  await pool.query(
    `
      INSERT INTO lesson_media_files (lesson_id, file_name, content_type, file_data)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (lesson_id, file_name)
      DO UPDATE SET
        content_type = EXCLUDED.content_type,
        file_data = EXCLUDED.file_data
    `,
    [lessonId, fileName, contentType, data]
  )
}

export async function getLessonMediaFile(lessonId: string, fileName: string) {
  const { rows } = await pool.query<{
    content_type: string
    file_data: Buffer
  }>(
    `
      SELECT content_type, file_data
      FROM lesson_media_files
      WHERE lesson_id = $1 AND file_name = $2
      LIMIT 1
    `,
    [lessonId, fileName]
  )
  return rows[0] ?? null
}

export async function lessonMediaFileExists(lessonId: string, fileName: string) {
  const { rows } = await pool.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM lesson_media_files
        WHERE lesson_id = $1 AND file_name = $2
          AND octet_length(file_data) > 0
      ) AS exists
    `,
    [lessonId, fileName]
  )
  return rows[0]?.exists ?? false
}

export function contentTypeForLessonMediaFile(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'wav') return 'audio/wav'
  if (ext === 'png') return 'image/png'
  if (ext === 'svg') return 'image/svg+xml'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'
  return 'application/octet-stream'
}
