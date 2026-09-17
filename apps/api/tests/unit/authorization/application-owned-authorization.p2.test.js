import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')

describe('Application-owned authorization P2 contracts', () => {
  it('keeps global OpenAPI documentation free of user role assignment', async () => {
    const paths = await read('../../../openapi/paths.yaml')
    const openapi = await read('../../../openapi/openapi.yaml')
    const users = await read('../../../openapi/components/schemas/users.yaml')

    expect(paths).not.toContain('/users/{userId}/role')
    expect(paths).not.toContain('assignUserRole')
    expect(paths).not.toContain('AssignUserRoleRequest')
    expect(openapi).not.toContain('AssignUserRoleRequest')
    expect(users).not.toContain('AssignUserRoleRequest')
  })

  it('requires OBO authorization routes to establish application context before authorization', async () => {
    const routes = await read('../../../src/apps/obo/authorization/authorization.routes.js')

    expect(routes).toContain('router.use(authenticate, requireApplicationContext(), manageAuthorization)')
    expect(routes).toContain('authorizeOBOResource')
    expect(routes).toContain("resource: 'obo_authorization'")
  })

  it('keeps role cache invalidation application-scoped', async () => {
    const repository = await read('../../../src/platform/authorization/authorization.repository.js')
    const cache = await read('../../../src/platform/authorization/authorization.cache.js')
    const service = await read('../../../src/platform/authorization/authorization.service.js')

    expect(repository).toContain('const findUserIdsByRoleId = async (roleId, appId)')
    expect(repository).toContain('select: { appId: true }')
    expect(repository).toContain('if (normalizedAppId && role.appId !== normalizedAppId) return []')
    expect(repository).toContain('appId: resolvedAppId')
    expect(cache).toContain('access-control:user:${userId}:app:${appId}:permissions')
    expect(service).toContain('findUserIdsByRoleId(roleId)')
  })

  it('does not allow failed transactional role creation to become a successful response', async () => {
    const service = await read('../../../src/apps/obo/authorization/authorization-management.service.js')
    const repository = await read('../../../src/apps/obo/authorization/authorization-management.repository.js')
    expect(repository).toContain('if (!membership) return null')
    expect(service).toContain('const role = await repository.createRole({ appId, name, description, membershipId })')
    expect(service).toContain("if (!role) throw new NotFoundError('Application membership not found.')")
  })

  it('does not introduce an admin application authorization boundary', async () => {
    const validator = await read('../../../scripts/validate-authorization.cjs')
    expect(validator).toContain("'src/apps/admin/authorization/'")
    expect(validator).toContain('/apps\\/admin\\/authorization/')
  })
})
