import express from 'express'
import {asyncHandler,validate,idempotency} from '../../../common/middleware/index.js'
import authorize,{authorizeResource} from '../../../platform/authorization/authorization.middleware.js'
import * as controller from './room.controller.js'
import * as service from './room.service.js'
import {createValidator,updateValidator,idValidator} from './room.validation.js'
const router=express.Router()
router.get('/',authorize('cadenza_rooms','read'),asyncHandler(controller.list))
router.post('/',authorize('cadenza_rooms','create'),idempotency({scope:'cadenza-rooms',required:true}),validate(createValidator),asyncHandler(controller.create))
router.patch('/:id',authorizeResource({resource:'cadenza_rooms',action:'update',loadResource:(id,req)=>service.get({id,appId:req.security.app.id}),getResourceId:req=>req.params.id}),idempotency({scope:'cadenza-rooms-update',required:true}),validate(updateValidator),asyncHandler(controller.update))
const resource=authorizeResource({resource:'cadenza_rooms',action:'read',loadResource:(id,req)=>service.get({id,appId:req.security.app.id}),getResourceId:req=>req.params.id})
router.get('/:id',resource,validate(idValidator),asyncHandler(controller.get))
export default router
