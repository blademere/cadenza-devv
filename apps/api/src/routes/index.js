import express from 'express'
import authRouter from '../features/auth/auth.routes.js'
import profileRouter from '../features/profile/profile.routes.js'
import createAuthorizationRouter from '../platform/authorization/authorization.routes.js'
import auditRouter from '../platform/audit/audit.routes.js'
import createApplicationRouter from '../platform/applications/application.routes.js'
import cadenzaClientRouter from '../apps/cadenza-client/app.js'
// Mobile API routes for apps/cadenza-mobile.
import cadenzaMobileApiRouter from '../apps/cadenza-mobile-api/app.js'
import authenticate from '../features/auth/authenticate.secure.js'
import { selectApplication } from '../features/auth/auth.service.js'
import paymentWebhookRouter from '../platform/payments/payment-webhook.routes.js'

const router = express.Router()

router.use('/auth', authRouter)
router.use('/users', profileRouter)
router.use('/audit', auditRouter)
router.use('/apps', createApplicationRouter({ authenticate, issueApplicationSession: selectApplication }))
router.use('/payments/webhooks', paymentWebhookRouter)
router.use('/', createAuthorizationRouter({ authenticate }))
router.use('/cadenza-client', cadenzaClientRouter)
// Mobile frontend API boundary; keep mobile routes separate from the web client.
router.use('/cadenza-mobile', cadenzaMobileApiRouter)

export default router
