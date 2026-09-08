import express from 'express'
import { asyncHandler, idempotency, validate } from '../../../common/middleware/index.js'
import authenticate from '../../../features/auth/authenticate.secure.js'
import authorize from '../../../platform/authorization/authorize.js'
import * as controller from './permit-type.controller.js'
import {
  createPermitTypeFormValidator,
  createPermitTypeFormVersionValidator,
  updatePermitTypeFormVersionValidator,
  publishPermitTypeFormVersionValidator,
} from './permit-type.form.validation.js'
import {
  createPermitTypeValidator,
  permitTypeIdValidator,
  updatePermitTypeValidator,
} from './permit-type.validation.js'

const router = express.Router()
const requireIdempotency = idempotency({ scope: 'obo-permit-types', required: true })

router.get('/', authenticate, authorize('obo_plan_permits', 'read'), asyncHandler(controller.list))
router.post('/', authenticate, authorize('obo_permit_types', 'create'), requireIdempotency, validate(createPermitTypeValidator), asyncHandler(controller.create))
router.patch('/:permitTypeId', authenticate, authorize('obo_permit_types', 'update'), requireIdempotency, validate(updatePermitTypeValidator), asyncHandler(controller.update))
router.post('/:permitTypeId/form', authenticate, authorize('obo_forms', 'create'), requireIdempotency, validate(createPermitTypeFormValidator), asyncHandler(controller.createForm))
router.post('/:permitTypeId/form/versions', authenticate, authorize('obo_forms', 'update'), requireIdempotency, validate(createPermitTypeFormVersionValidator), asyncHandler(controller.createFormVersion))
router.get('/:permitTypeId/form/versions/:version', authenticate, authorize('obo_forms', 'update'), validate(updatePermitTypeFormVersionValidator), asyncHandler(controller.getFormVersion))
router.patch('/:permitTypeId/form/versions/:version', authenticate, authorize('obo_forms', 'update'), requireIdempotency, validate(updatePermitTypeFormVersionValidator), asyncHandler(controller.updateFormVersion))
router.post('/:permitTypeId/form/versions/:version/publish', authenticate, authorize('obo_forms', 'publish'), requireIdempotency, validate(publishPermitTypeFormVersionValidator), asyncHandler(controller.publishFormVersion))
router.get('/:permitTypeId/form', authenticate, authorize('obo_plan_permits', 'read'), validate(permitTypeIdValidator), asyncHandler(controller.getForm))

export default router
