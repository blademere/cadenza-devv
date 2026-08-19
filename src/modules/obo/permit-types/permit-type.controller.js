const { successResponse } = require('../../../common/responses/apiResponse')
const service = require('./permit-type.service')

const list = async (_req, res) => successResponse(
  res,
  'Permit types retrieved successfully.',
  await service.listPermitTypes(),
)

module.exports = { list }
