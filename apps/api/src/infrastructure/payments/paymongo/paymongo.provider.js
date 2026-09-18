import crypto from 'node:crypto'
import { createPaymentProvider } from '../../../platform/payments/payment-provider.js'
import { createPayMongoClient } from './paymongo.client.js'
import { normalizePaidEvent } from './paymongo.mapper.js'

const parseSignature = (value) => Object.fromEntries(
  String(value || '').split(',').map((part) => part.trim().split('=').map((item) => item.trim()))
)

const timingSafeEqualHex = (expected, actual) => {
  if (!expected || !actual || expected.length !== actual.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
}

const createPayMongoProvider = ({ secretKey, webhookSecret, mode = 'test', baseUrl, webhookToleranceSeconds = 300 }) => {
  const client = createPayMongoClient({ secretKey, baseUrl })

  const createCheckout = async ({ amount, currency, referenceNumber, description, paymentMethodTypes, successUrl, cancelUrl, metadata, passOnFees = false }) => {
    const minorAmount = Math.round(Number(amount) * 100)
    if (!Number.isSafeInteger(minorAmount) || minorAmount <= 0) throw new TypeError('Checkout amount must be a positive currency amount.')
    const result = await client.request('/v2/checkout_sessions', {
      method: 'POST',
      body: JSON.stringify({
        data: { attributes: {
          line_items: [{ name: description || referenceNumber, amount: minorAmount, currency: currency.toUpperCase(), quantity: 1 }],
          payment_method_types: paymentMethodTypes,
          success_url: successUrl,
          cancel_url: cancelUrl,
          reference_number: referenceNumber,
          metadata,
          pass_on_fees: passOnFees,
        } },
      }),
    })
    return { provider: 'PAYMONGO', checkoutSessionId: result?.data?.id, checkoutUrl: result?.data?.attributes?.checkout_url }
  }

  const parseWebhook = ({ rawBody, signature, now = Date.now() }) => {
    if (!webhookSecret) throw new Error('PAYMONGO_WEBHOOK_SECRET is required.')
    const parts = parseSignature(signature)
    const timestamp = Number(parts.t)
    if (!Number.isInteger(timestamp)) throw new Error('Invalid PayMongo webhook signature.')
    if (Math.abs(Math.floor(now / 1000) - timestamp) > webhookToleranceSeconds) throw new Error('Expired PayMongo webhook signature.')
    const expected = crypto.createHmac('sha256', webhookSecret).update(`${timestamp}.${rawBody.toString('utf8')}`).digest('hex')
    const provided = mode === 'live' ? parts.li : parts.te
    if (!timingSafeEqualHex(expected, provided)) throw new Error('Invalid PayMongo webhook signature.')
    return normalizePaidEvent(JSON.parse(rawBody.toString('utf8')))
  }

  return createPaymentProvider({ createCheckout, parseWebhook })
}

export { createPayMongoProvider }
