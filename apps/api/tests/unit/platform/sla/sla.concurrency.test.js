import { describe, expect, it, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  prisma: {
    slaPolicy: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    slaInstance: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  },
  recordAudit: vi.fn(),
}))

vi.mock('../../../../src/infrastructure/database/prisma.js', () => ({
  getPrismaClient: () => mocks.prisma,
}))
vi.mock('../../../../src/platform/audit/audit.service.js', () => ({
  recordAudit: mocks.recordAudit,
}))

const { createSlaPolicy, findApplicablePolicy, startSla, completeSla, markDueSlas, markEscalations } = await import('../../../../src/platform/sla/sla.service.js')

describe('SLA hardening', () => {
  beforeEach(() => {
    for (const group of Object.values(mocks.prisma)) {
      for (const mock of Object.values(group)) mock.mockReset()
    }
    mocks.recordAudit.mockReset()
  })

  it('rejects warning or escalation at or after the SLA deadline', async () => {
    await expect(createSlaPolicy({ key: 'sla-warning', name: 'SLA', entityType: 'CASE', durationSeconds: 300, warningSeconds: 300, conditions: { field: 'tier', operator: 'equals', value: 'gold' } })).rejects.toThrow('before the SLA deadline')
    for (const escalationSeconds of [300, 301]) {
      await expect(createSlaPolicy({ key: 'sla-escalation', name: 'SLA', entityType: 'CASE', durationSeconds: 300, escalationSeconds, conditions: { field: 'tier', operator: 'equals', value: 'gold' } })).rejects.toThrow('before the SLA deadline')
    }
    expect(mocks.prisma.slaPolicy.create).not.toHaveBeenCalled()
  })

  it('accepts valid warning and escalation before the deadline', async () => {
    mocks.prisma.slaPolicy.create.mockResolvedValue({ id: 'p1', key: 'sla' })
    const result = await createSlaPolicy({ key: 'sla', name: 'SLA', entityType: 'CASE', durationSeconds: 300, warningSeconds: 120, escalationSeconds: 299, conditions: { field: 'tier', operator: 'equals', value: 'gold' } })
    expect(result.id).toBe('p1')
    expect(mocks.prisma.slaPolicy.create).toHaveBeenCalledOnce()
  })

  it('selects the first matching active policy in priority order', async () => {
    mocks.prisma.slaPolicy.findMany.mockResolvedValue([
      { id: 'p-high', priority: 10, conditions: { field: 'tier', operator: 'equals', value: 'gold' } },
      { id: 'p-low', priority: 20, conditions: { field: 'tier', operator: 'equals', value: 'gold' } },
    ])
    const result = await findApplicablePolicy({ entityType: 'CASE', context: { tier: 'gold' } })
    expect(result.id).toBe('p-high')
    expect(mocks.prisma.slaPolicy.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] }))
  })

  it('transitions an eligible SLA to ESCALATED without making it terminal', async () => {
    const startedAt = new Date('2026-08-17T07:00:00.000Z')
    mocks.prisma.slaInstance.findMany.mockResolvedValue([{ id: 's1', startedAt, policy: { escalationSeconds: 60 } }])
    mocks.prisma.slaInstance.updateMany.mockResolvedValue({ count: 1 })
    await markEscalations({ now: new Date('2026-08-17T07:02:00.000Z') })
    expect(mocks.prisma.slaInstance.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'ESCALATED', escalatedAt: expect.any(Date) } }))
  })

  it('allows completion from RUNNING, ESCALATED, and BREACHED', async () => {
    for (const status of ['RUNNING', 'ESCALATED', 'BREACHED']) {
      mocks.prisma.slaInstance.findUnique.mockResolvedValueOnce({ id: 's1', status })
      mocks.prisma.slaInstance.update.mockResolvedValueOnce({ id: 's1', status: 'COMPLETED' })
      const result = await completeSla({ instanceId: 's1' })
      expect(result.status).toBe('COMPLETED')
    }
  })

  it('rejects completion from terminal or invalid states', async () => {
    for (const status of ['COMPLETED', 'CANCELLED']) {
      mocks.prisma.slaInstance.findUnique.mockResolvedValueOnce({ id: 's1', status })
      await expect(completeSla({ instanceId: 's1' })).rejects.toThrow()
      expect(mocks.prisma.slaInstance.update).not.toHaveBeenCalled()
    }
  })

  it('breaches due RUNNING and ESCALATED instances atomically', async () => {
    const now = new Date('2026-08-17T08:00:00.000Z')
    mocks.prisma.slaInstance.findMany.mockResolvedValue([{ id: 's1' }, { id: 's2' }])
    mocks.prisma.slaInstance.updateMany.mockResolvedValue({ count: 1 })
    const result = await markDueSlas({ now })
    expect(result.count).toBe(1)
    expect(mocks.prisma.slaInstance.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: { in: ['s1', 's2'] }, status: { in: ['RUNNING', 'ESCALATED'] } }), data: { status: 'BREACHED' } }))
  })

  it('claims escalation with an atomic null-escalatedAt guard', async () => {
    const startedAt = new Date('2026-08-17T07:00:00.000Z')
    mocks.prisma.slaInstance.findMany.mockResolvedValue([{ id: 's1', startedAt, policy: { escalationSeconds: 60 } }])
    mocks.prisma.slaInstance.updateMany.mockResolvedValue({ count: 1 })
    const result = await markEscalations({ now: new Date('2026-08-17T07:02:00.000Z') })
    expect(result.count).toBe(1)
    expect(mocks.prisma.slaInstance.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'RUNNING', escalatedAt: null }), data: expect.objectContaining({ status: 'ESCALATED', escalatedAt: expect.any(Date) }) }))
  })

  it('reports zero when another worker has already claimed the escalation', async () => {
    const startedAt = new Date('2026-08-17T07:00:00.000Z')
    mocks.prisma.slaInstance.findMany.mockResolvedValue([{ id: 's1', startedAt, policy: { escalationSeconds: 60 } }])
    mocks.prisma.slaInstance.updateMany.mockResolvedValue({ count: 0 })
    const result = await markEscalations({ now: new Date('2026-08-17T07:02:00.000Z') })
    expect(result.count).toBe(0)
  })

  it('starts an SLA with due and warning timestamps derived from the policy', async () => {
    const startedAt = new Date('2026-08-17T07:00:00.000Z')
    mocks.prisma.slaPolicy.findUnique.mockResolvedValue({ id: 'p1', durationSeconds: 300, warningSeconds: 120 })
    mocks.prisma.slaInstance.create.mockResolvedValue({ id: 's1' })
    await startSla({ policyKey: 'sla', subjectType: 'CASE', subjectId: 42, startedAt })
    expect(mocks.prisma.slaInstance.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ policyId: 'p1', subjectId: '42', startedAt, warningAt: new Date('2026-08-17T07:02:00.000Z'), dueAt: new Date('2026-08-17T07:05:00.000Z') }) }))
  })
})
