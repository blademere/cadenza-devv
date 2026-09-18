import { successResponse } from '../../../common/responses/apiResponse.js'
import { getApplicationId } from '../../../platform/applications/application-context.middleware.js'
import * as service from './submission-appointment.service.js'

const create = async (req, res) => successResponse(res, 'Hardcopy submission appointment booked successfully.', await service.createSubmissionAppointment({ applicationId: req.validated.params.applicationId, appId: getApplicationId(req), userId: req.user.id, ...req.validated.body }), 201)
const get = async (req, res) => successResponse(res, 'Hardcopy submission appointment retrieved successfully.', await service.getSubmissionAppointment({ applicationId: req.validated.params.applicationId, appId: getApplicationId(req), userId: req.user.id }))
const replace = async (req, res) => successResponse(res, 'Hardcopy submission appointment changed successfully.', await service.replaceSubmissionAppointment({ applicationId: req.validated.params.applicationId, appId: getApplicationId(req), userId: req.user.id, ...req.validated.body }))

export { create, get, replace }
