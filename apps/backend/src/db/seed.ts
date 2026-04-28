import { hash } from 'bcryptjs'
import { pool, closePool } from './client.js'

async function seed() {
  const passwordHash = await hash('admin12345', 12)
  await pool.query(
    `
    INSERT INTO users (email, password_hash, role)
    VALUES ('admin@clean.local', $1, 'admin')
    ON CONFLICT (email) DO NOTHING
  `,
    [passwordHash]
  )
}

seed()
  .then(async () => {
    // eslint-disable-next-line no-console
    console.log('Seed completed.')
    await closePool()
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed:', error)
    await closePool()
    process.exit(1)
  })
