import express from 'express'
import {asyncHandler,validate,idempotency} from '../../../common/middleware/index.js'
import authorize from '../../../platform/authorization/authorization.middleware.js'
import * as controller from './instrument.controller.js'
import {createValidator,idValidator} from './instrument.validation.js'
const router=express.Router();router.use(authorize('cadenza_instruments','manage'));router.get('/',asyncHandler(controller.list));router.post('/',idempotency({scope:'cadenza-instruments',required:true}),validate(createValidator),asyncHandler(controller.create));router.get('/:id',validate(idValidator),asyncHandler(controller.get));export default router
