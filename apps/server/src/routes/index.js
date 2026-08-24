const express = require('express')
const authRouter = require('../features/auth/auth.routes')
const userRouter = require('../features/users/user.routes')
const authorizationAdminRouter = require('../features/authorization-admin/authorization-admin.routes')
const authorizationContextRouter = require('../platform/authorization/authorization-context.routes')
const oboRouter = require('../modules/obo')
const authenticate = require('../features/auth/authenticate.secure')

const router = express.Router()
router.use('/auth', authRouter)
router.use('/users', userRouter)
router.use('/authorization', authorizationAdminRouter)
router.use('/', authenticate, authorizationContextRouter)
router.use('/obo', oboRouter)

module.exports = router
