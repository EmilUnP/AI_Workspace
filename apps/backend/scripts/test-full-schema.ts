import { config as loadDotenv, parse as parseDotenv } from 'dotenv'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'

loadDotenv({ path: '.env.local' })
loadDotenv({ path: '.env.example' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const TEST_DB = 'eduator_schema_test'
const schemaFile = path.resolve(__dirname, '../db/migrations/000_full_schema.sql')

const expectedTables = [
  'users',
  'refresh_tokens',
  'documents',
  'ai_requests',
  'user_ai_provider_keys',
  'user_api_keys',
  'api_access_log',
  'education_plans',
  'exams',
  'lessons',
  'teacher_chat_assistants',
  'teacher_chat_conversations',
  'teacher_chat_messages',
  'schema_migrations'
]

function resolveDatabaseUrl(): string {
  const cliUrl = process.argv.find((arg) => arg.startsWith('--url='))?.slice('--url='.length)
  if (cliUrl) return cliUrl

  let url = process.env.DATABASE_URL
  const isPlaceholder = !url || url.includes('USER:PASSWORD') || url.includes('yourpassword')

  if (isPlaceholder) {
    try {
      const example = parseDotenv(readFileSync(path.resolve(__dirname, '../.env.example')))
      if (example.DATABASE_URL && !example.DATABASE_URL.includes('yourpassword')) {
        console.warn('DATABASE_URL in .env.local is a placeholder — trying .env.example for this test run.')
        url = example.DATABASE_URL
      }
    } catch {
      // ignore missing example file
    }
  }

  if (!url) {
    throw new Error(
      'DATABASE_URL is missing.\n\n' +
        'Option 1 — edit apps/backend/.env.local:\n' +
        '  DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/eduator_clean\n\n' +
        'Option 2 — pass URL for this run only (PowerShell):\n' +
        '  $env:DATABASE_URL="postgres://postgres:YOUR_PASSWORD@localhost:5432/eduator_clean"; npm run db:test-schema\n\n' +
        'Option 3 — CLI flag:\n' +
        '  npm run db:test-schema -- --url=postgres://postgres:YOUR_PASSWORD@localhost:5432/eduator_clean'
    )
  }

  if (url.includes('USER:PASSWORD') || url.includes('yourpassword')) {
    throw new Error(
      'DATABASE_URL still uses placeholder credentials.\n\n' +
        'Open apps/backend/.env.local and replace line 4 with your real local PostgreSQL login\n' +
        '(same user/password you use in pgAdmin or DBeaver for eduator_clean).\n\n' +
        'Example:\n' +
        '  DATABASE_URL=postgres://postgres:MyRealPassword@localhost:5432/eduator_clean\n\n' +
        'Or run once without editing the file:\n' +
        '  npm run db:test-schema -- --url=postgres://postgres:MyRealPassword@localhost:5432/eduator_clean'
    )
  }

  return url
}

function adminUrlFrom(databaseUrl: string): string {
  const parsed = new URL(databaseUrl)
  parsed.pathname = '/postgres'
  return parsed.toString()
}

function testDbUrlFrom(databaseUrl: string): string {
  const parsed = new URL(databaseUrl)
  parsed.pathname = `/${TEST_DB}`
  return parsed.toString()
}

function maskUrl(url: string): string {
  return url.replace(/:([^:@/]+)@/, ':***@')
}

async function dropDatabaseIfExists(admin: Client) {
  await admin.query(
    `
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = $1 AND pid <> pg_backend_pid()
  `,
    [TEST_DB]
  )
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB}`)
}

async function main() {
  const databaseUrl = resolveDatabaseUrl()
  const admin = new Client({ connectionString: adminUrlFrom(databaseUrl) })

  try {
    await admin.connect()
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
    if (code === '28P01') {
      throw new Error(
        'PostgreSQL login failed (wrong username or password).\n\n' +
          'Use the same credentials that work in pgAdmin/DBeaver for your local database.\n' +
          `Tried: ${maskUrl(databaseUrl)}`
      )
    }
    throw error
  }

  console.log(`Using admin connection: ${maskUrl(adminUrlFrom(databaseUrl))}`)
  console.log(`Creating fresh test database: ${TEST_DB}`)

  await dropDatabaseIfExists(admin)
  await admin.query(`CREATE DATABASE ${TEST_DB}`)
  await admin.end()

  const testClient = new Client({ connectionString: testDbUrlFrom(databaseUrl) })
  await testClient.connect()

  console.log(`Running schema file: ${schemaFile}`)
  const sql = await readFile(schemaFile, 'utf8')

  try {
    await testClient.query(sql)
    console.log('Schema SQL executed successfully.')
  } catch (error) {
    console.error('Schema SQL failed:')
    console.error(error)
    await testClient.end()
    process.exit(1)
  }

  const { rows: tableRows } = await testClient.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  )
  const tables = tableRows.map((row) => row.tablename)

  const missing = expectedTables.filter((name) => !tables.includes(name))
  const extra = tables.filter((name) => !expectedTables.includes(name))

  const { rows: migrationRows } = await testClient.query<{ id: string }>(
    `SELECT id FROM schema_migrations ORDER BY id`
  )

  const { rows: extensionRows } = await testClient.query<{ extname: string }>(
    `SELECT extname FROM pg_extension WHERE extname = 'pgcrypto'`
  )

  console.log('\n--- Results ---')
  console.log(`Tables created (${tables.length}): ${tables.join(', ')}`)

  if (missing.length > 0) {
    console.error(`Missing tables: ${missing.join(', ')}`)
  } else {
    console.log('All expected tables present.')
  }

  if (extra.length > 0) {
    console.log(`Extra tables: ${extra.join(', ')}`)
  }

  console.log(`pgcrypto extension: ${extensionRows.length > 0 ? 'yes' : 'NO'}`)
  console.log(`schema_migrations rows (${migrationRows.length}):`)
  for (const row of migrationRows) {
    console.log(`  - ${row.id}`)
  }

  // Idempotency check: run the same file again
  console.log('\nRe-running schema file (idempotency test)...')
  try {
    await testClient.query(sql)
    console.log('Second run succeeded (idempotent).')
  } catch (error) {
    console.error('Second run failed — schema is NOT idempotent:')
    console.error(error)
    await testClient.end()
    process.exit(1)
  }

  await testClient.end()

  if (missing.length > 0 || extensionRows.length === 0) {
    process.exit(1)
  }

  console.log('\nLocal schema test PASSED.')
  console.log(`Test database "${TEST_DB}" was left in place for manual inspection.`)
  console.log(`Connect with: ${maskUrl(testDbUrlFrom(databaseUrl))}`)
  console.log(`Drop when done: DROP DATABASE ${TEST_DB};`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
