import { successResponse } from '../../../common/responses/apiResponse.js'
import * as service from './permit-type.service.js'

const getVersion = (value) => {
  if (value == null || value === '') return undefined
  const version = Number(value)
  return Number.isInteger(version) && version > 0 ? version : undefined
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

export { list, getForm }
