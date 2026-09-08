import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const migrationPath = new URL('../../../../prisma/migrations/20260908130000_remove_obo_application_professional/migration.sql', import.meta.url)
const schemaPath = new URL('../../../../prisma/modules/obo/permit-applications.prisma', import.meta.url)

const readText = (url) => readFile(url, 'utf8')

describe('OBO professional relationship migration contract', () => {
  it('preserves legacy professional data before dropping the relationship', async () => {
    const sql = await readText(migrationPath)

    expect(sql).toContain('jsonb_build_object(')
    expect(sql).toContain("'_legacyProfessional'")
    expect(sql).toContain('p."id"')
    expect(sql).toContain('p."registrationNumber"')
    expect(sql).toContain('p."prcId"')
    expect(sql).toContain('p."ptrNumber"')
    expect(sql).toContain('p."professionalRole"')
    expect(sql.indexOf('jsonb_build_object(')).toBeLessThan(sql.indexOf('DROP COLUMN IF EXISTS "professionalId"'))
  })

  it('drops the legacy index, foreign key, and column without creating a join table', async () => {
    const sql = await readText(migrationPath)

    expect(sql).toContain('DROP INDEX IF EXISTS "OboPermitApplication_professionalId_createdAt_idx"')
    expect(sql).toContain('DROP CONSTRAINT IF EXISTS "OboPermitApplication_professionalId_fkey"')
    expect(sql).toContain('DROP COLUMN IF EXISTS "professionalId"')
    expect(sql).not.toContain('CREATE TABLE "OboPermitApplicationProfessional"')
    expect(sql).not.toContain('CREATE TABLE "ApplicationProfessional"')
  })

  it('keeps the Prisma application model free of a professional relationship', async () => {
    const schema = await readText(schemaPath)

    expect(schema).not.toMatch(/^\s*professionalId\s+/m)
    expect(schema).not.toMatch(/^\s*professional\s+OboProfessional/m)
    expect(schema).toContain('formValues            Json')
    expect(schema).toContain('professionalSnapshots Json?')
  })
})
