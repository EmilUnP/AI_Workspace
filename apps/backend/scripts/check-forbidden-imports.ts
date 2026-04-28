import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Glob } from 'glob'

const root = path.resolve(process.cwd(), 'src')
const patterns = ['**/*.ts']
const forbidden = ['@eduator/auth', '@supabase', 'organization', 'organizations', 'organization_id']

async function main() {
  const glob = new Glob(patterns[0], { cwd: root, nodir: true })
  const failures: string[] = []

  for await (const relativePath of glob.iterate()) {
    const absPath = path.join(root, relativePath)
    const content = await readFile(absPath, 'utf8')
    for (const token of forbidden) {
      if (content.includes(token)) {
        failures.push(`${relativePath}: contains forbidden token "${token}"`)
      }
    }
  }

  if (failures.length > 0) {
    // eslint-disable-next-line no-console
    console.error(failures.join('\n'))
    process.exit(1)
  }

  // eslint-disable-next-line no-console
  console.log('No forbidden imports/tokens found in clean-backend src.')
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error)
  process.exit(1)
})
