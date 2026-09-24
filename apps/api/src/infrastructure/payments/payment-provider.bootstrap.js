import { env } from '../../config/index.js'
import { registerPaymentProvider } from '../../platform/payments/payment-provider.registry.js'
import { createXenditProvider } from './xendit/xendit.provider.js'

if (env.XENDIT_SECRET_KEY && env.XENDIT_WEBHOOK_TOKEN) {
  registerPaymentProvider('XENDIT', createXenditProvider({
    secretKey: env.XENDIT_SECRET_KEY,
    webhookToken: env.XENDIT_WEBHOOK_TOKEN,
    baseUrl: env.XENDIT_API_BASE_URL,
    apiVersion: env.XENDIT_API_VERSION,
    country: env.XENDIT_COUNTRY,
    channelCode: env.XENDIT_CHANNEL_CODE,
    successUrl: env.XENDIT_SUCCESS_URL,
    failureUrl: env.XENDIT_FAILURE_URL,
  }))
}
