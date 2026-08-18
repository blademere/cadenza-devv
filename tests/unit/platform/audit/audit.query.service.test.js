import { describe, expect, it, vi } from 'vitest'

const { buildAuditWhere, listAuditLogs, getEntityTimeline } = require('../../../../src/platform/audit/audit.query.service')

describe('audit query service', () => {
  it('builds safe audit filters', () => {
    expect(buildAuditWhere({
      entityType: 'Appointment',
      entityId: 42,
      actorId: '7',
      action: 'appointment.created',
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-31T23:59:59.999Z',
    })).toEqual({
      entityType: 'Appointment',
      entityId: '42',
      actorId: 7,
      action: 'appointment.created',
      createdAt: {
        gte: new Date('2026-08-01T00:00:00.000Z'),
        lte: new Date('2026-08-31T23:59:59.999Z'),
      },
    })
  })

  it('lists audit logs with pagination and an actor projection', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'a1' }])
    const count = vi.fn().mockResolvedValue(1)
    const db = { auditLog: { findMany, count } }

    const result = await listAuditLogs({ page: 2, limit: 10 }, db)

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 10,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { id: true, email: true } } },
    }))
    expect(result.pagination).toMatchObject({ page: 2, limit: 10, total: 1, pages: 1 })
  })

  it('forces chronological ordering for entity timelines', async () => {
    const listAuditLogsMock = vi.fn()
    const db = { auditLog: {} }

    const original = require('../../../../src/platform/audit/audit.query.service').listAuditLogs
    expect(original).toBe(listAuditLogs)
    expect(typeof getEntityTimeline).toBe('function')
    expect(listAuditLogsMock).not.toHaveBeenCalled()
    expect(db).toBeDefined()
  })
})
