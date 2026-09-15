import fs from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { buildAuditWhere } from '../../../../src/platform/audit/audit.query.service.js'

const read = (path) => fs.readFile(new URL(`../../../../${path}`, import.meta.url), 'utf8')

describe('app-aware audit boundary', () => {
  it('filters audit queries by the active application when appId is supplied', () => {
    expect(buildAuditWhere({
      appId: 'obo-app-id',
      entityType: 'OboPermitApplication',
      entityId: '100',
    })).toEqual({
      appId: 'obo-app-id',
      entityType: 'OboPermitApplication',
      entityId: '100',
    })
  })

  it('does not expose a cross-application audit query parameter', async () => {
    const validation = await read('src/platform/audit/audit.validation.js')
    expect(validation).not.toContain('appId:')
  })

  it('stores application context on the audit model', async () => {
    const schema = await read('prisma/platform/audit.prisma')
    const apps = await read('prisma/platform/apps.prisma')

    expect(schema).toMatch(/appId\s+String\?/)
    expect(schema).toMatch(/app\s+App\?\s+@relation\(fields: \[appId\], references: \[id\], onDelete: SetNull\)/)
    expect(apps).toContain('auditLogs         AuditLog[]')
  })

  it('propagates application context from platform execution context', async () => {
    const service = await read('src/platform/audit/audit.service.js')
    expect(service).toContain("import { getContext } from '../context/context.service.js'")
    expect(service).toContain('const resolvedAppId = appId ?? context?.appId ?? null')
  })

  it('requires application context for audit reads', async () => {
    const routes = await read('src/platform/audit/audit.routes.js')
    expect(routes).toContain('requireApplicationContext()')
  })

  it('creates the app foreign key and app-scoped indexes', async () => {
    const migration = await read('prisma/migrations/20260915180000_add_app_context_to_audit_logs/migration.sql')
    expect(migration).toContain('ADD COLUMN "appId" TEXT')
    expect(migration).toContain('REFERENCES "App"("id")')
    expect(migration).toContain('"AuditLog_appId_createdAt_idx"')
    expect(migration).toContain('"AuditLog_appId_entityType_entityId_createdAt_idx"')
  })
})
