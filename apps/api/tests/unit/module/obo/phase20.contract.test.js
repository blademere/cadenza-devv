import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const paths = {
  permitTypeRoutes: new URL('../../../../src/modules/obo/permit-types/permit-type.routes.js', import.meta.url),
  capabilityRegistry: new URL('../../../../src/platform/authorization/capability-registry.js', import.meta.url),
  webRouter: new URL('../../../../../../apps/obo-web/src/app/router.jsx', import.meta.url),
  formBuilderPage: new URL('../../../../../../apps/obo-web/src/features/plan-permits/pages/PermitTypeFormBuilderPage.jsx', import.meta.url),
}

const readText = (url) => readFile(url, 'utf8')

describe('Phase 20 OBO authorization contract', () => {
  it('keeps Permit Type API reads under the Permit Type and Form permissions', async () => {
    const source = await readText(paths.permitTypeRoutes)

    expect(source).toMatch(/router\.get\([\s\S]*?authorize\('obo_permit_types', 'read'\)[\s\S]*?controller\.list/)
    expect(source).toMatch(/router\.get\([\s\S]*?authorize\('obo_forms', 'read'\)[\s\S]*?controller\.getForm/)
    expect(source).not.toMatch(/router\.get\([\s\S]*?authorize\('obo_plan_permits', 'read'\)[\s\S]*?controller\.(list|getForm)/)
  })

  it('keeps the Permit Types capability on its dedicated authorization resource', async () => {
    const source = await readText(paths.capabilityRegistry)

    expect(source).toMatch(/key: 'permit-types',[\s\S]*?moduleKey: 'obo_permit_types',[\s\S]*?permission: 'obo_permit_types:read'/)
    expect(source).not.toMatch(/key: 'permit-types',[\s\S]*?moduleKey: 'obo_plan_permits',[\s\S]*?permission: 'obo_plan_permits:read'/)
  })

  it('allows form builder entry with create or update permission', async () => {
    const router = await readText(paths.webRouter)
    const page = await readText(paths.formBuilderPage)

    expect(router).toContain('protectedPageWithAnyPermission')
    expect(router).toMatch(/permit-types\/:permitTypeId\/form\/edit[\s\S]*?permissions\.forms\.create[\s\S]*?permissions\.forms\.update/)
    expect(page).toContain('RequireAnyPermission')
    expect(page).toMatch(/permissions\.forms\.create, permissions\.forms\.update/)
    expect(page).toMatch(/PermissionGate permission=\{permissions\.forms\.update\}/)
  })
})
