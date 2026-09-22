import { successResponse } from '../../../common/responses/apiResponse.js'
import { getApplicationId } from '../../../platform/applications/application-context.middleware.js'
import * as resourceService from '../../../features/resources/resource.service.js'

const create = async (req, res) =>
  successResponse(
    res,
    'Cadenza resource created successfully.',
    await resourceService.createResource({
      actorId: req.user?.id,
      appId: getApplicationId(req),
      data: req.validated.body,
    }),
    201,
  )

export { create }
