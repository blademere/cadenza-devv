import { successResponse } from '../../../common/responses/apiResponse.js'
import { getApplicationId } from '../../../platform/applications/application-context.middleware.js'
import * as service from './resource.usage.service.js'

const usage = async (req, res) =>
  successResponse(
    res,
    'Cadenza resource usage history retrieved successfully.',
    await service.listUsage({
      appId: getApplicationId(req),
      resourceId: req.validated?.params?.id,
    }),
  )

export { usage }
