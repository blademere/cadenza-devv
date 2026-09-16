import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const migrationPath = resolve(
  process.cwd(),
  'prisma/migrations/20260916090000_make_roles_application_owned/migration.sql',
)

describe('application-owned role migration', () => {
  it('adds explicit application ownership and removes global role-name uniqueness', async () => {
    const sql = await readFile(migrationPath, 'utf8')

    expect(sql).toContain('ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS "appId" TEXT;')
    expect(sql).toContain('ALTER TABLE "Role" DROP CONSTRAINT IF EXISTS "Role_name_key";')
    expect(sql).toContain('ALTER COLUMN "appId" SET NOT NULL')
    expect(sql).toContain('CREATE UNIQUE INDEX "Role_appId_name_key" ON "Role"("appId", "name")')
    expect(sql).toContain('FOREIGN KEY ("appId") REFERENCES "App"("id")')
  })

  it('splits shared roles and preserves both permissions and membership assignments', async () => {
    const sql = await readFile(migrationPath, 'utf8')

    expect(sql).toContain('INSERT INTO "Role" ("name", "description", "appId")')
    expect(sql).toContain('INSERT INTO "RolePermission" ("roleId", "permissionId")')
    expect(sql).toContain('UPDATE "AppMembershipRole" amr')
    expect(sql).toContain('DELETE FROM "Role"')
  })
})
