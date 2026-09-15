import { NotFoundError } from '../../../common/errors/appError.js'
import { successResponse } from '../../../common/responses/apiResponse.js'
import * as service from './permit-type.service.js'
import * as requirementService from './permit-type-requirement.service.js'

const list = async (_req, res) => successResponse(res, 'Permit types retrieved successfully.', await service.listPermitTypes())

const get = async (req, res) => {
  const permitType = await service.getPermitTypeById(req.validated.params.permitTypeId)
  if (!permitType) throw new NotFoundError('Permit type not found.')
  return successResponse(res, 'Permit type retrieved successfully.', permitType)
}

const getForm = async (req, res) => successResponse(
  res,
  'Permit type form retrieved successfully.',
  await service.getPermitTypeForm(req.validated.params.permitTypeId, req.validated.query.version),
)

const listFormVersions = async (req, res) => successResponse(
  res,
  'Permit type form versions retrieved successfully.',
  await service.getPermitTypeFormVersions(req.validated.params.permitTypeId),
)

const getFormVersion = async (req, res) => successResponse(
  res,
  'Permit type form version retrieved successfully.',
  await service.getPermitTypeFormVersion(req.validated.params.permitTypeId, req.validated.params.version),
)

const create = async (req, res) => successResponse(
  res,
  'Permit type created successfully.',
  await service.createPermitType({ actorId: req.user.id, data: req.validated.body }),
  201,
)

const update = async (req, res) => successResponse(
  res,
  'Permit type updated successfully.',
  await service.updatePermitType({ actorId: req.user.id, id: req.validated.params.permitTypeId, data: req.validated.body }),
)

const listRequirements = async (req, res) => successResponse(
  res,
  'Permit type requirements retrieved successfully.',
  await requirementService.listRequirements(req.validated.params.permitTypeId),
)

const setRequirements = async (req, res) => successResponse(
  res,
  'Permit type requirements updated successfully.',
  await requirementService.setRequirements({ permitTypeId: req.validated.params.permitTypeId, requirementIds: req.validated.body.requirementIds }),
)

const createForm = async (req, res) => successResponse(
  res,
  'Permit type form created successfully.',
  await service.createPermitTypeForm({ actorId: req.user.id, permitTypeId: req.validated.params.permitTypeId, data: req.validated.body }),
  201,
)

const createFormVersion = async (req, res) => successResponse(
  res,
  'Permit type form version created successfully.',
  await service.createPermitTypeFormVersion({ actorId: req.user.id, permitTypeId: req.validated.params.permitTypeId, data: req.validated.body }),
  201,
)

const updateFormVersion = async (req, res) => successResponse(
  res,
  'Permit type form draft updated successfully.',
  await service.updatePermitTypeFormVersion({
    actorId: req.user.id,
    permitTypeId: req.validated.params.permitTypeId,
    version: req.validated.params.version,
    data: req.validated.body,
  }),
)

const publishFormVersion = async (req, res) => successResponse(
  res,
  'Permit type form version published successfully.',
  await service.publishPermitTypeFormVersion({ actorId: req.user.id, permitTypeId: req.validated.params.permitTypeId, version: req.validated.params.version }),
)

export { list, get, getForm, listFormVersions, getFormVersion, create, update, listRequirements, setRequirements, createForm, createFormVersion, updateFormVersion, publishFormVersion }
