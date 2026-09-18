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

const createPayMongoProvider = ({ secretKey, webhookSecret, mode = 'test', baseUrl, webhookToleranceSeconds = 300, successUrl, cancelUrl, paymentMethodTypes = ['card', 'gcash', 'qrph'], passOnFees = false }) => {
  const client = createPayMongoClient({ secretKey, baseUrl })

  const createCheckout = async ({ amount, currency, referenceNumber, description, metadata, idempotencyKey, successUrl: requestedSuccessUrl, cancelUrl: requestedCancelUrl }) => {
    const minorAmount = Math.round(Number(amount) * 100)
    if (!Number.isSafeInteger(minorAmount) || minorAmount <= 0) throw new TypeError('Checkout amount must be a positive currency amount.')
    const result = await client.request('/v2/checkout_sessions', {
      method: 'POST',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      body: JSON.stringify({
        data: { attributes: {
          line_items: [{ name: description || referenceNumber, amount: minorAmount, currency: currency.toUpperCase(), quantity: 1 }],
          payment_method_types: paymentMethodTypes,
          success_url: requestedSuccessUrl || successUrl,
          cancel_url: requestedCancelUrl || cancelUrl,
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
    if (!Number.isInteger(timestamp)) { const error = new Error('Invalid PayMongo webhook signature.'); error.statusCode = 401; throw error }
    if (Math.abs(Math.floor(now / 1000) - timestamp) > webhookToleranceSeconds) { const error = new Error('Expired PayMongo webhook signature.'); error.statusCode = 401; throw error }
    const expected = crypto.createHmac('sha256', webhookSecret).update(`${timestamp}.${rawBody.toString('utf8')}`).digest('hex')
    const provided = mode === 'live' ? parts.li : parts.te
    if (!timingSafeEqualHex(expected, provided)) { const error = new Error('Invalid PayMongo webhook signature.'); error.statusCode = 401; throw error }
    return normalizePaidEvent(JSON.parse(rawBody.toString('utf8')))
  }

  return createPaymentProvider({ createCheckout, parseWebhook })
}

export { createPayMongoProvider }
