import { describe, expect, it, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  notification: { upsert: vi.fn() },
  notificationDelivery: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn(), upsert: vi.fn() },
  notificationRule: { findMany: vi.fn() },
  notificationTemplate: { findUnique: vi.fn(), create: vi.fn() },
  user: { findMany: vi.fn() },
  $transaction: vi.fn(async (callback) => callback(mocks)),
}))
const prismaModule = require('../../../../src/infrastructure/database/prisma')
prismaModule.getPrismaClient = () => mocks
vi.mock('../../../../src/platform/rules/rule.service', () => ({
  evaluateCondition: vi.fn(() => true),
  getPathValue: vi.fn((obj, key) => key?.split('.').reduce((v, k) => v?.[k], obj)),
}))
vi.mock('../../../../src/platform/audit/audit.service', () => ({ recordAudit: vi.fn() }))

const jobService = require('../../../../src/platform/jobs/job.service')
const enqueueJob = vi.spyOn(jobService, 'enqueueJob')

const prisma = mocks
const {
  claimDelivery,
  markDeliveryFailed,
  markDeliverySent,
  computeRetryAt,
  stableIdempotencyKey,
  queueNotifications,
  MAX_ATTEMPTS,
} = await import('../../../../src/platform/notifications/notification.service.js')

describe('notification delivery hardening', () => {
  beforeEach(() => {
    for (const [name, group] of Object.entries(mocks)) {
      if (name === '$transaction') continue
      if (typeof group?.mockReset === 'function') group.mockReset()
      else for (const mock of Object.values(group)) mock.mockReset()
    }
    enqueueJob.mockReset()
  })

  it('claims a queued delivery with optimistic concurrency protection', async () => {
    const updatedAt = new Date('2026-08-17T07:00:00.000Z')
    const delivery = { id: 'd1', status: 'QUEUED', updatedAt }
    prisma.notificationDelivery.findUnique.mockResolvedValueOnce(delivery).mockResolvedValueOnce({ ...delivery, status: 'PROCESSING' })
    prisma.notificationDelivery.updateMany.mockResolvedValue({ count: 1 })
    const result = await claimDelivery({ id: 'd1', now: new Date('2026-08-17T07:01:00.000Z') })
    expect(result.claimed).toBe(true)
    expect(prisma.notificationDelivery.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'd1', status: 'QUEUED', updatedAt }), data: expect.objectContaining({ status: 'PROCESSING' }) }))
  })

  it('loses the race when the compare-and-swap update affects no rows', async () => {
    const delivery = { id: 'd1', status: 'QUEUED', updatedAt: new Date() }
    prisma.notificationDelivery.findUnique.mockResolvedValueOnce(delivery).mockResolvedValueOnce({ ...delivery, status: 'PROCESSING' })
    prisma.notificationDelivery.updateMany.mockResolvedValue({ count: 0 })
    const result = await claimDelivery({ id: 'd1' })
    expect(result.claimed).toBe(false)
    expect(prisma.notificationDelivery.updateMany).toHaveBeenCalledTimes(1)
  })

  it('does not claim a delivery before its retry time', async () => {
    const nextAttemptAt = new Date('2026-08-17T08:00:00.000Z')
    prisma.notificationDelivery.findUnique.mockResolvedValue({ id: 'd1', status: 'FAILED', nextAttemptAt })
    const result = await claimDelivery({ id: 'd1', now: new Date('2026-08-17T07:59:59.000Z') })
    expect(result.claimed).toBe(false)
    expect(prisma.notificationDelivery.updateMany).not.toHaveBeenCalled()
  })

  it('marks the fifth failure dead and clears retry scheduling', async () => {
    prisma.notificationDelivery.findUnique.mockResolvedValue({ id: 'd1', status: 'PROCESSING', attempts: MAX_ATTEMPTS - 1 })
    prisma.notificationDelivery.update.mockResolvedValue({ id: 'd1', status: 'DEAD' })
    await markDeliveryFailed('d1', new Error('provider failed'))
    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'd1' }, data: expect.objectContaining({ status: 'DEAD', attempts: MAX_ATTEMPTS, nextAttemptAt: null }) }))
  })

  it('uses bounded exponential retry delays', () => {
    const now = Date.now()
    const early = computeRetryAt(1).getTime() - now
    const later = computeRetryAt(4).getTime() - now
    const max = computeRetryAt(20).getTime() - now
    expect(early).toBeGreaterThanOrEqual(29_000)
    expect(later).toBeGreaterThan(early)
    expect(max).toBeLessThanOrEqual(3_600_000 + 100)
  })

  it('produces a stable idempotency key for the same logical delivery', () => {
    const input = { correlationId: 'c1', event: 'SUBMITTED', ruleId: 'r1', recipient: 'user@example.com', templateId: 't1' }
    expect(stableIdempotencyKey(input)).toBe(stableIdempotencyKey({ ...input }))
    expect(stableIdempotencyKey(input)).not.toBe(stableIdempotencyKey({ ...input, recipient: 'other@example.com' }))
  })

  it('only marks a processing delivery as sent', async () => {
    prisma.notificationDelivery.update.mockResolvedValue({ id: 'd1', status: 'SENT' })
    await markDeliverySent('d1')
    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'd1', status: 'PROCESSING' }, data: expect.objectContaining({ status: 'SENT' }) }))
  })

  it('enqueues a BullMQ job for each queued delivery', async () => {
    prisma.notificationRule.findMany.mockResolvedValue([
      {
        id: 'r1',
        templateId: 't1',
        conditions: null,
        recipientType: 'STATIC',
        recipientValue: 'user@example.com',
        template: {
          active: true,
          channel: 'EMAIL',
          subject: 'Hello {{name}}',
          body: 'Welcome {{name}}',
        },
      },
    ])
    prisma.notificationDelivery.upsert.mockResolvedValue({
      id: 'd1',
      status: 'QUEUED',
    })
    enqueueJob.mockResolvedValue({ id: 'job-1' })

    const deliveries = await queueNotifications({
      event: 'USER_CREATED',
      context: { name: 'Dree' },
    })

    expect(deliveries).toHaveLength(1)
    expect(enqueueJob).toHaveBeenCalledWith({
      queue: 'notifications',
      name: 'notification.delivery',
      data: { deliveryId: 'd1' },
      jobId: 'notification-delivery-d1',
    })
  })

  it('creates an idempotent in-app notification for event-driven recipients', async () => {
    prisma.notificationRule.findMany.mockResolvedValue([
      {
        id: 'r1',
        templateId: 't1',
        conditions: {},
        recipientType: 'FIELD',
        recipientValue: 'clientUserId',
        template: {
          id: 't1',
          name: 'Application Ready',
          active: true,
          channel: 'IN_APP',
          subject: null,
          body: 'Application {{referenceNumber}} is ready.',
        },
      },
    ])
    prisma.notification.upsert.mockResolvedValue({ id: 'n1' })
    prisma.notificationDelivery.upsert.mockResolvedValue({ id: 'd1', status: 'QUEUED', notificationId: 'n1' })
    enqueueJob.mockResolvedValue({ id: 'job-1' })

    const deliveries = await queueNotifications({
      event: 'workflow.transitioned',
      context: { correlationId: 'c1', clientUserId: 42, referenceNumber: 'BP-1' },
    })

    expect(prisma.notification.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { idempotencyKey: expect.stringContaining(':in-app') },
      create: expect.objectContaining({ userId: 42, type: 'workflow.transitioned', message: 'Application BP-1 is ready.', idempotencyKey: expect.stringContaining(':in-app') }),
    }))
    expect(prisma.notificationDelivery.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ notificationId: 'n1', channel: 'IN_APP' }),
    }))
    expect(deliveries).toEqual([{ id: 'd1', status: 'QUEUED', notificationId: 'n1' }])
    expect(enqueueJob).toHaveBeenCalledWith(expect.objectContaining({ data: { deliveryId: 'd1' } }))
  })
})
