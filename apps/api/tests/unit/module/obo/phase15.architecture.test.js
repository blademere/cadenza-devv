import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const formsSchemaPath = new URL('../../../../prisma/platform/forms.prisma', import.meta.url)
const permitTypeSchemaPath = new URL('../../../../prisma/modules/obo/permit-types.prisma', import.meta.url)
const applicationSchemaPath = new URL('../../../../prisma/modules/obo/permit-applications.prisma', import.meta.url)
const permitTypeMigrationPath = new URL('../../../../prisma/migrations/20260908150000_decouple_obo_permit_type_form_relation/migration.sql', import.meta.url)
const applicationMigrationPath = new URL('../../../../prisma/migrations/20260908151000_decouple_obo_application_form_version/migration.sql', import.meta.url)
const permitTypeRepositoryPath = new URL('../../../../src/modules/obo/permit-types/permit-type.repository.js', import.meta.url)
const platformFormRepositoryPath = new URL('../../../../src/platform/forms/form.repository.js', import.meta.url)
const platformFormServicePath = new URL('../../../../src/platform/forms/form.service.js', import.meta.url)
const planPermitFormPath = new URL('../../../../src/modules/obo/plan-permits/plan-permit.form.js', import.meta.url)

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

    expect(permitTypeSchema).toMatch(/^\s*formId\s+String\?\s*$/m)
    expect(permitTypeSchema).not.toMatch(/^\s*formId\s+\S+\s+@relation\(fields:\s*\[formId\]/m)
    expect(applicationSchema).toMatch(/^\s*formVersionId\s+String\?\s*$/m)
    expect(applicationSchema).not.toMatch(/^\s*formVersion\s+FormVersion\?/m)
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

  it('keeps Platform Forms persistence inside the Platform Forms repository', async () => {
    const permitTypeRepository = await readText(permitTypeRepositoryPath)
    const platformFormRepository = await readText(platformFormRepositoryPath)

    expect(permitTypeRepository).toContain("../../../platform/forms/form.repository.js")
    expect(permitTypeRepository).toContain('formRepository.findByIdWithDefinition')
    expect(permitTypeRepository).toContain('formRepository.findPublishedVersion')
    expect(permitTypeRepository).toContain('formRepository.findLatestDraftVersion')
    expect(permitTypeRepository).not.toMatch(/db\.form(?:Version)?\s*\./)

    expect(platformFormRepository).toContain('db.form.findUnique')
    expect(platformFormRepository).toContain('db.formVersion.findUnique')
  })

  it('keeps OBO form resolution behind the Platform Forms service', async () => {
    const source = await readText(planPermitFormPath)
    const service = await readText(platformFormServicePath)

    expect(source).toContain("../../../platform/forms/form.service.js")
    expect(source).not.toContain('plan-permit.repository.js')
    expect(service).toContain('const getFormById')
    expect(service).toContain('const getFormVersionById')
  })
})
