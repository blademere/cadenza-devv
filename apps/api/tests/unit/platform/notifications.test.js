import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = { notificationRule: { findMany: vi.fn() }, notification: { upsert: vi.fn() }, notificationDelivery: { upsert: vi.fn() }, user: { findUnique: vi.fn() }, $transaction: vi.fn(async (callback) => callback(prisma)) }
const enqueueJob = vi.fn()
const mocks = vi.hoisted(() => ({ claimDelivery: vi.fn(), markDeliverySent: vi.fn(), markDeliveryFailed: vi.fn(), getNotificationTransport: vi.fn() }))
const { normalizeChannels } = await import('../../../src/platform/notifications/notification.send.service.js')
const { queueNotifications, stableIdempotencyKey, render } = await import('../../../src/platform/notifications/notification.service.js')
const { registerNotificationTransport, unregisterNotificationTransport, getNotificationTransport, clearNotificationTransports } = await import('../../../src/platform/notifications/notification.transport.js')
const { processNotificationDelivery } = await import('../../../src/platform/notifications/notification.delivery.worker.js')

describe('platform notifications capability', () => {
  beforeEach(() => { vi.clearAllMocks(); for (const mock of Object.values(mocks)) mock.mockReset(); clearNotificationTransports() })

  it('defaults to in-app delivery', () => {
    expect(normalizeChannels()).toEqual(['IN_APP'])
  })

  it('normalizes and deduplicates channels', () => {
    expect(normalizeChannels(['email', 'EMAIL', 'sms'])).toEqual(['EMAIL', 'SMS'])
  })

  it('accepts supported platform channels', () => {
    expect(normalizeChannels(['push', 'webhook'])).toEqual(['PUSH', 'WEBHOOK'])
  })

  it('rejects unsupported channels', () => {
    expect(() => normalizeChannels(['FAX'])).toThrow("Unsupported notification channel 'FAX'.")
  })

  it('creates an idempotent in-app notification without queueing transport work', async () => {
    prisma.notificationRule.findMany.mockResolvedValue([{ id: 'r1', templateId: 't1', conditions: { field: 'clientUserId', operator: 'is_not_empty' }, recipientType: 'FIELD', recipientValue: 'clientUserId', template: { id: 't1', name: 'Application Ready', active: true, channel: 'IN_APP', subject: null, body: 'Application {{referenceNumber}} is ready.' } }]); prisma.notification.upsert.mockResolvedValue({ id: 'n1' }); prisma.notificationDelivery.upsert.mockResolvedValue({ id: 'd1', status: 'SENT', notificationId: 'n1' })
    const deliveries = await queueNotifications({ event: 'workflow.transitioned', context: { correlationId: 'c1', clientUserId: 42, referenceNumber: 'BP-1' }, db: prisma, enqueue: enqueueJob })
    expect(prisma.notificationRule.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { event: 'workflow.transitioned', active: true } })); expect(prisma.notification.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { idempotencyKey: expect.stringContaining(':in-app') }, create: expect.objectContaining({ userId: 42, type: 'workflow.transitioned', message: 'Application BP-1 is ready.', idempotencyKey: expect.stringContaining(':in-app') }) })); expect(prisma.notificationDelivery.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ notificationId: 'n1', channel: 'IN_APP', status: 'SENT' }) })); expect(deliveries).toEqual([{ id: 'd1', status: 'SENT', notificationId: 'n1' }]); expect(enqueueJob).not.toHaveBeenCalled()
  })

  it('uses platform preferences to allow an enabled external channel and destination', async () => {
    prisma.notificationRule.findMany.mockResolvedValue([{ id: 'r2', templateId: 't2', conditions: null, recipientType: 'FIELD', recipientValue: 'clientUserId', template: { id: 't2', name: 'Application Status', active: true, channel: 'EMAIL', subject: 'Permit status', body: 'Application {{referenceNumber}} changed.' } }]); prisma.user.findUnique.mockResolvedValue({ id: 42, email: 'default@example.com', isActive: true, notificationPreferences: [{ channel: 'EMAIL', enabled: true, destination: 'permit@example.com' }] }); prisma.notificationDelivery.upsert.mockResolvedValue({ id: 'd2', status: 'QUEUED', notificationId: null })
    const deliveries = await queueNotifications({ event: 'workflow.transitioned', context: { clientUserId: 42, referenceNumber: 'BP-2' }, db: prisma, enqueue: enqueueJob })
    expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 42 } })); expect(prisma.notificationDelivery.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ channel: 'EMAIL', recipient: 'permit@example.com', status: 'QUEUED' }) })); expect(enqueueJob).toHaveBeenCalledWith(expect.objectContaining({ data: { deliveryId: 'd2' } })); expect(deliveries).toEqual([{ id: 'd2', status: 'QUEUED', notificationId: null }])
  })

  it('does not create an external delivery when the recipient disabled that channel', async () => { prisma.notificationRule.findMany.mockResolvedValue([{ id: 'r3', templateId: 't3', conditions: null, recipientType: 'FIELD', recipientValue: 'clientUserId', template: { id: 't3', name: 'Application Status', active: true, channel: 'SMS', subject: null, body: 'Application {{referenceNumber}} changed.' } }]); prisma.user.findUnique.mockResolvedValue({ id: 42, email: 'default@example.com', isActive: true, notificationPreferences: [{ channel: 'SMS', enabled: false, destination: '+639000000000' }] }); const deliveries = await queueNotifications({ event: 'workflow.transitioned', context: { clientUserId: 42, referenceNumber: 'BP-3' }, db: prisma, enqueue: enqueueJob }); expect(prisma.notificationDelivery.upsert).not.toHaveBeenCalled(); expect(enqueueJob).not.toHaveBeenCalled(); expect(deliveries).toEqual([]) })

  it('returns stable notification delivery keys and changes with delivery identity', () => { const base = { correlationId: 'corr-1', event: 'application.submitted', ruleId: 'rule-1', recipient: 'user@example.com', templateId: 'template-1' }; expect(stableIdempotencyKey(base)).toBe(stableIdempotencyKey({ ...base })); expect(stableIdempotencyKey(base)).not.toBe(stableIdempotencyKey({ ...base, correlationId: 'corr-2' })); expect(stableIdempotencyKey(base)).not.toBe(stableIdempotencyKey({ ...base, recipient: 'other@example.com' })) })
  it('registers transports by normalized channel', () => { const transport = { send: async () => undefined }; registerNotificationTransport('email', transport); expect(getNotificationTransport('EMAIL')).toBe(transport) })
  it('rejects transports without send', () => expect(() => registerNotificationTransport('EMAIL', {})).toThrow('must implement send'))
  it('supports unregistering and clearing transports', () => { const transport = { send: async () => undefined }; registerNotificationTransport('EMAIL', transport); unregisterNotificationTransport('EMAIL'); expect(getNotificationTransport('EMAIL')).toBeNull(); registerNotificationTransport('SMS', transport); clearNotificationTransports(); expect(getNotificationTransport('SMS')).toBeNull() })
  it('delivers through a registered transport and marks delivery sent', async () => { const delivery = { id: 'd1', channel: 'EMAIL', recipient: 'user@example.com', payload: { subject: 'Hello', body: 'Welcome' } }; const transport = { send: vi.fn().mockResolvedValue(undefined) }; mocks.claimDelivery.mockResolvedValue({ claimed: true, delivery }); mocks.getNotificationTransport.mockReturnValue(transport); mocks.markDeliverySent.mockResolvedValue({ ...delivery, status: 'SENT' }); const result = await processNotificationDelivery({ data: { deliveryId: 'd1' } }, { claimDelivery: mocks.claimDelivery, markDeliverySent: mocks.markDeliverySent, markDeliveryFailed: mocks.markDeliveryFailed, getNotificationTransport: mocks.getNotificationTransport }); await expect(result).toMatchObject({ status: 'SENT' }); expect(transport.send).toHaveBeenCalledWith({ delivery, recipient: delivery.recipient, payload: delivery.payload }); expect(mocks.markDeliverySent).toHaveBeenCalledWith('d1') })
  it('marks an unregistered transport as failed and rethrows for retry', async () => { const delivery = { id: 'd1', channel: 'SMS', recipient: '123', payload: {} }; mocks.claimDelivery.mockResolvedValue({ claimed: true, delivery }); mocks.getNotificationTransport.mockReturnValue(null); mocks.markDeliveryFailed.mockResolvedValue({ ...delivery, status: 'FAILED' }); await expect(processNotificationDelivery({ data: { deliveryId: 'd1' } }, { claimDelivery: mocks.claimDelivery, markDeliverySent: mocks.markDeliverySent, markDeliveryFailed: mocks.markDeliveryFailed, getNotificationTransport: mocks.getNotificationTransport })).rejects.toThrow('No transport registered for notification channel: SMS'); expect(mocks.markDeliveryFailed).toHaveBeenCalledWith('d1', expect.any(Error)) })
  it('does not process a delivery it cannot claim', async () => { const delivery = { id: 'd1', status: 'SENT' }; mocks.claimDelivery.mockResolvedValue({ claimed: false, delivery }); await expect(processNotificationDelivery({ data: { deliveryId: 'd1' } }, { claimDelivery: mocks.claimDelivery, markDeliverySent: mocks.markDeliverySent, markDeliveryFailed: mocks.markDeliveryFailed, getNotificationTransport: mocks.getNotificationTransport })).resolves.toBe(delivery); expect(mocks.getNotificationTransport).not.toHaveBeenCalled() })
  it('renders nested context variables', () => expect(render('Hello {{ user.name }}, application {{ application.number }}', { user: { name: 'Juan' }, application: { number: 'BP-1001' } })).toBe('Hello Juan, application BP-1001'))
})
