import express from 'express'
import {asyncHandler,validate,idempotency} from '../../../common/middleware/index.js'
import authorize,{authorizeResource} from '../../../platform/authorization/authorization.middleware.js'
import * as controller from './rental.controller.js'
import * as service from './rental.service.js'
import {createValidator,availabilityValidator} from './rental.validation.js'
const router=express.Router()
router.get('/customers',authorize('cadenza_rentals','manage'),asyncHandler(controller.customers))
router.get('/availability',authorize('cadenza_rentals','read'),validate(availabilityValidator),asyncHandler(controller.availability))
router.get('/',authorize('cadenza_rentals','read'),asyncHandler(controller.list))
router.post('/',authorize('cadenza_rentals','create'),idempotency({scope:'cadenza-rentals',required:true}),validate(createValidator),asyncHandler(controller.create))
const rentalResource=(action)=>authorizeResource({resource:'cadenza_rentals',action,loadResource:(id,req)=>service.get({appId:req.security.app.id,id,actorId:req.user?.id}),getResourceId:req=>req.params.id})
router.post('/:id/checkout',rentalResource('manage'),idempotency({scope:'cadenza-rental-checkout',required:true}),asyncHandler(controller.checkout))
router.post('/:id/return',rentalResource('manage'),idempotency({scope:'cadenza-rental-return',required:true}),asyncHandler(controller.returnRental))
router.post('/:id/cancel',rentalResource('read'),idempotency({scope:'cadenza-rental-cancel',required:true}),asyncHandler(controller.cancel))
export default router
