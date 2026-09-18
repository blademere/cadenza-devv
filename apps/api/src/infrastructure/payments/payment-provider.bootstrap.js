import { env } from '../../config/index.js'
import { registerPaymentProvider } from '../../platform/payments/payment-provider.registry.js'
import { createPayMongoProvider } from './paymongo/paymongo.provider.js'

if (env.PAYMONGO_SECRET_KEY && env.PAYMONGO_WEBHOOK_SECRET) {
  registerPaymentProvider('PAYMONGO', createPayMongoProvider({
    secretKey: env.PAYMONGO_SECRET_KEY,
    webhookSecret: env.PAYMONGO_WEBHOOK_SECRET,
    mode: env.PAYMONGO_MODE,
    baseUrl: env.PAYMONGO_API_BASE_URL,
    webhookToleranceSeconds: env.PAYMONGO_WEBHOOK_TOLERANCE_SECONDS,
  }))
}
