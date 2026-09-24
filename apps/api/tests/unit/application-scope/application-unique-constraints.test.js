import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

describe('application-scoped unique constraints', () => {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const prismaRoot = path.resolve(here, '../../../prisma')
  const read = (relativePath) => readFileSync(path.join(prismaRoot, relativePath), 'utf8')

  test('application-owned case numbers are unique per application', () => {
    const schema = read('platform/cases.prisma')
    expect(schema).toContain('@@unique([appId, caseNumber])')
    expect(schema).not.toContain('caseNumber      String                @unique')
  })

  test('application-owned form and requirement keys are unique per application', () => {
    const forms = read('platform/forms.prisma')
    const requirements = read('platform/requirements.prisma')
    expect(forms).toContain('@@unique([appId, key])')
    expect(requirements).toContain('@@unique([appId, key])')
  })

  test('application-owned appointment identifiers are unique per application', () => {
    const schema = read('platform/appointments.prisma')
    expect(schema).toContain('@@unique([appId, key])')
    expect(schema).toContain('@@unique([appId, referenceNumber])')
    expect(schema).not.toContain('key                    String                 @unique')
    expect(schema).not.toContain('referenceNumber   String          @unique')
  })

  test('OBO identifiers are unique within the OBO application scope', () => {
    const permitTypes = read('modules/obo/permit-types.prisma')
    const applications = read('modules/obo/permit-applications.prisma')
    const professionals = read('modules/obo/professionals.prisma')

    expect(permitTypes).toContain('@@unique([appId, key])')
    expect(applications).toContain('@@unique([appId, referenceNumber])')
    expect(professionals).toContain('@@unique([appId, personId])')
    expect(professionals).toContain('@@unique([appId, registrationNumber])')
    expect(professionals).toContain('@@unique([appId, prcId])')
  })

  test('global platform identifiers remain globally unique', () => {
    expect(read('platform/cases.prisma')).toMatch(/key\s+String\s+@unique/)
    expect(read('platform/documents.prisma')).toMatch(/storageKey\s+String\s+@unique/)
    expect(read('platform/workflow.prisma')).toMatch(/key\s+String\s+@unique/)
  })
})
