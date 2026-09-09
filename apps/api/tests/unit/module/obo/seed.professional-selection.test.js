import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const apiRoot = path.resolve(fileURLToPath(new URL('../../../..', import.meta.url)))
const seedRoot = path.join(apiRoot, 'scripts', 'seed')

const readSeed = (name) => readFile(path.join(seedRoot, name), 'utf8')

describe('OBO professional seed architecture', () => {
  it('seeds a verified professional with an explicit professional role', async () => {
    const content = await readSeed('obo-development.js')

    expect(content).toContain("professionalRole: 'ARCHITECT'")
    expect(content).toContain("status: 'VERIFIED'")
    expect(content).toContain('professionalRole: OBO_DEVELOPMENT_FIXTURE.professionalRole')
  })

  it('stores the development professional selection in formValues', async () => {
    const content = await readSeed('obo-development.js')

    expect(content).toContain("professionalFieldKey: 'architect'")
    expect(content).toContain("type !== 'reference'")
    expect(content).toContain("referenceType !== 'obo_professional'")
    expect(content).toContain('[OBO_DEVELOPMENT_FIXTURE.professionalFieldKey]: professional.id')
    expect(content).toContain('professionalSnapshots')
  })

  it('does not retain the removed application-level professional relation in the active seed', async () => {
    const content = await readSeed('obo-development.js')
    const applicationUpsertStart = content.indexOf('const application = await prisma.oboPermitApplication.upsert(')
    const applicationUpsertEnd = content.indexOf('\n  await prisma.workflowInstance.update(', applicationUpsertStart)

    expect(applicationUpsertStart).toBeGreaterThanOrEqual(0)
    expect(applicationUpsertEnd).toBeGreaterThan(applicationUpsertStart)

    const applicationUpsert = content.slice(applicationUpsertStart, applicationUpsertEnd)

    expect(applicationUpsert).not.toContain('professionalId:')
    expect(applicationUpsert).not.toContain('professionalId,')
    expect(applicationUpsert).toContain('professionalSnapshots')
    expect(applicationUpsert).toContain('formVersionId: formVersion.id')
    expect(applicationUpsert).toContain('formValues,')
  })

  it('assigns roles to professional verification fixtures', async () => {
    const content = await readSeed('obo-professional-verification.js')

    expect(content).toContain("professionalRole: 'ARCHITECT'")
    expect(content).toContain("professionalRole: 'CIVIL_ENGINEER'")
    expect(content).toContain('professionalRole: fixture.professionalRole')
  })

  it('uses the form-owned development seed module from db-seed', async () => {
    const content = await readFile(path.join(apiRoot, 'scripts', 'db-seed.js'), 'utf8')

    expect(content).toContain("from './seed/obo-development.js'")
    expect(content).not.toContain("from './seed/obo.js'")
  })
})
