import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = path.dirname(fileURLToPath(import.meta.url))
const prisma = path.resolve(here, '../../../prisma')
const migrationPath = path.join(
  prisma,
  'migrations/20260916190000_finalize_application_ownership/migration.sql'
)

const readMigration = () => readFile(migrationPath, 'utf8')

describe('phase 18 application ownership migration', () => {
  it('backfills ownership only from authoritative relationships', async () => {
    const sql = await readMigration()

    expect(sql).toContain('FROM "App" a')
    expect(sql).toContain("a.\"key\" = 'obo'")
    expect(sql).toContain('FROM "OboPermitApplication" p')
    expect(sql).toContain('FROM "CaseRecord" c')
    expect(sql).toContain('FROM "OboSubmissionAppointment" osa')
    expect(sql).toContain('FROM "Appointment" a')
    expect(sql).toContain('FROM "OboPermitType" pt')
    expect(sql).not.toMatch(/UPDATE\s+"(?:CaseRecord|Task|Appointment|AppointmentType|Form|RequirementDefinition)"[\s\S]{0,500}WHERE[\s\S]{0,500}userId/i)
  })

  it('fails closed when required application ownership remains unresolved', async () => {
    const sql = await readMigration()

    for (const table of [
      'CaseRecord',
      'Task',
      'AppointmentType',
      'Appointment',
      'RequirementDefinition',
      'Form',
      'OboPermitType',
      'OboPermitApplication',
      'OboProfessional',
    ]) {
      expect(sql).toContain(`FROM "${table}" WHERE "appId" IS NULL`)
    }

    expect(sql).toContain('ALTER TABLE "CaseRecord" ALTER COLUMN "appId" SET NOT NULL')
    expect(sql).toContain('ALTER TABLE "OboPermitApplication" ALTER COLUMN "appId" SET NOT NULL')
    expect(sql).toContain('Do not silently default unresolved rows to OBO.')
  })

  it('rejects parent-child application mismatches before adding composite foreign keys', async () => {
    const sql = await readMigration()

    expect(sql).toContain('t."appId" <> c."appId"')
    expect(sql).toContain('a."appId" <> at."appId"')
    expect(sql).toContain('p."appId" <> c."appId"')
    expect(sql).toContain('p."appId" <> pt."appId"')
    expect(sql).toContain('c."appId" <> r."appId"')
    expect(sql).toContain('pt."appId" <> r."appId"')
  })

  it('adds database-level composite ownership constraints for OBO permit applications', async () => {
    const sql = await readMigration()

    expect(sql).toContain('"OboPermitApplication_caseId_appId_fkey"')
    expect(sql).toContain('FOREIGN KEY ("caseId", "appId")')
    expect(sql).toContain('REFERENCES "CaseRecord" ("id", "appId")')
    expect(sql).toContain('"OboPermitApplication_permitTypeId_appId_fkey"')
    expect(sql).toContain('FOREIGN KEY ("permitTypeId", "appId")')
    expect(sql).toContain('REFERENCES "OboPermitType" ("id", "appId")')
  })

  it('does not treat nullable contextual documents or audit logs as unresolved ownership', async () => {
    const sql = await readMigration()

    expect(sql).not.toContain('FROM "Document" WHERE "appId" IS NULL')
    expect(sql).not.toContain('FROM "AuditLog" WHERE "appId" IS NULL')
  })
})
