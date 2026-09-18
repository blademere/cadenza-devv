import express from 'express'
import {asyncHandler,validate,idempotency} from '../../../common/middleware/index.js'
import authorize,{authorizeResource} from '../../../platform/authorization/authorization.middleware.js'
import * as controller from './rental.controller.js'
import * as service from './rental.service.js'
import {createValidator} from './rental.validation.js'
const router=express.Router();router.use(authorize('cadenza_rentals','manage'));router.get('/',asyncHandler(controller.list));router.post('/',idempotency({scope:'cadenza-rentals',required:true}),validate(createValidator),asyncHandler(controller.create));const resource=authorizeResource({resource:'cadenza_rentals',action:'manage',loadResource:(id,req)=>service.list({appId:req.security.app.id}).then(items=>items.find(item=>item.id===id)),getResourceId:req=>req.params.id});router.post('/:id/checkout',resource,idempotency({scope:'cadenza-rental-checkout',required:true}),asyncHandler(controller.checkout));router.post('/:id/return',resource,idempotency({scope:'cadenza-rental-return',required:true}),asyncHandler(controller.returnRental));export default router
