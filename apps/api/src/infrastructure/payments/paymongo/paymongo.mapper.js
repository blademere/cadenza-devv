const METHOD_MAP = Object.freeze({
  card: 'CARD',
  gcash: 'E_WALLET',
  maya: 'E_WALLET',
  grab_pay: 'E_WALLET',
  shopeepay: 'E_WALLET',
  qrph: 'E_WALLET',
})

const mapPaymentMethod = (sourceType) => METHOD_MAP[sourceType] || 'OTHER'

const toMajorAmount = (minorAmount) => {
  if (!Number.isInteger(minorAmount) || minorAmount < 0) throw new Error('PayMongo payment amount is invalid.')
  return (minorAmount / 100).toFixed(2)
}

const normalizePaidEvent = (payload) => {
  const event = payload?.data
  const eventType = event?.attributes?.type || event?.type
  if (eventType !== 'checkout_session.payment.paid') return null

  const session = event?.attributes?.data || event?.data
  const attributes = session?.attributes || {}
  const payment = attributes.payments?.find((item) => item?.attributes?.status === 'paid') || attributes.payments?.[0]
  if (!payment) throw new Error('PayMongo webhook did not include a payment.')

  const paymentAttributes = payment.attributes || {}
  const amount = paymentAttributes.net_amount ?? paymentAttributes.amount
  if (!attributes.reference_number) throw new Error('PayMongo webhook is missing reference_number.')
  if (!payment.id) throw new Error('PayMongo webhook is missing payment id.')

  return {
    eventId: event?.id || payload?.id || session.id,
    referenceId: attributes.reference_number,
    providerReference: payment.id,
    checkoutSessionId: session.id,
    amount: toMajorAmount(amount),
    currency: paymentAttributes.currency,
    method: mapPaymentMethod(paymentAttributes.source?.type),
    metadata: attributes.metadata,
  }
}

export { mapPaymentMethod, normalizePaidEvent }
