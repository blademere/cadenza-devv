const { successResponse } = require('../../../common/responses/apiResponse')
const service = require('./permit-type.service')

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

module.exports = { list, getForm }
