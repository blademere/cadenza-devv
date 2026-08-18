const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const input = process.argv[2]
if (!input) {
  console.error('Usage: ALLOW_DESTRUCTIVE_RESTORE=true npm run db:restore -- <backup.sql.gz>')
  process.exit(1)
}

if (process.env.ALLOW_DESTRUCTIVE_RESTORE !== 'true') {
  console.error('Refusing destructive restore. Set ALLOW_DESTRUCTIVE_RESTORE=true explicitly.')
  process.exit(1)
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const absolute = path.resolve(input)
if (!fs.existsSync(absolute)) {
  console.error(`Backup does not exist: ${absolute}`)
  process.exit(1)
}

execFileSync('pg_restore', [
  '--clean',
  '--if-exists',
  '--dbname',
  process.env.DATABASE_URL,
  absolute,
], { stdio: 'inherit' })

console.log(`PostgreSQL restore completed from ${absolute}`)
