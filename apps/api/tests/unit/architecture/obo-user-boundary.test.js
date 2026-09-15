import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const api = (file) => new URL(`../../../${file}`, import.meta.url)
const readText = (url) => readFile(url, 'utf8')

describe('OBO User boundary', () => {
  it('keeps User free of the OBO professional ownership relation', async () => {
    const userSchema = await readText(api('prisma/platform/users.prisma'))
    const professionalSchema = await readText(
      api('prisma/modules/obo/professionals.prisma')
    )

    expect(userSchema).not.toMatch(
      /^\s*oboProfessional\s+OboProfessional\?/m
    )
    expect(professionalSchema).not.toMatch(/^\s*userId\s+Int\?/m)
    expect(professionalSchema).not.toMatch(
      /^\s*user\s+User\?/m
    )
    expect(professionalSchema).toMatch(/^\s*personId\s+String\s+@unique/m)
    expect(professionalSchema).toMatch(/^\s*person\s+Person\s+@relation/m)
  })

  it('resolves the current professional through the shared Person identity', async () => {
    const repository = await readText(
      api('src/apps/obo/professionals/professional.repository.js')
    )
    const service = await readText(
      api('src/apps/obo/professionals/professional.service.js')
    )

    expect(repository).toContain('findPersonByUserId')
    expect(repository).toContain('findByPersonId')
    expect(repository).not.toContain('findByUserId =')
    expect(service).toContain('const person = await repository.findPersonByUserId(userId)')
    expect(service).toContain('repository.findByPersonId(person.id)')
    expect(service).not.toContain('repository.findByUserId(userId)')
    expect(service).not.toContain('professional.userId')
  })

  it('retains only generic User actor relations for OBO decisions', async () => {
    const professional = await readText(
      api('prisma/modules/obo/professionals.prisma')
    )
    const application = await readText(
      api('prisma/modules/obo/permit-applications.prisma')
    )
    const receiving = await readText(
      api('prisma/modules/obo/receiving-decisions.prisma')
    )
    const verification = await readText(
      api('prisma/modules/obo/professional-verification-decisions.prisma')
    )

    expect(professional).toContain('verifiedByUserId')
    expect(professional).toContain('@relation("OboProfessionalVerifiedBy"')
    expect(application).toContain('acceptedByUserId')
    expect(application).toContain('@relation("OboApplicationAcceptedBy"')
    expect(receiving).toContain('decidedByUserId')
    expect(receiving).toContain('@relation("OboReceivingDecisionUser"')
    expect(verification).toContain('decidedByUserId')
    expect(verification).toContain(
      '@relation("OboProfessionalVerificationDecisionUser"'
    )
  })

  it('provides a migration that removes the legacy professional user foreign key', async () => {
    const migration = await readText(
      api(
        'prisma/migrations/20260915170000_remove_obo_user_professional_link/migration.sql'
      )
    )

    expect(migration).toContain(
      'DROP CONSTRAINT IF EXISTS "OboProfessional_userId_fkey"'
    )
    expect(migration).toContain(
      'DROP INDEX IF EXISTS "OboProfessional_userId_key"'
    )
    expect(migration).toContain(
      'ALTER TABLE "OboProfessional"\n  DROP COLUMN IF EXISTS "userId"'
    )
  })
})
