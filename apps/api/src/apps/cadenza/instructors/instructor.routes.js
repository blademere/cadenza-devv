import express from 'express'
import {asyncHandler,validate,idempotency} from '../../../common/middleware/index.js'
import authorize,{authorizeResource} from '../../../platform/authorization/authorization.middleware.js'
import * as controller from './instructor.controller.js'
import * as service from './instructor.service.js'
import * as availabilityController from './instructor-availability.controller.js'
import * as availabilityValidation from './instructor-availability.validation.js'
import {createValidator,updateValidator,idValidator} from './instructor.validation.js'
const router=express.Router()
const instructorResource=(action)=>authorizeResource({resource:'cadenza_instructors',action,loadResource:(id,req)=>service.get({id,appId:req.security.app.id}),getResourceId:req=>req.params.instructorId ?? req.params.id})
router.get('/:instructorId/availability',instructorResource('read'),validate(availabilityValidation.instructorParamsValidator),asyncHandler(availabilityController.get))
router.put('/:instructorId/availability',instructorResource('update'),idempotency({scope:'cadenza-instructor-availability',required:true}),validate(availabilityValidation.replaceValidator),asyncHandler(availabilityController.replace))
router.post('/:instructorId/availability/blocks',instructorResource('update'),idempotency({scope:'cadenza-instructor-availability-block',required:true}),validate(availabilityValidation.blockValidator),asyncHandler(availabilityController.addBlock))
router.delete('/:instructorId/availability/blocks/:blockId',instructorResource('update'),idempotency({scope:'cadenza-instructor-availability-block-delete',required:true}),validate(availabilityValidation.blockParamsValidator),asyncHandler(availabilityController.removeBlock))
router.get('/me/schedule',authorize('cadenza_instructors','read'),asyncHandler(controller.listMySchedule))
router.get('/',authorize('cadenza_instructors','read'),asyncHandler(controller.list))
router.post('/',authorize('cadenza_instructors','create'),idempotency({scope:'cadenza-instructors',required:true}),validate(createValidator),asyncHandler(controller.create))
router.patch('/:id',instructorResource('update'),idempotency({scope:'cadenza-instructors-update',required:true}),validate(updateValidator),asyncHandler(controller.update))
const resource=authorizeResource({resource:'cadenza_instructors',action:'read',loadResource:(id,req)=>service.get({id,appId:req.security.app.id}),getResourceId:req=>req.params.id})
router.get('/:id',resource,validate(idValidator),asyncHandler(controller.get))
export default router
