const unwrapEvent = (payload) =>
  payload?.paymentCapture?.value ||
  payload?.paymentSucceeded?.value ||
  payload?.paymentFailure?.value ||
  payload

const normalizePaymentEvent = (payload) => {
  const event = unwrapEvent(payload)
  const data = event?.data || {}
  const eventType = event?.event

  // Cadenza uses Xendit Payments API v3. A successfully collected v3
  // payment is delivered as payment.capture. Keep payment.succeeded
  // support because Xendit's dashboard can send the legacy/v2 test payload.
  if (!['payment.capture', 'payment.succeeded'].includes(eventType)) return null
  if (data.status !== 'SUCCEEDED') return null

  const amount =
    data.captures?.[0]?.capture_amount ??
    data.amount ??
    data.request_amount

  const providerReference = data.payment_id || data.id
  if (!data.reference_id || amount == null || !providerReference) return null

  return {
    referenceId: data.reference_id,
    amount: String(amount),
    currency: data.currency,
    method: data.channel_code || data.payment_method?.type || null,
    providerReference,
    eventId: event.event_id || payload?.['webhook-id'] || providerReference,
    eventType,
    checkoutSessionId: data.payment_request_id,
    metadata: data.metadata || {},
  }
}

export { normalizePaymentEvent }
