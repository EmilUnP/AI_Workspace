import { mkdir } from 'node:fs/promises'
import { buildApp } from './app.js'
import { env } from './config/env.js'

const start = async () => {
  if (env.FILE_STORAGE === 'local') {
    await mkdir(env.AI_STORAGE_DIR, { recursive: true })
  }
  const app = await buildApp()
  try {
    await app.listen({ port: env.PORT, host: env.HOST })
    const displayHost = env.HOST === '0.0.0.0' ? 'localhost' : env.HOST
    const baseUrl = `http://${displayHost}:${env.PORT}`
    const version = process.env.npm_package_version || '0.0.1'
    console.log('\nEduator Clean Backend running!\n')
    console.log(`   API Docs:      ${baseUrl}/v1/docs`)
    console.log(`   API Base URL:  ${baseUrl}/v1`)
    console.log(`   Health:        ${baseUrl}/health`)
    console.log(`   Version:       ${version}`)
    console.log(`   Environment:   ${env.NODE_ENV}`)
    if (env.FILE_STORAGE === 'database') {
      console.log('   All file storage: PostgreSQL on DB server (via DATABASE_URL)\n')
    } else {
      console.log(`   All file storage: ${env.AI_STORAGE_DIR} (app server disk)\n`)
    }
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

start()
