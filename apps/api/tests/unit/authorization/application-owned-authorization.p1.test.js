import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')

describe('Application-owned authorization hardening', () => {
  it('requires Role ownership by appId', async () => {
    const schema = await read('../../../prisma/platform/users.prisma')
    expect(schema).toMatch(/model Role \{[\s\S]*?appId\s+String[\s\S]*?app\s+App\s+@relation\(/)
    expect(schema).toContain('@@unique([appId, name])')
    expect(schema).toContain('@@index([appId])')
  })

  it('makes OBO role mutations explicitly application-scoped', async () => {
    const repository = await read('../../../src/apps/obo/authorization/authorization-management.repository.js')
    expect(repository).toContain('const findRoleById = (id, appId)')
    expect(repository).toContain('id: Number(id), appId')
    expect(repository).toContain('const replaceRolePermissions = async (roleId, appId, permissionIds)')
    expect(repository).toContain('const replaceMembershipRoles = async (membershipId, appId, roleIds)')
    expect(repository).toContain('id: { in: normalizedRoleIds }, appId')
  })

  it('rejects cross-application role assignment at the OBO boundary', async () => {
    const repository = await read('../../../src/apps/obo/authorization/authorization-management.repository.js')
    expect(repository).toContain('membership: { appId, isActive: true')
    expect(repository).toContain('role: { appId }')
    expect(repository).toContain('where: { id: { in: normalizedRoleIds }, appId }')
  })

  it('enforces the OBO permission namespace', async () => {
    const service = await read('../../../src/apps/obo/authorization/authorization-management.service.js')
    const repository = await read('../../../src/apps/obo/authorization/authorization-management.repository.js')
    expect(service).toContain("const OBO_AUTHORIZATION_MODULE_PREFIX = 'obo_'")
    expect(service).toContain('module.key.startsWith(OBO_AUTHORIZATION_MODULE_PREFIX)')
    expect(repository).toContain("key: { startsWith: 'obo_' }")
  })

  it('keeps application role management out of the global users capability', async () => {
    const routes = await read('../../../src/apps/obo/users/user.routes.js')
    const service = await read('../../../src/features/users/user.service.js')
    const repository = await read('../../../src/features/users/user.repository.js')

    expect(routes).toContain("router.post('/:userId/roles'")
    expect(routes).toContain('authorizeOBOUserRoleManagement')
    expect(routes).toContain('assignUserRoleValidator')
    expect(service).not.toContain('assignUserRole')
    expect(service).not.toContain('findRoleForAssignment')
    expect(repository).not.toContain('findRoleForAssignment')
    expect(repository).not.toContain('prisma.role.')
  })
})
