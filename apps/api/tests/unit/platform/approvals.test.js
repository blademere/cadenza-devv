import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const mocks = vi.hoisted(() => ({
  $transaction: vi.fn(),
  approvalPolicy: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  approvalInstance: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  approvalRequest: { findUnique: vi.fn(), updateMany: vi.fn(), findMany: vi.fn(), createMany: vi.fn() },
  user: { findFirst: vi.fn(), findMany: vi.fn() },
}))

vi.mock('../../../src/infrastructure/database/prisma.js', () => ({ getPrismaClient: () => mocks }))
vi.mock('../../../src/platform/audit/audit.service.js', () => ({ recordAudit: vi.fn() }))

const prisma = mocks
const auditModule = await import('../../../src/platform/audit/audit.service.js')
const { actOnApproval, startApproval, createApprovalPolicy } = await import('../../../src/platform/approvals/approval.service.js')

const TEST_FILE_DIR = path.dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = path.resolve(TEST_FILE_DIR, '../../../prisma/migrations')

async function readMigrationSql() {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true })
  const files = entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(MIGRATIONS_DIR, entry.name, 'migration.sql'))
  const migrations = await Promise.all(files.map(async (file) => {
    try { return await readFile(file, 'utf8') } catch { return '' }
  }))
  return migrations.join('\n')
}

describe('approval service and hardening', () => {
  beforeEach(() => {
    for (const value of Object.values(mocks)) {
      if (typeof value === 'function') value.mockReset()
      else for (const mock of Object.values(value)) mock.mockReset()
    }
    auditModule.recordAudit.mockReset()
  })

  it('defaults requiredCount to one when it is omitted', async () => {
    prisma.approvalPolicy.create.mockResolvedValue({ id: 'p1', key: 'policy' })
    await createApprovalPolicy({ key: 'policy', name: 'Policy', entityType: 'Request', conditions: { field: 'tier', operator: 'equals', value: 'gold' }, steps: [{ name: 'Review', approverType: 'USER', approverValue: '7' }] })
    expect(prisma.approvalPolicy.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ steps: { create: [{ stepOrder: 1, name: 'Review', approverType: 'USER', approverValue: '7', requiredCount: 1 }] } }) }))
  })

  it('returns the existing pending instance instead of creating another one', async () => {
    const existing = { id: 'a1', policyId: 'p1', subjectType: 'Request', subjectId: '42', status: 'PENDING', policy: { steps: [] }, requests: [] }
    prisma.approvalPolicy.findUnique.mockResolvedValue({ id: 'p1', key: 'policy', steps: [{ id: 's1', stepOrder: 1, name: 'Review', approverType: 'USER', approverValue: '7', requiredCount: 1 }] })
    prisma.$transaction.mockImplementation(async (callback) => callback({ approvalInstance: { findFirst: vi.fn().mockResolvedValue(existing), create: vi.fn(), findUnique: vi.fn() }, approvalRequest: { createMany: vi.fn() }, user: { findFirst: vi.fn().mockResolvedValue({ id: 7 }) } }))
    const result = await startApproval({ policyKey: 'policy', subjectType: 'Request', subjectId: 42 })
    expect(result.id).toBe('a1')
    expect(result.status).toBe('PENDING')
  })

  it('recovers from a unique-constraint race by reloading the winner', async () => {
    const winner = { id: 'a2', status: 'PENDING', policy: { steps: [] }, requests: [] }
    prisma.approvalPolicy.findUnique.mockResolvedValue({ id: 'p1', key: 'policy', steps: [{ id: 's1', stepOrder: 1, name: 'Review', approverType: 'USER', approverValue: '7', requiredCount: 1 }] })
    prisma.$transaction.mockRejectedValue({ code: 'P2002' })
    prisma.approvalInstance.findFirst.mockResolvedValue(winner)
    const result = await startApproval({ policyKey: 'policy', subjectType: 'Request', subjectId: 42 })
    expect(result).toBe(winner)
    expect(prisma.approvalInstance.findFirst).toHaveBeenCalled()
  })

  it('cancels remaining requests when an approver rejects', async () => {
    const request = { id: 'r1', status: 'PENDING', assigneeUserId: 7, stepId: 's1', instanceId: 'a1', instance: { id: 'a1', status: 'PENDING', currentStepOrder: 1, policy: { steps: [{ id: 's1', stepOrder: 1 }] } }, step: { id: 's1', stepOrder: 1, requiredCount: 2 } }
    prisma.approvalRequest.findUnique.mockResolvedValue(request)
    const tx = { approvalRequest: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), findMany: vi.fn() }, approvalInstance: { update: vi.fn().mockResolvedValue({ id: 'a1', status: 'REJECTED', requests: [] }) } }
    prisma.$transaction.mockImplementation(async (callback) => callback(tx))
    const result = await actOnApproval({ requestId: 'r1', actorId: 7, decision: 'REJECT' })
    expect(result.status).toBe('REJECTED')
    expect(tx.approvalRequest.updateMany).toHaveBeenCalledTimes(2)
    expect(tx.approvalRequest.updateMany.mock.calls[1][0]).toEqual(expect.objectContaining({ where: expect.objectContaining({ instanceId: 'a1', status: 'PENDING' }), data: expect.objectContaining({ status: 'CANCELLED' }) }))
  })

  it('defines an active-instance uniqueness boundary', async () => {
    const migration = await readMigrationSql()
    expect(migration).toContain('CREATE UNIQUE INDEX "ApprovalInstance_active_subject_unique"')
    expect(migration).toContain('WHERE "status" = \'PENDING\'')
  })

  it('keeps completed approvals outside the active uniqueness boundary', async () => {
    const migration = await readMigrationSql()
    expect(migration).not.toContain('CREATE UNIQUE INDEX "ApprovalInstance_subject_unique"')
  })
})
