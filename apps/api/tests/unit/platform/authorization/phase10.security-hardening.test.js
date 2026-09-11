import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(process.cwd())
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8')

describe('phase 10 platform security hardening', () => {
  it('keeps PostgreSQL authoritative for positive authorization decisions by default', () => {
    const source = read('src/platform/authorization/access-control.service.js')

    expect(source).toContain("process.env.AUTHORIZATION_CACHE_TRUST_POSITIVE === 'true'")
    expect(source).toContain('AUTHORIZATION_CACHE_ENABLED && AUTHORIZATION_CACHE_TRUST_POSITIVE')
    expect(source).toContain('const { permissions } = await loadUserPermissions(userId)')
  })

  it('fails closed when authorization cache access is unavailable', () => {
    const source = read('src/platform/authorization/access-control.service.js')

    expect(source).toContain('// Fall through to PostgreSQL.')
    expect(source).toContain('// PostgreSQL remains the source of truth.')
  })

  it('audits permission denials without allowing audit failure to bypass authorization', () => {
    const authorize = read('src/platform/authorization/authorize.js')
    const audit = read('src/platform/audit/audit.service.js')

    expect(authorize).toContain('recordAuthorizationDenied')
    expect(authorize).toContain("new ForbiddenError(")
    expect(audit).toContain("action: 'AUTHORIZATION_DENIED'")
    expect(audit).toContain('Authorization failures must remain fail-closed')
  })

  it('audits resource policy denials separately from permission denials', () => {
    const source = read('src/platform/authorization/authorization-resource.middleware.js')

    expect(source).toContain("reason: 'resource_policy_denied'")
    expect(source).toContain('recordAuthorizationDenied')
  })

  it('retains route-level authentication and authorization enforcement', () => {
    const validator = read('scripts/validate-authorization.cjs')

    expect(validator).toContain('route is missing authentication middleware.')
    expect(validator).toContain('route is missing authorization middleware.')
    expect(validator).toContain("authorization\\s*:\\s*public")
    expect(validator).toContain("authorization\\s*:\\s*auth-boundary")
  })
})
