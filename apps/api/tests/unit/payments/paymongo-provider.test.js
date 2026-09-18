import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createPayMongoProvider } from '../../../src/infrastructure/payments/paymongo/paymongo.provider.js'

const SECRET = 'webhook-secret'

const provider = createPayMongoProvider({
  secretKey: 'sk_test_example',
  webhookSecret: SECRET,
  mode: 'test',
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
})

const signedPayload = (payload, timestamp = 1900000000) => {
  const rawBody = Buffer.from(JSON.stringify(payload))
  const signature = crypto.createHmac('sha256', SECRET).update(`${timestamp}.${rawBody.toString('utf8')}`).digest('hex')
  return { rawBody, signature: `t=${timestamp},te=${signature},li=` }
}

describe('PayMongo provider', () => {
  it('normalizes a successful hosted checkout webhook', () => {
    const payload = {
      data: {
        id: 'evt_1',
        type: 'event',
        attributes: {
          type: 'checkout_session.payment.paid',
          data: {
            id: 'cs_1',
            type: 'checkout_session',
            attributes: {
              reference_number: 'obligation-1',
              metadata: { appId: 'app-1' },
              payments: [{
                id: 'pay_1',
                attributes: { status: 'paid', amount: 30000, currency: 'PHP', source: { type: 'gcash' } },
              }],
            },
          },
        },
      },
    }
    const signed = signedPayload(payload)
    const event = provider.parseWebhook({ ...signed, now: 1900000000000 })
    expect(event).toEqual(expect.objectContaining({
      eventId: 'evt_1',
      referenceId: 'obligation-1',
      providerReference: 'pay_1',
      amount: '300.00',
      currency: 'PHP',
      method: 'E_WALLET',
    }))
  })

  it('rejects an invalid webhook signature', () => {
    const signed = signedPayload({ data: { id: 'evt_1', attributes: { type: 'checkout_session.payment.paid', data: {} } } })
    expect(() => provider.parseWebhook({ rawBody: signed.rawBody, signature: 't=1900000000,te=invalid,li=', now: 1900000000000 }))
      .toThrow('Invalid PayMongo webhook signature')
  })
})
