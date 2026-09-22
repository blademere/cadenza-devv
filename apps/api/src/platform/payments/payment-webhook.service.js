import { getPaymentProvider } from './payment-provider.registry.js'
import { recordPayment, getObligation } from './payment.service.js'
import { getPaymentWorkflow } from './payment-workflow.registry.js'

const handlePaymentWebhook = async ({ provider, rawBody, signature }) => {
  const paymentProvider = getPaymentProvider(provider)
  const event = paymentProvider.parseWebhook({ rawBody, signature })
  if (!event) return { processed: false, reason: 'IGNORED_EVENT' }

  if (!event.metadata?.appId) throw new Error('Payment provider webhook is missing appId metadata.')

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
    provider: String(provider).toUpperCase(),
    providerReference: event.providerReference,
    idempotencyKey: `${String(provider).toUpperCase()}:${event.providerReference}`,
    metadata: {
      ...event.metadata,
      checkoutSessionId: event.checkoutSessionId,
    },
    onSettled: workflow ? ({ db, obligation, paidAmount }) => workflow.onSettled({ db, obligation, paidAmount }) : null,
  })

  return { processed: true, payment }
}

export { handlePaymentWebhook }
