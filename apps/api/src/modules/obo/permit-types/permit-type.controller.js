import { successResponse } from '../../../common/responses/apiResponse.js'
import * as service from './permit-type.service.js'

const list = async (_req, res) => successResponse(
  res,
  'Permit types retrieved successfully.',
  await service.listPermitTypes(),
)

const getForm = async (req, res) => successResponse(
  res,
  'Permit type form retrieved successfully.',
  await service.getPermitTypeForm(req.params.permitTypeId),
)

export { list, getForm }
