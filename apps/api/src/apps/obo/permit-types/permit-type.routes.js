import express from 'express'
import { asyncHandler, idempotency, validate } from '../../../common/middleware/index.js'
import authenticate from '../../../features/auth/authenticate.secure.js'
import authorize, { authorizeResource } from '../../../platform/authorization/authorization.middleware.js'
import { getApplicationId } from '../../../platform/applications/application-context.middleware.js'
import * as controller from './permit-type.controller.js'
import * as service from './permit-type.service.js'
import { createPermitTypeFormValidator, createPermitTypeFormVersionValidator, updatePermitTypeFormVersionValidator, publishPermitTypeFormVersionValidator } from './permit-type.form.validation.js'
import { createPermitTypeValidator, getPermitTypeFormValidator, permitTypeIdValidator, updatePermitTypeValidator, setPermitTypeRequirementsValidator } from './permit-type.validation.js'

const router = express.Router()
const requireIdempotency = idempotency({ scope: 'obo-permit-types', required: true })
const loadPermitType = (id, req) => service.getForAuthorization(id, getApplicationId(req))

const authorizePermitTypeRead = authorizeResource({ resource: 'obo_permit_types', action: 'read', loadResource: loadPermitType, getResourceId: (req) => req.params.permitTypeId })
const authorizePermitTypeUpdate = authorizeResource({ resource: 'obo_permit_types', action: 'update', loadResource: loadPermitType, getResourceId: (req) => req.params.permitTypeId })
const authorizePermitTypeFormsRead = authorizeResource({ resource: 'obo_forms', action: 'read', loadResource: loadPermitType, getResourceId: (req) => req.params.permitTypeId })
const authorizePermitTypeFormsCreate = authorizeResource({ resource: 'obo_forms', action: 'create', loadResource: loadPermitType, getResourceId: (req) => req.params.permitTypeId })
const authorizePermitTypeFormsUpdate = authorizeResource({ resource: 'obo_forms', action: 'update', loadResource: loadPermitType, getResourceId: (req) => req.params.permitTypeId })
const authorizePermitTypeFormsPublish = authorizeResource({ resource: 'obo_forms', action: 'publish', loadResource: loadPermitType, getResourceId: (req) => req.params.permitTypeId })

router.get('/', authenticate, authorize('obo_permit_types', 'read'), asyncHandler(controller.list))
router.post('/', authenticate, authorize('obo_permit_types', 'create'), requireIdempotency, validate(createPermitTypeValidator), asyncHandler(controller.create))
router.get('/:permitTypeId', authenticate, authorizePermitTypeRead, validate(permitTypeIdValidator), asyncHandler(controller.get))
router.patch('/:permitTypeId', authenticate, authorizePermitTypeUpdate, requireIdempotency, validate(updatePermitTypeValidator), asyncHandler(controller.update))
router.get('/:permitTypeId/requirements', authenticate, authorizePermitTypeRead, validate(permitTypeIdValidator), asyncHandler(controller.listRequirements))
router.put('/:permitTypeId/requirements', authenticate, authorizePermitTypeUpdate, requireIdempotency, validate(setPermitTypeRequirementsValidator), asyncHandler(controller.setRequirements))
router.post('/:permitTypeId/form', authenticate, authorizePermitTypeFormsCreate, requireIdempotency, validate(createPermitTypeFormValidator), asyncHandler(controller.createForm))
router.get('/:permitTypeId/form/versions', authenticate, authorizePermitTypeFormsRead, validate(permitTypeIdValidator), asyncHandler(controller.listFormVersions))
router.post('/:permitTypeId/form/versions', authenticate, authorizePermitTypeFormsUpdate, requireIdempotency, validate(createPermitTypeFormVersionValidator), asyncHandler(controller.createFormVersion))
router.get('/:permitTypeId/form/versions/:version', authenticate, authorizePermitTypeFormsRead, validate(publishPermitTypeFormVersionValidator), asyncHandler(controller.getFormVersion))
router.patch('/:permitTypeId/form/versions/:version', authenticate, authorizePermitTypeFormsUpdate, requireIdempotency, validate(updatePermitTypeFormVersionValidator), asyncHandler(controller.updateFormVersion))
router.post('/:permitTypeId/form/versions/:version/publish', authenticate, authorizePermitTypeFormsPublish, requireIdempotency, validate(publishPermitTypeFormVersionValidator), asyncHandler(controller.publishFormVersion))
router.get('/:permitTypeId/form', authenticate, authorizePermitTypeFormsRead, validate(getPermitTypeFormValidator), asyncHandler(controller.getForm))

export default router
