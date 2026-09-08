import { BadRequestError } from '../../../common/errors/appError.js'
import { successResponse } from '../../../common/responses/apiResponse.js'
import * as service from './permit-type.service.js'

const getVersion = (value) => {
  if (value == null || value === '') return undefined
  const version = Number(value)
  if (!Number.isInteger(version) || version < 1) {
    throw new BadRequestError('Form version must be a positive integer.')
  }
  return version
}

const list = async (_req, res) => successResponse(
  res,
  'Permit types retrieved successfully.',
  await service.listPermitTypes(),
)

const getForm = async (req, res) => successResponse(
  res,
  'Permit type form retrieved successfully.',
  await service.getPermitTypeForm(req.params.permitTypeId, getVersion(req.query.version)),
)

const create = async (req, res) => successResponse(
  res,
  'Permit type created successfully.',
  await service.createPermitType({
    actorId: req.user.id,
    data: req.validated.body,
  }),
  201,
)

const update = async (req, res) => successResponse(
  res,
  'Permit type updated successfully.',
  await service.updatePermitType({
    actorId: req.user.id,
    id: req.validated.params.permitTypeId,
    data: req.validated.body,
  }),
)

const createForm = async (req, res) => successResponse(
  res,
  'Permit type form created successfully.',
  await service.createPermitTypeForm({
    actorId: req.user.id,
    permitTypeId: req.validated.params.permitTypeId,
    data: req.validated.body,
  }),
  201,
)

const createFormVersion = async (req, res) => successResponse(
  res,
  'Permit type form version created successfully.',
  await service.createPermitTypeFormVersion({
    actorId: req.user.id,
    permitTypeId: req.validated.params.permitTypeId,
    data: req.validated.body,
  }),
  201,
)

const publishFormVersion = async (req, res) => successResponse(
  res,
  'Permit type form version published successfully.',
  await service.publishPermitTypeFormVersion({
    actorId: req.user.id,
    permitTypeId: req.validated.params.permitTypeId,
    version: req.validated.params.version,
  }),
)

export { list, getForm, create, update, createForm, createFormVersion, publishFormVersion }
