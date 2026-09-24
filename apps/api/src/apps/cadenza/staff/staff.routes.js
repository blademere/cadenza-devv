import express from 'express'
import { asyncHandler, validate, idempotency } from '../../../common/middleware/index.js'
import authorize, { authorizeResource } from '../../../platform/authorization/authorization.middleware.js'
import * as service from './staff.service.js'
import * as controller from './staff.controller.js'
import * as validation from './staff.validation.js'

const router = express.Router()
const read = authorize('cadenza_staff', 'read')
const manage = authorize('cadenza_staff', 'manage')
const idem = idempotency({ scope: 'cadenza-staff', required: true })
const resource = authorizeResource({
  resource: 'cadenza_staff',
  action: 'manage',
  loadResource: (id, req) => service.get({ appId: req.security.app.id, id }),
  getResourceId: (req) => req.params.id,
})

router.get('/candidates', manage, asyncHandler(controller.listCandidatesController))
router.get('/', read, asyncHandler(controller.listController))
router.get('/:id', read, validate(validation.idParamsValidator), asyncHandler(controller.getController))
router.post('/', manage, idem, validate(validation.createStaffValidator), asyncHandler(controller.createController))
router.patch('/:id', resource, idem, validate(validation.updateStaffValidator), asyncHandler(controller.updateController))

export default router
