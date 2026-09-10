import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const paths = {
  authorizationSeed: new URL('../../../../scripts/seed/authorization.js', import.meta.url),
  webPermissions: new URL('../../../../../../apps/obo-web/src/config/permissions.js', import.meta.url),
  webNavigation: new URL('../../../../../../apps/obo-web/src/config/navigation.js', import.meta.url),
}

const readText = (url) => readFile(url, 'utf8')

describe('Phase 18 OBO cross-layer contract', () => {
  it('keeps the OBO plan permit authorization vocabulary aligned across API and web', async () => {
    const apiSource = await readText(paths.authorizationSeed)
    const webSource = await readText(paths.webPermissions)

    expect(apiSource).toContain("obo_plan_permits: ['read', 'create', 'update', 'submit', 'schedule_submission', 'receive']")
    expect(apiSource).not.toContain("obo_plan_permits: ['read', 'create', 'update', 'submit', 'schedule_submission', 'receive', 'inspect']")
    expect(webSource).not.toContain("inspect: 'obo_plan_permits:inspect'")
  })

  it('uses the permit type permission for Permit Types navigation', async () => {
    const navigation = await readText(paths.webNavigation)

    expect(navigation).toMatch(/key: 'permit-types',[\s\S]*?requiredPermissions: \[permissions\.permitTypes\.read\]/)
    expect(navigation).not.toMatch(/key: 'permit-types',[\s\S]*?requiredPermissions: \[permissions\.planPermits\.read\]/)
  })

  it('keeps submission appointment persistence out of the Plan Permit repository', async () => {
    const repository = await readText(new URL('../../../../src/modules/obo/plan-permits/plan-permit.repository.js', import.meta.url))

    expect(repository).not.toContain('oboSubmissionAppointment.create')
    expect(repository).not.toContain('oboSubmissionAppointment.update')
    expect(repository).not.toContain('findSubmissionAppointmentByApplicationId')
  })
})
