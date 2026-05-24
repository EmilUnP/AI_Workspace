# Install pgvector for PostgreSQL 17 on Windows (run PowerShell AS ADMINISTRATOR)
# Then: cd apps/backend && npm run db:setup-local

$ErrorActionPreference = 'Stop'
$PgRoot = 'D:\PostgreSQL\17'
$ZipUrl = 'https://github.com/andreiramani/pgvector_pgsql_windows/releases/download/0.8.2_17.6/vector.v0.8.2-pg17.zip'
$WorkDir = Join-Path $env:TEMP 'pgvector-pg17-install'
$ZipPath = Join-Path $env:TEMP 'pgvector-pg17.zip'

if (-not (Test-Path $PgRoot)) {
  throw "PostgreSQL not found at $PgRoot. Edit `$PgRoot in this script if your install path differs."
}

Write-Host "Downloading pgvector..."
Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipPath
Expand-Archive -Path $ZipPath -DestinationPath $WorkDir -Force

Write-Host "Installing into $PgRoot ..."
Copy-Item (Join-Path $WorkDir 'lib\vector.dll') (Join-Path $PgRoot 'lib\vector.dll') -Force
Copy-Item (Join-Path $WorkDir 'share\extension\*') (Join-Path $PgRoot 'share\extension\') -Force
Copy-Item (Join-Path $WorkDir 'include\server\extension\vector') (Join-Path $PgRoot 'include\server\extension\vector') -Recurse -Force

Write-Host 'pgvector installed. Restart PostgreSQL service if CREATE EXTENSION fails.'
Write-Host 'Next: cd apps/backend && npm run db:setup-local'
