import { describe, expect, it, vi, beforeEach } from 'vitest'

const prisma = {
  notificationRule: { findMany: vi.fn() },
  notification: { upsert: vi.fn() },
  notificationDelivery: { upsert: vi.fn() },
  $transaction: vi.fn(async (callback) => callback(prisma)),
}

const enqueueJob = vi.fn()

vi.mock('../../../../src/platform/jobs/job.service', () => ({
  enqueueJob,
}))

const { queueNotifications } = await import(
  '../../../../src/platform/notifications/notification.service'
)

describe('notification delivery hardening', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates an idempotent in-app notification for event-driven recipients without queueing transport work', async () => {
    prisma.notificationRule.findMany.mockResolvedValue([
      {
        id: 'r1',
        templateId: 't1',
        conditions: {
          field: 'clientUserId',
          operator: 'is_not_empty',
        },
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
    prisma.notificationDelivery.upsert.mockResolvedValue({
      id: 'd1',
      status: 'SENT',
      notificationId: 'n1',
    })

    const deliveries = await queueNotifications({
      event: 'workflow.transitioned',
      context: {
        correlationId: 'c1',
        clientUserId: 42,
        referenceNumber: 'BP-1',
      },
      db: prisma,
    })

    expect(prisma.notificationRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { event: 'workflow.transitioned', active: true },
      })
    )
    expect(prisma.notification.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idempotencyKey: expect.stringContaining(':in-app') },
        create: expect.objectContaining({
          userId: 42,
          type: 'workflow.transitioned',
          message: 'Application BP-1 is ready.',
          idempotencyKey: expect.stringContaining(':in-app'),
        }),
      })
    )
    expect(prisma.notificationDelivery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          notificationId: 'n1',
          channel: 'IN_APP',
          status: 'SENT',
        }),
      })
    )
    expect(deliveries).toEqual([
      { id: 'd1', status: 'SENT', notificationId: 'n1' },
    ])
    expect(enqueueJob).not.toHaveBeenCalled()
  })
})
