import express from 'express'
import {asyncHandler,validate,idempotency} from '../../../common/middleware/index.js'
import authorize,{authorizeResource} from '../../../platform/authorization/authorization.middleware.js'
import * as controller from './instrument.controller.js'
import * as service from './instrument.service.js'
import {createValidator,idValidator} from './instrument.validation.js'
const router=express.Router();router.use(authorize('cadenza_instruments','manage'));const resource=authorizeResource({resource:'cadenza_instruments',action:'manage',loadResource:(id,req)=>service.get({id,appId:req.security.app.id}),getResourceId:req=>req.params.id});router.get('/',asyncHandler(controller.list));router.post('/',idempotency({scope:'cadenza-instruments',required:true}),validate(createValidator),asyncHandler(controller.create));router.get('/:id',resource,validate(idValidator),asyncHandler(controller.get));export default router
