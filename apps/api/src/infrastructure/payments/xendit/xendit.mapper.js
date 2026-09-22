const normalizePaymentEvent = (payload) => {
  const event = payload?.paymentCapture?.value || payload?.paymentAuthorization?.value || payload?.paymentFailure?.value || payload
  const data = event?.data || {}
  if (!['payment.capture', 'payment.authorization'].includes(event?.event)) return null
  if (data.status !== 'SUCCEEDED') return null
  return {
    referenceId: data.reference_id,
    amount: String(data.captures?.[0]?.capture_amount ?? data.request_amount),
    currency: data.currency,
    method: data.channel_code,
    providerReference: data.payment_id,
    eventId: event.event_id || data.payment_id,
    eventType: event.event || 'payment.capture',
    checkoutSessionId: data.payment_request_id,
    metadata: data.metadata || {},
  }
}
export { normalizePaymentEvent }