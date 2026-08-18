import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  claimDelivery: vi.fn(),
  markDeliverySent: vi.fn(),
  markDeliveryFailed: vi.fn(),
  getNotificationTransport: vi.fn(),
}))

const { processNotificationDelivery } = await import('../../../../src/platform/notifications/notification.delivery.worker.js')

describe('notification delivery worker', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset())
  })

  const dependencies = () => ({
    claimDelivery: mocks.claimDelivery,
    markDeliverySent: mocks.markDeliverySent,
    markDeliveryFailed: mocks.markDeliveryFailed,
    getNotificationTransport: mocks.getNotificationTransport,
  })

  it('delivers through the registered transport and marks the delivery sent', async () => {
    const delivery = {
      id: 'd1',
      channel: 'EMAIL',
      recipient: 'user@example.com',
      payload: { subject: 'Hello', body: 'Welcome' },
    }
    const transport = { send: vi.fn().mockResolvedValue(undefined) }
    mocks.claimDelivery.mockResolvedValue({ claimed: true, delivery })
    mocks.getNotificationTransport.mockReturnValue(transport)
    mocks.markDeliverySent.mockResolvedValue({ ...delivery, status: 'SENT' })

    await expect(
      processNotificationDelivery({ data: { deliveryId: 'd1' } }, dependencies())
    ).resolves.toMatchObject({ status: 'SENT' })
    expect(transport.send).toHaveBeenCalledWith({
      delivery,
      recipient: delivery.recipient,
      payload: delivery.payload,
    })
    expect(mocks.markDeliverySent).toHaveBeenCalledWith('d1')
  })

  it('marks an unregistered transport as failed and rethrows for BullMQ retry', async () => {
    const delivery = { id: 'd1', channel: 'SMS', recipient: '123', payload: {} }
    const error = new Error('No transport registered for notification channel: SMS')
    mocks.claimDelivery.mockResolvedValue({ claimed: true, delivery })
    mocks.getNotificationTransport.mockReturnValue(null)
    mocks.markDeliveryFailed.mockResolvedValue({ ...delivery, status: 'FAILED' })

    await expect(
      processNotificationDelivery({ data: { deliveryId: 'd1' } }, dependencies())
    ).rejects.toThrow(error.message)
    expect(mocks.markDeliveryFailed).toHaveBeenCalledWith('d1', expect.any(Error))
  })

  it('does not process a delivery it cannot claim', async () => {
    const delivery = { id: 'd1', status: 'SENT' }
    mocks.claimDelivery.mockResolvedValue({ claimed: false, delivery })

    await expect(
      processNotificationDelivery({ data: { deliveryId: 'd1' } }, dependencies())
    ).resolves.toBe(delivery)
    expect(mocks.getNotificationTransport).not.toHaveBeenCalled()
  })
})
