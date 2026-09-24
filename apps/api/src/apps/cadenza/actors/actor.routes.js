import express from 'express'
import { asyncHandler, validate } from '../../../common/middleware/index.js'
import authorize, { authorizeResource } from '../../../platform/authorization/authorization.middleware.js'
import * as service from './actor.service.js'
import * as controller from './actor.controller.js'
import * as validation from './actor.validation.js'

const router = express.Router()
const read = authorize('cadenza_staff', 'read')
const actorResource = authorizeResource({
  resource: 'cadenza_staff',
  action: 'read',
  loadResource: (userId, req) => service.get({ appId: req.security.app.id, userId }),
  getResourceId: (req) => Number(req.params.userId),
})

router.get('/', read, validate(validation.listActorsValidator), asyncHandler(controller.listController))
router.get('/:userId', validate(validation.actorParamsValidator), actorResource, asyncHandler(controller.getController))

export default router
