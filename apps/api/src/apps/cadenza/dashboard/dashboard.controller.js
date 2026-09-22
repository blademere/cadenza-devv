import { successResponse } from '../../../common/responses/apiResponse.js'
import { getApplicationId } from '../../../platform/applications/application-context.middleware.js'
import * as service from './dashboard.service.js'
const get = async (req, res) => successResponse(res, 'Cadenza dashboard retrieved successfully.', await service.getDashboard({ appId: getApplicationId(req), actorId: req.user?.id }))
export { get }