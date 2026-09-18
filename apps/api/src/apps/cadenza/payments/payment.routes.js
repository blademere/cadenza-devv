import express from 'express'
import {asyncHandler,validate,idempotency} from '../../../common/middleware/index.js'
import authorize from '../../../platform/authorization/authorization.middleware.js'
import * as controller from './payment.controller.js'
import {getValidator,payValidator} from './payment.validation.js'
const router=express.Router();router.use(authorize('cadenza_rentals','manage'));router.get('/:obligationId',validate(getValidator),asyncHandler(controller.get));router.post('/:obligationId/pay',idempotency({scope:'cadenza-payments',required:true}),validate(payValidator),asyncHandler(controller.pay));export default router
