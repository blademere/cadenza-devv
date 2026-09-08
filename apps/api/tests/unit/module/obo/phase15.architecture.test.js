import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const formsSchemaPath = new URL('../../../../prisma/platform/forms.prisma', import.meta.url)
const permitTypeSchemaPath = new URL('../../../../prisma/modules/obo/permit-types.prisma', import.meta.url)
const applicationSchemaPath = new URL('../../../../prisma/modules/obo/permit-applications.prisma', import.meta.url)
const permitTypeMigrationPath = new URL('../../../../prisma/migrations/20260908150000_decouple_obo_permit_type_form_relation/migration.sql', import.meta.url)
const applicationMigrationPath = new URL('../../../../prisma/migrations/20260908151000_decouple_obo_application_form_version/migration.sql', import.meta.url)
const permitTypeRepositoryPath = new URL('../../../../src/modules/obo/permit-types/permit-type.repository.js', import.meta.url)
const permitApplicationRepositoryPath = new URL('../../../../src/modules/obo/plan-permits/plan-permit.repository.js', import.meta.url)
const receivingRepositoryPath = new URL('../../../../src/modules/obo/receiving/receiving.repository.js', import.meta.url)

const readText = (url) => readFile(url, 'utf8')

describe('Phase 15 form architecture contract', () => {
  it('keeps Platform Forms free of OBO relations', async () => {
    const schema = await readText(formsSchemaPath)

    expect(schema).not.toMatch(/^\s*oboPermitTypes\s+/m)
    expect(schema).not.toMatch(/^\s*oboApplications\s+/m)
    expect(schema).not.toContain('OboPermitType')
    expect(schema).not.toContain('OboPermitApplication')
  })

  it('keeps OBO form bindings as scalar integration references', async () => {
    const permitTypeSchema = await readText(permitTypeSchemaPath)
    const applicationSchema = await readText(applicationSchemaPath)

    expect(permitTypeSchema).toContain('formId       String?')
    expect(permitTypeSchema).not.toContain('@relation(fields: [formId]')
    expect(applicationSchema).toContain('formVersionId         String?')
    expect(applicationSchema).not.toContain('formVersion           FormVersion?')
  })

  it('removes the database foreign keys without replacing them with join tables', async () => {
    const permitTypeMigration = await readText(permitTypeMigrationPath)
    const applicationMigration = await readText(applicationMigrationPath)

    expect(permitTypeMigration).toContain('DROP CONSTRAINT IF EXISTS "OboPermitType_formId_fkey"')
    expect(applicationMigration).toContain('DROP CONSTRAINT IF EXISTS "OboPermitApplication_formVersionId_fkey"')
    expect(applicationMigration).toContain('CREATE INDEX IF NOT EXISTS "OboPermitApplication_formVersionId_idx"')
    expect(`${permitTypeMigration}\n${applicationMigration}`).not.toContain('CREATE TABLE "OboPermitApplicationProfessional"')
    expect(`${permitTypeMigration}\n${applicationMigration}`).not.toContain('CREATE TABLE "ApplicationProfessional"')
  })

  it('resolves Platform Forms explicitly from OBO repositories', async () => {
    const permitTypeRepository = await readText(permitTypeRepositoryPath)
    const permitApplicationRepository = await readText(permitApplicationRepositoryPath)
    const receivingRepository = await readText(receivingRepositoryPath)

    expect(permitTypeRepository).toContain('db.form.findUnique')
    expect(permitTypeRepository).not.toContain('include: { form:')
    expect(permitApplicationRepository).toContain('db.formVersion.findUnique')
    expect(permitApplicationRepository).not.toContain('formVersion: formVersionInclude')
    expect(receivingRepository).toContain('db.formVersion.findUnique')
    expect(receivingRepository).not.toContain('formVersion: formVersionInclude')
  })
})
