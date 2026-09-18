import { successResponse } from '../../../common/responses/apiResponse.js'
import { getApplicationId } from '../../../platform/applications/application-context.middleware.js'
import * as service from './receiving.service.js'

const list = async (req, res) => successResponse(res, 'Applications awaiting receiving review retrieved successfully.', await service.listApplications({ ...req.validated.query, appId: getApplicationId(req), userId: req.user.id }))
const get = async (req, res) => successResponse(res, 'Receiving application retrieved successfully.', await service.getApplication({ id: req.validated.params.id, appId: getApplicationId(req) }))
const receive = async (req, res) => successResponse(res, 'Permit application hardcopy received successfully.', await service.receiveHardcopy({ id: req.validated.params.id, appId: getApplicationId(req), actorId: req.user.id }))
const decide = async (req, res) => successResponse(res, `Permit application ${req.validated.body.decision.toLowerCase()} successfully.`, await service.decide({ id: req.validated.params.id, appId: getApplicationId(req), actorId: req.user.id, ...req.validated.body }))

export { list, get, receive, decide }
