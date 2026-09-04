const fs = require('node:fs')
const path = require('node:path')

const migrationsDir = path.resolve(__dirname, '..', 'prisma', 'migrations')
const lockFile = path.join(migrationsDir, 'migration_lock.toml')

function fail(message) {
  console.error(`Migration validation failed: ${message}`)
  process.exit(1)
}

if (!fs.existsSync(migrationsDir)) {
  fail('prisma/migrations directory is missing')
}

if (!fs.existsSync(lockFile)) {
  fail('prisma/migrations/migration_lock.toml is missing')
}

const entries = fs.readdirSync(migrationsDir, { withFileTypes: true })
const migrations = entries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

const invalidNames = migrations.filter((name) => !/^\d{14}_[a-z0-9][a-z0-9_-]*$/.test(name))
if (invalidNames.length > 0) {
  fail(`invalid migration directory name(s): ${invalidNames.join(', ')}`)
}

const duplicatePrefixes = new Set()
for (const name of migrations) {
  const prefix = name.slice(0, 14)
  if (duplicatePrefixes.has(prefix)) {
    fail(`duplicate migration timestamp: ${prefix}`)
  }
  duplicatePrefixes.add(prefix)

  const sqlFile = path.join(migrationsDir, name, 'migration.sql')
  if (!fs.existsSync(sqlFile)) {
    fail(`${name} is missing migration.sql`)
  }

  const sql = fs.readFileSync(sqlFile, 'utf8').trim()
  if (!sql) {
    fail(`${name}/migration.sql is empty`)
  }
}

console.log(`Migration validation passed: ${migrations.length} migration(s) checked.`)
