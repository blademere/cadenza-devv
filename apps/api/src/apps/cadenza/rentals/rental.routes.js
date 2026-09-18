import express from 'express'
import {asyncHandler,validate,idempotency} from '../../../common/middleware/index.js'
import authorize,{authorizeResource} from '../../../platform/authorization/authorization.middleware.js'
import * as controller from './rental.controller.js'
import * as service from './rental.service.js'
import {createValidator} from './rental.validation.js'
const router=express.Router()
router.get('/',authorize('cadenza_rentals','read'),asyncHandler(controller.list))
router.post('/',authorize('cadenza_rentals','create'),idempotency({scope:'cadenza-rentals',required:true}),validate(createValidator),asyncHandler(controller.create))
const checkoutResource=authorizeResource({resource:'cadenza_rentals',action:'manage',loadResource:(id,req)=>service.get({appId:req.security.app.id,id}),getResourceId:req=>req.params.id})
router.post('/:id/checkout',checkoutResource,idempotency({scope:'cadenza-rental-checkout',required:true}),asyncHandler(controller.checkout))
router.post('/:id/return',checkoutResource,idempotency({scope:'cadenza-rental-return',required:true}),asyncHandler(controller.returnRental))
export default router
