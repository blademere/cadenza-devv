import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const root = new URL('../../../src/', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

describe('OBO authorization management architecture', () => {
  it('keeps management routes inside the OBO application boundary', async () => {
    const routes = await read('apps/obo/authorization/authorization.routes.js')
    expect(routes).not.toContain('/admin/authorization')
    expect(routes).toContain("authorize('obo_authorization', 'manage')")
    expect(routes).toContain('authorizeResource')
  })

  it('owns authorization management persistence and service inside OBO', async () => {
    const managementService = await read('apps/obo/authorization/authorization-management.service.js')
    const managementRepository = await read('apps/obo/authorization/authorization-management.repository.js')

    expect(managementService).toContain("./authorization-management.repository.js")
    expect(managementRepository).toContain('getPrismaClient')
  })

  it('keeps OBO permission catalog keys scoped to the OBO namespace', async () => {
    const service = await read('apps/obo/authorization/authorization-management.service.js')
    expect(service).toContain("OBO_AUTHORIZATION_MODULE_PREFIX = 'obo_'")
  })

  it('does not leave a Platform authorization management implementation behind', async () => {
    await expect(read('platform/authorization/authorization-management.service.js')).rejects.toThrow()
    await expect(read('platform/authorization/authorization-management.repository.js')).rejects.toThrow()
  })
})
