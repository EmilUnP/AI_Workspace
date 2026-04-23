/**
 * Bundle the API server with esbuild for Vercel (and other Node runtimes).
 * Bundles all workspace packages (@eduator/db, etc.) so the runtime does not need to resolve .ts sources.
 * Optionally builds @eduator/db first so that dist/ exists when runtime loads the package without bundling.
 */
const esbuild = require('esbuild')
const path = require('path')
const { execSync } = require('child_process')
const fs = require('fs')

const isVercel = process.env.VERCEL === '1'
const rootDir = path.join(__dirname, '..')
const dbDir = path.join(rootDir, '..', 'db')

// Build @eduator/db first so dist/index.js exists (for runtimes that don't use our bundle)
if (fs.existsSync(path.join(dbDir, 'package.json'))) {
  try {
    execSync('npm run build', { cwd: dbDir, stdio: 'inherit' })
  } catch (e) {
    console.warn('@eduator/db build skipped or failed (optional if using bundle):', e.message)
  }
}

async function build() {
  const outDir = path.join(rootDir, 'dist')
  const outfile = path.join(outDir, 'server.js')

  await esbuild.build({
    entryPoints: [path.join(__dirname, '..', 'src', 'server.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    sourcemap: !isVercel,
    minify: isVercel,
    metafile: true,
    // Resolve workspace packages from source so they are bundled (no runtime .ts resolution)
    packages: 'bundle',
    // Node built-ins are externalized by default on platform: 'node'
  }).then((result) => {
    if (result.metafile && !isVercel) {
      const size = (result.metafile.outputs[outfile]?.bytes ?? 0) / 1024
      console.log(`Built ${outfile} (${size.toFixed(1)} KB)`)
    }
  }).catch((err) => {
    console.error('Build failed:', err)
    process.exit(1)
  })
}

build()
