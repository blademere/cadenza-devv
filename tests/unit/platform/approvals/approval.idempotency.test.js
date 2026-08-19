import { describe, expect, it } from 'vitest'

describe('approval start idempotency contract', () => {
  it('defines an active-instance uniqueness boundary', async () => {
    const { readFile } = await import('node:fs/promises')
    const migration = await readFile(
      'prisma/migrations/20260819081441_init/migration.sql',
      'utf8'
    )
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "ApprovalInstance_active_subject_unique"'
    )
    expect(migration).toContain('WHERE "status" = \'PENDING\'')
  })

  it('keeps completed approvals outside the active uniqueness boundary', async () => {
    const { readFile } = await import('node:fs/promises')
    const migration = await readFile(
      'prisma/migrations/20260819081441_init/migration.sql',
      'utf8'
    )
    expect(migration).not.toContain(
      'CREATE UNIQUE INDEX "ApprovalInstance_subject_unique"'
    )
  })
})
