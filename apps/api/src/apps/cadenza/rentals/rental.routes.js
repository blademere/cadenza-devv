import express from 'express'
import {asyncHandler,validate,idempotency} from '../../../common/middleware/index.js'
import authorize from '../../../platform/authorization/authorization.middleware.js'
import * as controller from './rental.controller.js'
import {createValidator} from './rental.validation.js'
const router=express.Router();router.use(authorize('cadenza_rentals','manage'));router.get('/',asyncHandler(controller.list));router.post('/',idempotency({scope:'cadenza-rentals',required:true}),validate(createValidator),asyncHandler(controller.create));export default router
