import express from 'express'
import { asyncHandler } from '../../../common/middleware/index.js'
import authorize from '../../../platform/authorization/authorization.middleware.js'
import * as controller from './dashboard.controller.js'
const router = express.Router()
router.get('/', authorize('cadenza_dashboard', 'read'), asyncHandler(controller.get))
export default router