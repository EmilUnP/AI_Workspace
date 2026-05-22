import { Pool } from 'pg'
import { env } from '../config/env.js'

export const pool = new Pool({
  connectionString: env.DATABASE_URL
})

pool.on('connect', (client) => {
  void client.query('SET search_path TO public')
})

export async function closePool() {
  await pool.end()
}
