import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool, closePool } from './client.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const migrationsDir = path.resolve(__dirname, '../../db/migrations')

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}

async function migrate() {
  await ensureMigrationsTable()

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const migrationId = file
    const existing = await pool.query('SELECT id FROM schema_migrations WHERE id = $1', [migrationId])
    if (existing.rowCount && existing.rowCount > 0) continue

    const sql = await readFile(path.join(migrationsDir, file), 'utf8')
    await pool.query('BEGIN')
    try {
      await pool.query(sql)
      await pool.query('INSERT INTO schema_migrations(id) VALUES ($1)', [migrationId])
      await pool.query('COMMIT')
      // eslint-disable-next-line no-console
      console.log(`Applied migration: ${migrationId}`)
    } catch (error) {
      await pool.query('ROLLBACK')
      throw error
    }
  }
}

migrate()
  .then(async () => {
    await closePool()
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error('Migration failed:', error)
    await closePool()
    process.exit(1)
  })
