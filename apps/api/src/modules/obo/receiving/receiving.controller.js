import { successResponse } from '../../../common/responses/apiResponse.js'
import * as service from './receiving.service.js'

const list = async (req, res) => successResponse(res, 'Applications awaiting receiving review retrieved successfully.', await service.listApplications(req.validated.query))
const receive = async (req, res) => successResponse(res, 'Permit application hardcopy received successfully.', await service.receiveHardcopy({ id: req.validated.params.id, actorId: req.user.id }))
const decide = async (req, res) => successResponse(res, `Permit application ${req.validated.body.decision.toLowerCase()} successfully.`, await service.decide({ id: req.validated.params.id, actorId: req.user.id, ...req.validated.body }))

export { list, receive, decide }
