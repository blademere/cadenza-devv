import express from 'express'
import {asyncHandler,validate,idempotency} from '../../../common/middleware/index.js'
import authorize,{authorizeResource} from '../../../platform/authorization/authorization.middleware.js'
import * as controller from './room.controller.js'
import * as service from './room.service.js'
import {createValidator,idValidator} from './room.validation.js'
const router=express.Router();router.use(authorize('cadenza_rooms','manage'));const resource=authorizeResource({resource:'cadenza_rooms',action:'manage',loadResource:(id,req)=>service.get({id,appId:req.security.app.id}),getResourceId:req=>req.params.id});router.get('/',asyncHandler(controller.list));router.post('/',idempotency({scope:'cadenza-rooms',required:true}),validate(createValidator),asyncHandler(controller.create));router.get('/:id',resource,validate(idValidator),asyncHandler(controller.get));export default router
