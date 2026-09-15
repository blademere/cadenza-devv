import { describe, expect, it, vi } from 'vitest'

const repository = vi.hoisted(() => ({
  findRulesForEvent: vi.fn(),
  upsertInAppNotification: vi.fn(),
  upsertDelivery: vi.fn(),
  findUserNotificationProfile: vi.fn(),
  transaction: vi.fn(async (callback) => callback({ id: 'tx' })),
}))

vi.mock(
  '../../../src/platform/notifications/notification.repository.js',
  () => repository
)

import {
  normalizeChannels,
  queueNotifications,
  render,
  stableIdempotencyKey,
} from '../../../src/platform/notifications/notification.service.js'
import {
  clearNotificationTransports,
  registerNotificationTransport,
  unregisterNotificationTransport,
} from '../../../src/platform/notifications/notification.transport.js'
import { processNotificationDelivery } from '../../../src/platform/notifications/notification.delivery.worker.js'

describe('platform notifications capability', () => {
  it('defaults to in-app delivery when no channels are configured', () => {
    expect(normalizeChannels()).toEqual(['IN_APP'])
  })

  it('normalizes and deduplicates notification channels', () => {
    expect(
      normalizeChannels(['email', 'EMAIL', 'sms', 'in_app', 'invalid'])
    ).toEqual(['EMAIL', 'SMS', 'IN_APP'])
  })

  it('accepts only supported notification channels', () => {
    expect(normalizeChannels(['EMAIL', 'SMS', 'IN_APP'])).toEqual([
      'EMAIL',
      'SMS',
      'IN_APP',
    ])
  })

  it('renders nested template context', () => {
    expect(
      render('Permit {{application.reference.number}} is {{status}}.', {
        application: { reference: { number: 'BP-7' } },
        status: 'approved',
      })
    ).toBe('Permit BP-7 is approved.')
  })

  it('creates an idempotent in-app notification without queueing transport work', async () => {
    repository.findRulesForEvent.mockResolvedValue([
      {
        id: 'r1',
        templateId: 't1',
        conditions: null,
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
    repository.upsertInAppNotification.mockResolvedValue({ id: 'n1' })
    repository.upsertDelivery.mockResolvedValue({
      id: 'd1',
      status: 'SENT',
      notificationId: 'n1',
    })

    const enqueue = vi.fn()
    const deliveries = await queueNotifications({
      event: 'workflow.transitioned',
      context: {
        correlationId: 'c1',
        clientUserId: 42,
        referenceNumber: 'BP-1',
      },
      enqueue,
    })

    expect(repository.findRulesForEvent).toHaveBeenCalledWith(
      { event: 'workflow.transitioned', entityType: null },
      undefined
    )
    expect(repository.upsertInAppNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: expect.stringMatching(/:in-app$/),
      }),
      expect.objectContaining({
        userId: 42,
        type: 'workflow.transitioned',
        message: 'Application BP-1 is ready.',
      }),
      { id: 'tx' }
    )
    expect(repository.upsertDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idempotencyKey: expect.any(String) },
        create: expect.objectContaining({
          notificationId: 'n1',
          channel: 'IN_APP',
          status: 'SENT',
        }),
      }),
      { id: 'tx' }
    )
    expect(deliveries).toEqual([
      { id: 'd1', status: 'SENT', notificationId: 'n1' },
    ])
    expect(enqueue).not.toHaveBeenCalled()
  })

  it('uses platform preferences to allow an enabled external channel and destination', async () => {
    repository.findRulesForEvent.mockResolvedValue([
      {
        id: 'r2',
        templateId: 't2',
        conditions: null,
        recipientType: 'FIELD',
        recipientValue: 'clientUserId',
        template: {
          id: 't2',
          name: 'Application Status',
          active: true,
          channel: 'EMAIL',
          subject: 'Permit status',
          body: 'Application {{referenceNumber}} changed.',
        },
      },
    ])
    repository.findUserNotificationProfile.mockResolvedValue({
      id: 42,
      email: 'default@example.com',
      isActive: true,
      notificationPreferences: [
        { channel: 'EMAIL', enabled: true, destination: 'permit@example.com' },
      ],
    })
    repository.upsertDelivery.mockResolvedValue({
      id: 'd2',
      status: 'QUEUED',
      notificationId: null,
    })

    const enqueue = vi.fn()
    const deliveries = await queueNotifications({
      event: 'workflow.transitioned',
      context: { clientUserId: 42, referenceNumber: 'BP-2' },
      enqueue,
    })

    expect(repository.findUserNotificationProfile).toHaveBeenCalledWith(
      42,
      undefined
    )
    expect(repository.upsertDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          channel: 'EMAIL',
          recipient: 'permit@example.com',
          status: 'QUEUED',
        }),
      }),
      { id: 'tx' }
    )
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ data: { deliveryId: 'd2' } })
    )
    expect(deliveries).toEqual([
      { id: 'd2', status: 'QUEUED', notificationId: null },
    ])
  })

  it('does not create an external delivery when the recipient disabled that channel', async () => {
    repository.findRulesForEvent.mockResolvedValue([
      {
        id: 'r3',
        templateId: 't3',
        conditions: null,
        recipientType: 'FIELD',
        recipientValue: 'clientUserId',
        template: {
          id: 't3',
          name: 'Application Status',
          active: true,
          channel: 'SMS',
          subject: null,
          body: 'Application {{referenceNumber}} changed.',
        },
      },
    ])
    repository.findUserNotificationProfile.mockResolvedValue({
      id: 42,
      email: 'default@example.com',
      isActive: true,
      notificationPreferences: [
        { channel: 'SMS', enabled: false, destination: '+639000000000' },
      ],
    })

    const enqueue = vi.fn()
    const deliveries = await queueNotifications({
      event: 'workflow.transitioned',
      context: { clientUserId: 42, referenceNumber: 'BP-3' },
      enqueue,
    })

    expect(repository.upsertDelivery).not.toHaveBeenCalled()
    expect(enqueue).not.toHaveBeenCalled()
    expect(deliveries).toEqual([])
  })

  it('builds a stable idempotency key from event context', () => {
    const first = stableIdempotencyKey({
      correlationId: 'c1',
      event: 'workflow.transitioned',
      ruleId: 'r1',
      recipient: '42',
      templateId: 't1',
    })
    const second = stableIdempotencyKey({
      correlationId: 'c1',
      event: 'workflow.transitioned',
      ruleId: 'r1',
      recipient: '42',
      templateId: 't1',
    })
    expect(first).toBe(second)
  })

  it('registers and clears notification transports', () => {
    const transport = vi.fn()
    registerNotificationTransport('EMAIL', transport)
    unregisterNotificationTransport('EMAIL')
    clearNotificationTransports()
    expect(transport).not.toHaveBeenCalled()
  })

  it('rejects invalid notification transport registration', () => {
    expect(() => registerNotificationTransport('INVALID', vi.fn())).toThrow()
  })

  it('delivers a queued notification through its registered transport', async () => {
    const transport = vi.fn().mockResolvedValue(undefined)
    registerNotificationTransport('EMAIL', transport)

    await processNotificationDelivery({
      delivery: {
        id: 'd3',
        channel: 'EMAIL',
        recipient: 'permit@example.com',
        payload: { subject: 'Hello', body: 'World' },
      },
      claim: vi.fn().mockResolvedValue(true),
      complete: vi.fn().mockResolvedValue(undefined),
    })

    expect(transport).toHaveBeenCalled()
    clearNotificationTransports()
  })

  it('fails delivery when no transport is registered', async () => {
    clearNotificationTransports()
    await expect(
      processNotificationDelivery({
        delivery: {
          id: 'd4',
          channel: 'EMAIL',
          recipient: 'permit@example.com',
          payload: { body: 'World' },
        },
        claim: vi.fn().mockResolvedValue(true),
        complete: vi.fn(),
      })
    ).rejects.toThrow()
  })

  it('does not deliver when the worker cannot claim the delivery', async () => {
    const transport = vi.fn()
    registerNotificationTransport('EMAIL', transport)

    await processNotificationDelivery({
      delivery: {
        id: 'd5',
        channel: 'EMAIL',
        recipient: 'permit@example.com',
        payload: { body: 'World' },
      },
      claim: vi.fn().mockResolvedValue(false),
      complete: vi.fn(),
    })

    expect(transport).not.toHaveBeenCalled()
    clearNotificationTransports()
  })
})
