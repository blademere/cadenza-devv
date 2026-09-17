import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(here, '../../../src')
const read = (relativePath) => readFile(path.join(src, relativePath), 'utf8')

describe('phase 15 application ownership boundaries', () => {
  it('does not re-read an OBO permit application by id without appId after a scoped update', async () => {
    const source = await read('apps/obo/plan-permits/plan-permit.repository.js')
    expect(source).toContain('where: withAppId({ id }, owner)')
    expect(source).not.toContain('where: { id },\n    include: applicationInclude')
  })

  it('does not re-read a receiving application by id without appId after a scoped update', async () => {
    const source = await read('apps/obo/receiving/receiving.repository.js')
    expect(source).toContain('where: withAppId({ id }, appId)')
    expect(source).not.toContain('where: { id }, include: applicationInclude')
  })

  it('keeps requirement status reads scoped through the owning case', async () => {
    const source = await read('features/requirements/requirements.service.js')
    expect(source).toContain('where: { id, caseRecord: { appId } }')
  })

  it('does not expose an unscoped application-owned case lookup', async () => {
    const source = await read('features/cases/cases.repository.js')
    expect(source).toContain('const findCaseById = (id, { appId, db = prisma, includeDetails = true } = {})')
    expect(source).toContain('where: { id, appId }')
    expect(source).not.toMatch(/caseRecord\.findUnique\(\{\s*where:\s*\{\s*id\s*\}\s*\}\)/)
  })
})
