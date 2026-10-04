import { createPaymentProvider } from '../../../platform/payments/payment-provider.js'
import { createXenditClient } from './xendit.client.js'
import { normalizePaymentEvent } from './xendit.mapper.js'

const createXenditProvider = ({ secretKey, webhookToken, baseUrl, apiVersion = '2024-11-11', country = 'PH', channelCode = 'GCASH', successUrl, failureUrl }) => {
  const client = createXenditClient({ secretKey, baseUrl, apiVersion })
  const createCheckout = async ({ amount, currency, referenceNumber, description, metadata, idempotencyKey, successUrl: requestedSuccessUrl, cancelUrl: requestedCancelUrl }) => {
    if (currency.toUpperCase() !== 'PHP' || country !== 'PH') throw new TypeError('Xendit provider currently supports PHP payments in PH only.')
    const result = await client.request('/v3/payment_requests', {
      method: 'POST',
      headers: idempotencyKey ? { 'for-user-id': metadata?.xenditForUserId || '', 'Idempotency-Key': idempotencyKey } : undefined,
      body: JSON.stringify({
        type: 'PAY',
        country,
        currency: currency.toUpperCase(),
        request_amount: Number(amount),
        capture_method: 'AUTOMATIC',
        channel_code: channelCode,
        reference_id: referenceNumber,
        description: description || referenceNumber,
        metadata,
        channel_properties: {
          success_return_url: requestedSuccessUrl || successUrl,
          failure_return_url: requestedCancelUrl || failureUrl,
        },
      }),
    })
    const actions = result?.actions || []
    const findAction = (name) => actions.find((action) => action.type === name)?.value
    return {
      provider: 'XENDIT',
      checkoutSessionId: result?.payment_request_id,
      providerReference: result?.payment_id,
      checkoutUrl: findAction('WEB_URL') || findAction('DEEPLINK_URL') || actions.find((action) => action.type === 'REDIRECT_CUSTOMER')?.value,
      deepLink: findAction('DEEPLINK_URL'),
      qrString: findAction('QR_STRING'),
      raw: result,
    }
  }
  const getCheckoutStatus = async ({ checkoutSessionId }) => {
    if (!checkoutSessionId) throw new TypeError('checkoutSessionId is required.')
    const result = await client.request(`/v3/payment_requests/${encodeURIComponent(checkoutSessionId)}`, { method: 'GET' })
    const latestPayment = result?.latest_payment || {}
    const captureAmount = latestPayment?.captures?.[0]?.capture_amount
    return {
      status: result?.status,
      referenceId: result?.reference_id,
      paymentRequestId: result?.payment_request_id,
      providerReference: result?.latest_payment_id || latestPayment?.payment_id || null,
      amount: String(captureAmount ?? result?.request_amount ?? ''),
      currency: result?.currency,
      method: result?.channel_code,
      metadata: result?.metadata || {},
      raw: result,
    }
  }
  const parseWebhook = ({ rawBody, signature }) => {
    const provided = String(signature || '')
    if (!webhookToken || !provided || provided !== webhookToken) {
      const error = new Error('Invalid Xendit webhook token.')
      error.statusCode = 401
      throw error
    }
    return normalizePaymentEvent(JSON.parse(rawBody.toString('utf8')))
  }
  return createPaymentProvider({ createCheckout, parseWebhook, getCheckoutStatus })
}
export { createXenditProvider }