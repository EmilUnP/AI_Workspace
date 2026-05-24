import { config as loadDotenv } from 'dotenv'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'

loadDotenv({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbName = process.env.LOCAL_DB_NAME ?? 'eduator_clean'
const schemaFile = path.resolve(__dirname, '../db/migrations/000_full_schema.sql')
const adminSeedFile = path.resolve(__dirname, '../db/seeds/001_admin_user.sql')

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL missing in apps/backend/.env.local')
  }
  return url
}

function adminUrl(databaseUrl: string): string {
  const parsed = new URL(databaseUrl)
  parsed.pathname = '/postgres'
  return parsed.toString()
}

function targetDbUrl(databaseUrl: string): string {
  const parsed = new URL(databaseUrl)
  parsed.pathname = `/${dbName}`
  return parsed.toString()
}

function maskUrl(url: string): string {
  return url.replace(/:([^:@/]+)@/, ':***@')
}

async function recreateDatabase(admin: Client) {
  await admin.query(
    `
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = $1 AND pid <> pg_backend_pid()
  `,
    [dbName]
  )
  await admin.query(`DROP DATABASE IF EXISTS ${dbName}`)
  await admin.query(`CREATE DATABASE ${dbName}`)
}

async function main() {
  const databaseUrl = requireDatabaseUrl()
  const admin = new Client({ connectionString: adminUrl(databaseUrl) })
  await admin.connect()

  console.log(`Recreating local database: ${dbName}`)
  console.log(`Using: ${maskUrl(databaseUrl)}`)

  await recreateDatabase(admin)
  await admin.end()

  const db = new Client({ connectionString: targetDbUrl(databaseUrl) })
  await db.connect()

  console.log(`Applying schema: ${schemaFile}`)
  try {
    await db.query(await readFile(schemaFile, 'utf8'))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('extension "vector" is not available')) {
      throw new Error(
        'pgvector is required for local setup.\n\n' +
          '1) Open PowerShell as Administrator\n' +
          '2) Run: apps/backend/scripts/install-pgvector-local.ps1\n' +
          '3) Run again: npm run db:setup-local\n\n' +
          'Or install pgvector manually into D:\\PostgreSQL\\17 (see script comments).'
      )
    }
    throw error
  }

  console.log(`Seeding admin user: ${adminSeedFile}`)
  await db.query(await readFile(adminSeedFile, 'utf8'))

  const { rows: tables } = await db.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  )
  const { rows: users } = await db.query<{ email: string; role: string }>(
    `SELECT email, role FROM public.users WHERE email = 'admin@clean.local'`
  )

  await db.end()

  console.log('\nLocal database setup complete.')
  console.log(`Database: ${dbName}`)
  console.log(`Tables (${tables.length}): ${tables.map((t) => t.tablename).join(', ')}`)
  console.log(`Admin user: ${users[0]?.email ?? 'MISSING'} (${users[0]?.role ?? '-'})`)
  console.log('\nLogin:')
  console.log('  Email:    admin@clean.local')
  console.log('  Password: admin12345')
  console.log('\nStart backend: npm run dev')
}

main().catch((error) => {
  console.error('Local DB setup failed:', error)
  process.exit(1)
})
