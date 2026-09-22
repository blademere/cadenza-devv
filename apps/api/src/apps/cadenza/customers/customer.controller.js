import { successResponse } from '../../../common/responses/apiResponse.js'
import { getApplicationId } from '../../../platform/applications/application-context.middleware.js'
import * as service from './customer.service.js'

const list = async (req, res) => successResponse(res, 'Cadenza customers retrieved successfully.', await service.list({ appId: getApplicationId(req) }))
const get = async (req, res) => successResponse(res, 'Cadenza customer retrieved successfully.', await service.get({ appId: getApplicationId(req), id: req.params.id, actorId: req.user?.id }))
const create = async (req, res) => successResponse(res, 'Cadenza customer created successfully.', await service.create({ appId: getApplicationId(req), personId: req.validated.body.personId, actorId: req.user?.id }), 201)
const registerMe = async (req, res) => successResponse(res, 'Cadenza customer registration completed.', await service.ensureMe({ appId: getApplicationId(req), actorId: req.user?.id }), 201)
const update = async (req, res) => successResponse(res, 'Cadenza customer updated successfully.', await service.update({ appId: getApplicationId(req), id: req.params.id, status: req.validated.body.status }))

export { list, get, create, registerMe, update }
