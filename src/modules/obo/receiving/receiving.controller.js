const { successResponse } = require('../../../common/responses/apiResponse')
const service = require('./receiving.service')

const list = async (req, res) => successResponse(
  res,
  'Applications awaiting receiving review retrieved successfully.',
  await service.listApplications(req.validated.query),
)

const decide = async (req, res) => successResponse(
  res,
  `Permit application ${req.validated.body.decision.toLowerCase()} successfully.`,
  await service.decide({
    id: req.validated.params.id,
    actorId: req.user.id,
    ...req.validated.body,
  }),
)

module.exports = { list, decide }
