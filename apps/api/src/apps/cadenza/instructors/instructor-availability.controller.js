import { successResponse } from '../../../common/responses/apiResponse.js'
import { getApplicationId } from '../../../platform/applications/application-context.middleware.js'
import * as service from './instructor-availability.service.js'

const actorId = (req) => req.user?.id
const get = async (req, res) => successResponse(res, 'Cadenza instructor availability retrieved successfully.', await service.get({ appId: getApplicationId(req), instructorId: req.params.instructorId, actorId: actorId(req) }))
const replace = async (req, res) => successResponse(res, 'Cadenza instructor availability updated successfully.', await service.replace({ appId: getApplicationId(req), instructorId: req.params.instructorId, actorId: actorId(req), rules: req.validated.body.rules }))
const addBlock = async (req, res) => successResponse(res, 'Cadenza instructor blocked period created successfully.', await service.addBlock({ appId: getApplicationId(req), instructorId: req.params.instructorId, actorId: actorId(req), ...req.validated.body }), 201)
const removeBlock = async (req, res) => successResponse(res, 'Cadenza instructor blocked period removed successfully.', await service.removeBlock({ appId: getApplicationId(req), instructorId: req.params.instructorId, blockId: req.params.blockId, actorId: actorId(req) }))

export { get, replace, addBlock, removeBlock }
