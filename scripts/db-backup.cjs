const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const output = process.argv[2]
if (!output) {
  console.error('Usage: npm run db:backup -- <output.sql.gz>')
  process.exit(1)
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const absolute = path.resolve(output)
fs.mkdirSync(path.dirname(absolute), { recursive: true })

execFileSync(
  'pg_dump',
  ['--dbname', process.env.DATABASE_URL, '--format=custom', '--file', absolute],
  { stdio: 'inherit' },
)

console.log(`PostgreSQL backup written to ${absolute}`)
