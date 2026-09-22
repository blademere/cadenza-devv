import express from 'express'
import {asyncHandler,validate,idempotency} from '../../../common/middleware/index.js'
import authorize,{authorizeResource} from '../../../platform/authorization/authorization.middleware.js'
import * as controller from './student.controller.js'
import * as service from './student.service.js'
import {createValidator,updateValidator,idValidator} from './student.validation.js'
const router=express.Router()
router.post('/me',idempotency({scope:'cadenza-student-self',required:true}),asyncHandler(controller.registerMe))
router.get('/',authorize('cadenza_students','read'),asyncHandler(controller.list))
router.post('/',authorize('cadenza_students','create'),idempotency({scope:'cadenza-students',required:true}),validate(createValidator),asyncHandler(controller.create))
router.patch('/:id',authorize('cadenza_students','manage'),idempotency({scope:'cadenza-students-update',required:true}),validate(updateValidator),asyncHandler(controller.update))
const resource=authorizeResource({resource:'cadenza_students',action:'read',loadResource:(id,req)=>service.get({id,appId:req.security.app.id}),getResourceId:req=>req.params.id})
router.get('/:id',resource,validate(idValidator),asyncHandler(controller.get))
export default router
