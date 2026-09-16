import { successResponse } from '../../../common/responses/apiResponse.js'
import * as service from './application-document.service.js'

const appId = (req) => req.security?.app?.id

const list = async (req, res) => successResponse(res, 'Application document checklist retrieved successfully.', await service.getChecklist({ applicationId: req.validated.params.id, appId: appId(req) }))

const update = async (req, res) => successResponse(res, 'Application document receipt updated successfully.', await service.updateReceiptStatus({ applicationId: req.validated.params.id, appId: appId(req), requirementId: req.validated.params.requirementId, actorId: req.user.id, ...req.validated.body }))

export { list, update }
