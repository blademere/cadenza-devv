import { describe, expect, it, vi } from 'vitest'

const { buildAuditWhere, listAuditLogs, getEntityTimeline } = await import('../../../src/platform/audit/audit.query.service.js')

describe('audit query capability', () => {
  it('builds safe audit filters', () => {
    expect(buildAuditWhere({ entityType: 'Appointment', entityId: 42, actorId: '7', action: 'appointment.created', from: '2026-08-01T00:00:00.000Z', to: '2026-08-31T23:59:59.999Z' })).toEqual({ entityType: 'Appointment', entityId: '42', actorId: 7, action: 'appointment.created', createdAt: { gte: new Date('2026-08-01T00:00:00.000Z'), lte: new Date('2026-08-31T23:59:59.999Z') } })
  })

  it('lists audit logs with pagination and an actor projection', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'a1' }])
    const count = vi.fn().mockResolvedValue(1)
    const db = { auditLog: { findMany, count } }
    const result = await listAuditLogs({ page: 2, limit: 10 }, db)
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10, orderBy: { createdAt: 'desc' }, include: { actor: { select: { id: true, email: true } } } }))
    expect(result.pagination).toMatchObject({ page: 2, limit: 10, total: 1, pages: 1 })
  })

  it('returns an entity timeline in chronological order', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const count = vi.fn().mockResolvedValue(0)
    const db = { auditLog: { findMany, count } }
    await getEntityTimeline({ entityType: 'Appointment', entityId: '42' }, db)
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { entityType: 'Appointment', entityId: '42' }, orderBy: { createdAt: 'asc' } }))
  })
})
