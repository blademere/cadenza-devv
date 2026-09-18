import express from 'express'
import authRouter from '../features/auth/auth.routes.js'
import profileRouter from '../features/profile/profile.routes.js'
import createAuthorizationRouter from '../platform/authorization/authorization.routes.js'
import auditRouter from '../platform/audit/audit.routes.js'
import applicationRouter from '../platform/applications/application.routes.js'
import oboRouter from '../apps/obo/obo.routes.js'
import cadenzaRouter from '../apps/cadenza/cadenza.routes.js'
import authenticate from '../features/auth/authenticate.secure.js'

const router = express.Router()

router.use('/auth', authRouter)
router.use('/users', profileRouter)
router.use('/audit', auditRouter)
router.use('/apps', applicationRouter)
router.use('/', createAuthorizationRouter({ authenticate }))
router.use('/obo', oboRouter)
router.use('/cadenza', cadenzaRouter)

export default router
