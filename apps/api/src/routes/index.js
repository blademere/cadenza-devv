import express from 'express'
import authRouter from '../features/auth/auth.routes.js'
import userRouter from '../features/users/user.routes.js'
import authorizationAdminRouter from '../features/authorization-admin/authorization-admin.routes.js'
import authorizationContextRouter from '../platform/authorization/authorization-context.routes.js'
import oboRouter from '../modules/obo/obo.routes.js'
import authenticate from '../features/auth/authenticate.secure.js'

const router = express.Router()
const authorizationContextProtectedRouter = express.Router()

authorizationContextProtectedRouter.use(authenticate)
authorizationContextProtectedRouter.use(authorizationContextRouter)

router.use('/auth', authRouter)
router.use('/users', userRouter)
router.use('/authorization', authorizationAdminRouter)
router.use('/', authorizationContextProtectedRouter)
router.use('/obo', oboRouter)

export default router
