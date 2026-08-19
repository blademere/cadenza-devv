import { describe, expect, it } from 'vitest'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const MIGRATIONS_DIR = 'prisma/migrations'

async function readMigrationSql() {
  const entries = await readdir(MIGRATIONS_DIR, {
    withFileTypes: true,
  })

  const migrationFiles = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(MIGRATIONS_DIR, entry.name, 'migration.sql'))

  const migrations = await Promise.all(
    migrationFiles.map(async (file) => {
      try {
        return await readFile(file, 'utf8')
      } catch {
        return ''
      }
    })
  )

  return migrations.join('\n')
}

describe('approval start idempotency contract', () => {
  it('defines an active-instance uniqueness boundary', async () => {
    const migration = await readMigrationSql()

    expect(migration).toContain(
      'CREATE UNIQUE INDEX "ApprovalInstance_active_subject_unique"'
    )

    expect(migration).toContain('WHERE "status" = \'PENDING\'')
  })

  it('keeps completed approvals outside the active uniqueness boundary', async () => {
    const migration = await readMigrationSql()

    expect(migration).not.toContain(
      'CREATE UNIQUE INDEX "ApprovalInstance_subject_unique"'
    )
  })
})
