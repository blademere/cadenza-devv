import { beforeEach, describe, expect, it, vi } from 'vitest'

const createAuditLog = vi.fn()
const getContext = vi.fn()

vi.mock('../../../../src/platform/audit/audit.repository.js', () => ({
  createAuditLog,
}))

vi.mock('../../../../src/platform/context/context.service.js', () => ({
  getContext,
}))

const { recordAudit } = await import('../../../../src/platform/audit/audit.service.js')
const { buildAuditWhere, listAuditLogs } = await import('../../../../src/platform/audit/audit.query.service.js')

describe('application-scoped audit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getContext.mockReturnValue(null)
    createAuditLog.mockResolvedValue({ id: 'audit-1' })
  })

  it('persists the explicit appId supplied by the caller', async () => {
    await recordAudit({
      actorId: 7,
      appId: 'app-obo',
      action: 'OBO_PERMIT_APPLICATION_SUBMITTED',
      entityType: 'OboPermitApplication',
      entityId: 'permit-1',
    })

    expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 7,
      appId: 'app-obo',
      entityId: 'permit-1',
    }), undefined)
  })

  it('inherits appId and actorId from the platform context when omitted', async () => {
    getContext.mockReturnValue({ appId: 'app-obo', actorId: 9 })

    await recordAudit({
      action: 'OBO_PERMIT_APPLICATION_FORM_VERSION_CHANGED',
      entityType: 'OboPermitApplication',
      entityId: 'permit-1',
    })

    expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 9,
      appId: 'app-obo',
    }), undefined)
  })

  it('does not allow an explicit null appId to discard an active application context', async () => {
    getContext.mockReturnValue({ appId: 'app-obo', actorId: 9 })

    await recordAudit({
      actorId: 9,
      appId: null,
      action: 'OBO_PERMIT_APPLICATION_SUBMITTED',
      entityType: 'OboPermitApplication',
      entityId: 'permit-1',
    })

    expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      appId: 'app-obo',
    }), undefined)
  })

  it('scopes audit queries to the current application context', () => {
    getContext.mockReturnValue({ appId: 'app-obo' })

    expect(buildAuditWhere({ entityType: 'OboPermitApplication' })).toEqual({
      entityType: 'OboPermitApplication',
      appId: 'app-obo',
    })
  })

  it('allows an explicit application scope to override context for trusted internal queries', () => {
    getContext.mockReturnValue({ appId: 'app-obo' })

    expect(buildAuditWhere({ appId: 'app-admin', entityType: 'CaseRecord' })).toEqual({
      entityType: 'CaseRecord',
      appId: 'app-admin',
    })
  })

  it('passes the scoped where clause to both page queries', async () => {
    getContext.mockReturnValue({ appId: 'app-obo' })
    const findMany = vi.fn().mockResolvedValue([])
    const count = vi.fn().mockResolvedValue(0)
    const db = { auditLog: { findMany, count } }

    await listAuditLogs({ page: 1, limit: 20 }, db)

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { appId: 'app-obo' },
    }))
    expect(count).toHaveBeenCalledWith({ where: { appId: 'app-obo' } })
  })
})
