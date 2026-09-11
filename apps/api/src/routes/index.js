import express from 'express'
import authRouter from '../features/auth/auth.routes.js'
import userRouter from '../features/users/user.routes.js'
import authorizationRouter from '../features/admin/authorization/authorization.routes.js'
import createAuthorizationContextRouter from '../platform/authorization/authorization-context.routes.js'
import auditRouter from '../platform/audit/audit.routes.js'
import appointmentRouter from '../features/appointments/appointment.routes.js'
import oboRouter from '../modules/obo/obo.routes.js'
import authenticate from '../features/auth/authenticate.secure.js'

const router = express.Router()

router.use('/auth', authRouter)
router.use('/users', userRouter)
router.use('/admin/authorization', authorizationRouter)
router.use('/appointments', appointmentRouter)
router.use('/audit', auditRouter)
router.use('/', createAuthorizationContextRouter({ authenticate }))
router.use('/obo', oboRouter)

export default router
