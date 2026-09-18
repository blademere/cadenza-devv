import express from 'express'
import {asyncHandler,validate,idempotency} from '../../../common/middleware/index.js'
import authorize,{authorizeResource} from '../../../platform/authorization/authorization.middleware.js'
import * as controller from './payment.controller.js'
import * as service from './payment.service.js'
import {getValidator,payValidator} from './payment.validation.js'
const router=express.Router();router.use(authorize('cadenza_payments','manage'));const resource=authorizeResource({resource:'cadenza_payments',action:'manage',loadResource:(id,req)=>service.get({obligationId:id,appId:req.security.app.id}),getResourceId:req=>req.params.obligationId});router.get('/:obligationId',resource,validate(getValidator),asyncHandler(controller.get));router.post('/:obligationId/pay',resource,idempotency({scope:'cadenza-payments',required:true}),validate(payValidator),asyncHandler(controller.pay));export default router
