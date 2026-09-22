import crypto from 'node:crypto'
import { getPaymentProvider } from './payment-provider.registry.js'
import { recordPayment } from './payment.service.js'
import { getPaymentWorkflow } from './payment-workflow.registry.js'
import * as eventRepository from './payment-provider-event.repository.js'

const handlePaymentWebhook = async ({ provider, rawBody, signature }) => {
  const paymentProvider = getPaymentProvider(provider)
  const event = paymentProvider.parseWebhook({ rawBody, signature })
  if (!event) return { processed: false, reason: 'IGNORED_EVENT' }

  if (!event.metadata?.appId) throw new Error('Payment provider webhook is missing appId metadata.')

  const normalizedProvider = String(provider).toUpperCase()
  const eventId = event.eventId || event.providerReference
  const eventType = event.eventType || 'payment'
  if (!eventId) throw new Error('Payment provider webhook is missing event identity.')

  const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex')
  const existing = await eventRepository.findEvent(normalizedProvider, eventId, eventType)
  if (existing?.payloadHash && existing.payloadHash !== payloadHash) {
    throw new Error('Payment provider webhook payload does not match the previously received event.')
  }
  if (existing?.status === 'PROCESSED') return { processed: false, duplicate: true, eventId }

  const eventRow = existing || await eventRepository.createEvent({
    provider: normalizedProvider,
    eventId,
    eventType,
    payloadHash,
    payload: (() => {
      try { return JSON.parse(rawBody.toString('utf8')) } catch { return null }
    })(),
  })

  try {
    const workflow = getPaymentWorkflow(event.metadata?.applicationKey)
    if (workflow) {
      await workflow.beforeRecord({
        appId: event.metadata.appId,
        obligationId: event.referenceId,
        amount: event.amount,
      })
    }

    const payment = await recordPayment({
      appId: event.metadata.appId,
      obligationId: event.referenceId,
      amount: event.amount,
      currency: event.currency,
      method: event.method,
      provider: normalizedProvider,
      providerReference: event.providerReference,
      idempotencyKey: `${normalizedProvider}:${event.providerReference}`,
      metadata: { ...event.metadata, checkoutSessionId: event.checkoutSessionId, webhookEventId: eventId },
      onSettled: workflow ? ({ db, obligation, paidAmount }) => workflow.onSettled({ db, obligation, paidAmount }) : null,
    })

    await eventRepository.markProcessed(eventRow.id, { status: 'PROCESSED', processedAt: new Date(), errorMessage: null })
    return { processed: true, payment, eventId }
  } catch (error) {
    await eventRepository.markProcessed(eventRow.id, { status: 'FAILED', errorMessage: error.message?.slice(0, 1000) }).catch(() => {})
    throw error
  }
}

export { handlePaymentWebhook }
