import { successResponse } from '../../../common/responses/apiResponse.js'
import { getApplicationId } from '../../../platform/applications/application-context.middleware.js'
import * as service from './actor.service.js'

const listController = async (req, res) =>
  successResponse(res, 'Cadenza actors retrieved successfully.', await service.list({
    appId: getApplicationId(req),
    query: req.validated.query,
  }))

const getController = async (req, res) =>
  successResponse(res, 'Cadenza actor retrieved successfully.', await service.get({
    appId: getApplicationId(req),
    userId: req.validated.params.userId,
  }))

export { listController, getController }
